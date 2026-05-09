import { getDiary, tokeniseWithGaps } from '../sim/diary';

// Inline-gloss renderer for dialogue text. Replaces `into.textContent = text`
// with a structured DOM render where any token the player has glossed in the
// diary gets that gloss painted as a small italic tag floating above the
// Telopa surface — ruby-annotation style.
//
// Layout: each glossed word is wrapped in `.gloss-word` (relative-positioned
// inline-block) with a `.gloss-tag` absolute-positioned 1em above. The host
// element should reserve ~1em of padding-top so the tags don't clip into the
// line above.

let cssInjected = false;

const injectCss = () => {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .gloss-word { position: relative; display: inline-block; }
    .gloss-tag {
      position: absolute; left: 50%; top: -0.95em;
      transform: translateX(-50%);
      font-size: 0.6em; line-height: 1;
      white-space: nowrap;
      color: #f2c97a; opacity: 0.9;
      font-style: italic; font-weight: 500;
      pointer-events: none;
      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6);
    }
  `;
  document.head.appendChild(style);
};

const collectGuesses = (): Map<string, string> => {
  const guesses = new Map<string, string>();
  for (const entry of getDiary()) {
    const guess = entry.playerGuess.trim();
    if (guess) guesses.set(entry.token, guess);
  }
  return guesses;
};

export const renderGlossed = (text: string, into: HTMLElement): void => {
  injectCss();
  into.replaceChildren();
  const segments = tokeniseWithGaps(text);
  const guesses = collectGuesses();
  for (const seg of segments) {
    if (seg.kind === 'gap') {
      into.appendChild(document.createTextNode(seg.text));
      continue;
    }
    const guess = guesses.get(seg.key);
    if (!guess) {
      into.appendChild(document.createTextNode(seg.text));
      continue;
    }
    const word = document.createElement('span');
    word.className = 'gloss-word';
    const tag = document.createElement('span');
    tag.className = 'gloss-tag';
    tag.textContent = guess;
    word.appendChild(tag);
    word.appendChild(document.createTextNode(seg.text));
    into.appendChild(word);
  }
};
