import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { ApiClient } from "./api-client.js";
import { BrowserSession } from "./browser-auth.js";
import { frontendConfig } from "./config.js";
import { CoreGrcApp } from "./core-grc.js";

const config = frontendConfig(import.meta.env);
const session = new BrowserSession();
const api = new ApiClient(config.apiOrigin, session, () => session.selectedTenant());

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");
createRoot(root).render(<React.StrictMode><CoreGrcApp api={api} session={session} apiOrigin={config.apiOrigin}/></React.StrictMode>);
