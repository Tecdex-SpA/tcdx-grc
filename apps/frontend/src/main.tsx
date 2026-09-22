import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { ApiClient } from "./api-client.js";
import { BrowserSessionTokenProvider, selectedTenant } from "./browser-auth.js";
import { frontendConfig } from "./config.js";
import { CoreGrcApp } from "./core-grc.js";

const config = frontendConfig(import.meta.env);
const api = new ApiClient(config.apiOrigin, new BrowserSessionTokenProvider(), selectedTenant);

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");
createRoot(root).render(<React.StrictMode><CoreGrcApp api={api}/></React.StrictMode>);
