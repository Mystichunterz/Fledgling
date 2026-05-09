import React from "react";
import { createRoot } from "react-dom/client";
import { RespondPage } from "./RespondPage.js";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
createRoot(root).render(
  <React.StrictMode>
    <RespondPage />
  </React.StrictMode>,
);
