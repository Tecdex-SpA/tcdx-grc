import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function FoundationShell() {
  return (
    <main className="foundation-shell">
      <h1>TCDX GRC</h1>
      <p>Foundation runtime</p>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");
createRoot(root).render(<React.StrictMode><FoundationShell /></React.StrictMode>);
