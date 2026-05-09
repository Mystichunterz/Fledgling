// Node-side accuracy harness for the frame→frame Groq pipeline.
//
// Run with: GROQ_API_KEY=... npm run demo:respond
// Or:       npx tsx src/lang/respond-eval.ts [fixtureNamePrefix]
//
// Scores each fixture along five binary/per-role dimensions:
//   1. validation         — output is a well-formed FilledFrame
//   2. predicateMatch     — predicate equals expected predicate
//   3. moodAppropriate    — mood is in expected.moodAnyOf (or unconstrained)
//   4. rolesMatch         — every constrained role's filler matches
//   5. contextCoherent    — the response is internally consistent with the
//                            NpcContext (e.g. claims-to-have iff inventory)
//
// Final summary prints aggregate pass% per dimension and a per-case grid.

import {
  FilledFrame,
  RoleFiller,
  isEntityRef,
  isPronoun,
  isUnknown,
  validateFilledFrame,
} from "./frames.js";
import { RespondOptions, respondToFrame } from "./respond.js";
import { NpcContext, conceptIdsFromLanguage } from "./respond-prompt.js";
import { EXAMPLE_LANGUAGE } from "./example-language.js";
import { encodeFrame } from "./encoder.js";
import { RESPOND_FIXTURES, RespondFixture } from "./respond-fixtures.js";

interface CaseResult {
  name: string;
  validation: boolean;
  predicateMatch: boolean | null;     // null when not checked
  moodAppropriate: boolean | null;
  negatedMatch: boolean | null;
  unknownPresenceMatch: boolean | null;
  rolesMatch: boolean | null;
  rolePerScore: { matched: number; total: number } | null;
  contextCoherent: boolean;
  surface: string | null;
  surfaceError: string | null;
  error: string | null;
  raw: FilledFrame | null;
  notes: string[];
}

function dim(s: string) { return `\x1b[2m${s}\x1b[0m`; }
function bold(s: string) { return `\x1b[1m${s}\x1b[0m`; }
function green(s: string) { return `\x1b[32m${s}\x1b[0m`; }
function red(s: string)   { return `\x1b[31m${s}\x1b[0m`; }
function yellow(s: string){ return `\x1b[33m${s}\x1b[0m`; }

function tick(b: boolean | null): string {
  if (b === null) return dim("·");
  return b ? green("✓") : red("✗");
}

// An expected role value may be either a pronoun literal
// ("self"|"listener"|"reference"|"unknown") OR an EntityRef conceptId.
// `matchFiller` resolves the actual filler to a single string for set
// membership: pronouns become themselves; EntityRefs become their
// conceptId; anything else returns null (unmatched).
function fillerKey(filler: RoleFiller): string | null {
  if (isPronoun(filler)) return filler;
  if (isEntityRef(filler)) return filler.conceptId;
  return null;
}

function checkRolesMatch(
  out: FilledFrame,
  expectRoles: Record<string, string | string[]> | undefined,
): { matched: number; total: number } | null {
  if (!expectRoles) return null;
  let matched = 0;
  let total = 0;
  for (const [role, expect] of Object.entries(expectRoles)) {
    total++;
    const filler = out.roles[role];
    if (filler === undefined) continue;
    const want = new Set(Array.isArray(expect) ? expect : [expect]);
    const key = fillerKey(filler);
    if (key !== null && want.has(key)) matched++;
  }
  return { matched, total };
}

// Light-touch context coherence: only flag outputs that contradict the
// NPC's known state. Misses (under-checking) are preferred over false
// positives; we want this to surface real bugs, not punish creativity.
//
// Under the new model the NPC's self-reference is the pronoun "self"
// (not the EntityRef PLAYER conceptId), so coherence checks key off
// `filler === "self"` rather than conceptId equality.
function checkContextCoherence(
  out: FilledFrame,
  ctx: NpcContext,
  notes: string[],
): boolean {
  if (out.predicate === "HAVE" && out.mood === "declarative") {
    const owner = out.roles["owner"];
    const theme = out.roles["theme"];
    if (owner === "self" && theme !== undefined && isEntityRef(theme)) {
      const inInv = ctx.inventory.includes(theme.conceptId);
      if (out.negated && inInv) {
        notes.push(`coherence: NPC denies having ${theme.conceptId} but inventory includes it`);
        return false;
      }
      if (!out.negated && !inInv) {
        notes.push(`coherence: NPC claims to have ${theme.conceptId} but inventory lacks it`);
        return false;
      }
    }
  }
  if (out.predicate === "WANT" && out.mood === "declarative" && !out.negated) {
    const wanter = out.roles["wanter"];
    const desired = out.roles["desired"];
    if (
      wanter === "self" &&
      desired !== undefined &&
      isEntityRef(desired) &&
      !ctx.desires.includes(desired.conceptId)
    ) {
      notes.push(`coherence: NPC claims to want ${desired.conceptId} but desires lacks it`);
      return false;
    }
  }
  if (out.predicate === "BE_AT" && out.mood === "declarative" && !out.negated) {
    const figure = out.roles["figure"];
    const ground = out.roles["ground"];
    if (
      figure !== undefined &&
      ground !== undefined &&
      isEntityRef(figure) &&
      isEntityRef(ground)
    ) {
      const knownGround = ctx.knows.find((k) => k.figure === figure.conceptId);
      if (knownGround && knownGround.ground !== ground.conceptId) {
        notes.push(
          `coherence: NPC says ${figure.conceptId}@${ground.conceptId} but knows ${figure.conceptId}@${knownGround.ground}`,
        );
        return false;
      }
    }
  }
  return true;
}

async function runOne(
  fixture: RespondFixture,
  opts: RespondOptions,
): Promise<CaseResult> {
  const result: CaseResult = {
    name: fixture.name,
    validation: false,
    predicateMatch: null,
    moodAppropriate: null,
    negatedMatch: null,
    unknownPresenceMatch: null,
    rolesMatch: null,
    rolePerScore: null,
    contextCoherent: true,
    surface: null,
    surfaceError: null,
    error: null,
    raw: null,
    notes: [],
  };

  let out: FilledFrame;
  try {
    out = await respondToFrame(fixture.incoming, fixture.context, opts);
    result.raw = out;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    return result;
  }

  try {
    validateFilledFrame(out);
    result.validation = true;
  } catch (err) {
    result.notes.push(`validation: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  const exp = fixture.expect;
  if (exp.predicate !== undefined) {
    result.predicateMatch = out.predicate === exp.predicate;
  }
  if (exp.moodAnyOf !== undefined) {
    result.moodAppropriate = exp.moodAnyOf.includes(out.mood);
  }
  if (exp.negated !== undefined) {
    result.negatedMatch = (out.negated ?? false) === exp.negated;
  }
  if (exp.expectsUnknown !== undefined) {
    const hasUnknown = Object.values(out.roles).some(isUnknown);
    result.unknownPresenceMatch = hasUnknown === exp.expectsUnknown;
  }
  const perRole = checkRolesMatch(out, exp.roles);
  result.rolePerScore = perRole;
  if (perRole) {
    result.rolesMatch = perRole.matched === perRole.total;
  }

  result.contextCoherent = checkContextCoherence(out, fixture.context, result.notes);

  try {
    result.surface = encodeFrame(EXAMPLE_LANGUAGE, out);
  } catch (err) {
    result.surfaceError = err instanceof Error ? err.message : String(err);
  }

  return result;
}

function fmtFrame(f: FilledFrame): string {
  const roles = Object.entries(f.roles)
    .map(([k, v]) => {
      if (isPronoun(v)) return `${k}=${v}`;
      if (isEntityRef(v)) return `${k}=${v.conceptId}`;
      return `${k}=[nested]`;
    })
    .join(", ");
  const flags: string[] = [f.mood];
  if (f.tense) flags.push(f.tense);
  if (f.negated) flags.push("negated");
  return `${f.predicate}(${roles}) ${dim(flags.join("·"))}`;
}

async function main() {
  const filter = process.argv[2];
  const fixtures = filter
    ? RESPOND_FIXTURES.filter((f) => f.name.startsWith(filter))
    : RESPOND_FIXTURES;
  if (fixtures.length === 0) {
    console.error(`No fixtures match prefix: ${filter}`);
    process.exit(1);
  }

  const conceptIds = conceptIdsFromLanguage(EXAMPLE_LANGUAGE);
  const opts: RespondOptions = { conceptIds };

  console.log(bold(`Fledgling · respond-eval · ${fixtures.length} cases`));
  console.log(dim(`model: llama-3.3-70b-versatile · language: ${EXAMPLE_LANGUAGE.id}`));
  console.log("");

  const results: CaseResult[] = [];
  for (const f of fixtures) {
    process.stdout.write(dim(`  running: ${f.name}…`));
    const r = await runOne(f, opts);
    process.stdout.write("\r\x1b[K");
    results.push(r);
    printCase(r, f);
  }

  printSummary(results);
}

function printCase(r: CaseResult, f: RespondFixture) {
  const grid =
    `${tick(r.validation)} val ` +
    `${tick(r.predicateMatch)} pred ` +
    `${tick(r.moodAppropriate)} mood ` +
    `${tick(r.negatedMatch)} neg ` +
    `${tick(r.unknownPresenceMatch)} ?? ` +
    `${tick(r.rolesMatch)} roles ` +
    `${tick(r.contextCoherent)} ctx`;
  console.log(`${bold("·")} ${r.name}`);
  console.log(`  ${grid}`);
  if (r.error) {
    console.log(`  ${red("error:")} ${r.error}`);
  } else if (r.raw) {
    console.log(`  ${dim("incoming:")} ${fmtFrame(f.incoming)}`);
    console.log(`  ${dim("response:")} ${fmtFrame(r.raw)}`);
    if (r.surface) console.log(`  ${dim("surface :")} ${yellow(r.surface)}`);
    if (r.surfaceError) console.log(`  ${dim("surface :")} ${red(r.surfaceError)}`);
    if (r.rolePerScore && r.rolePerScore.total > 0) {
      console.log(`  ${dim(`roles   : ${r.rolePerScore.matched}/${r.rolePerScore.total}`)}`);
    }
  }
  for (const n of r.notes) console.log(`  ${dim("·")} ${n}`);
  console.log("");
}

function printSummary(results: CaseResult[]) {
  const n = results.length;
  const sum = (sel: (r: CaseResult) => boolean | null) => {
    let pass = 0;
    let total = 0;
    for (const r of results) {
      const v = sel(r);
      if (v === null) continue;
      total++;
      if (v) pass++;
    }
    return { pass, total };
  };

  const dims = [
    { label: "validation       ", v: sum((r) => r.validation) },
    { label: "predicate        ", v: sum((r) => r.predicateMatch) },
    { label: "mood             ", v: sum((r) => r.moodAppropriate) },
    { label: "negated          ", v: sum((r) => r.negatedMatch) },
    { label: "unknown-presence ", v: sum((r) => r.unknownPresenceMatch) },
    { label: "roles            ", v: sum((r) => r.rolesMatch) },
    { label: "context coherent ", v: sum((r) => r.contextCoherent) },
  ];

  console.log(bold("─── summary ───────────────────────────────"));
  for (const d of dims) {
    if (d.v.total === 0) {
      console.log(`  ${d.label}  ${dim("(not checked)")}`);
      continue;
    }
    const pct = Math.round((d.v.pass / d.v.total) * 100);
    const colour = pct === 100 ? green : pct >= 70 ? yellow : red;
    console.log(`  ${d.label}  ${colour(`${d.v.pass}/${d.v.total} (${pct}%)`)}`);
  }
  // Aggregate per-role match across all cases.
  let perRoleP = 0, perRoleT = 0;
  for (const r of results) {
    if (!r.rolePerScore) continue;
    perRoleP += r.rolePerScore.matched;
    perRoleT += r.rolePerScore.total;
  }
  if (perRoleT > 0) {
    const pct = Math.round((perRoleP / perRoleT) * 100);
    console.log(`  ${dim("per-role hit-rate")}  ${perRoleP}/${perRoleT} (${pct}%)`);
  }
  // Pure case-pass: did every checked dimension pass?
  const fullyPassed = results.filter((r) => {
    if (r.error) return false;
    if (!r.validation) return false;
    if (r.predicateMatch === false) return false;
    if (r.moodAppropriate === false) return false;
    if (r.negatedMatch === false) return false;
    if (r.unknownPresenceMatch === false) return false;
    if (r.rolesMatch === false) return false;
    if (!r.contextCoherent) return false;
    return true;
  }).length;
  console.log(`  ${bold(`fully-passing cases: ${fullyPassed}/${n}`)}`);
}

main().catch((err) => {
  console.error("respond-eval failed:", err);
  process.exit(1);
});
