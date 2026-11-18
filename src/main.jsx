import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Label table cells with their column header (used by the phone card layout).
const labelCells = () => {
  for (const td of document.querySelectorAll(".table td:not([data-l])")) {
    let i = 0, p = td;
    while ((p = p.previousElementSibling)) i += p.colSpan;
    const head = td.closest("table").tHead?.rows[0]?.cells[i];
    td.dataset.l = head ? head.textContent.trim() : "";
  }
};
new MutationObserver(labelCells).observe(document.documentElement, { childList: true, subtree: true });

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
