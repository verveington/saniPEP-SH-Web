import React from "react";
import { createRoot } from "react-dom/client";
import { Reshaped } from "reshaped";
import "reshaped/bundle.css";
import "reshaped/themes/slate/theme.css";
import "./styles/global.css";
import App from "./App";
import { installDesignTokens } from "../../shared/design/saniPepDesignTokens";

if (import.meta.env.VITE_ENABLE_MOCK_AUTH === "true") {
  throw new Error("VITE_ENABLE_MOCK_AUTH is forbidden in the public website build.");
}

installDesignTokens();

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Reshaped defaultTheme="slate" defaultColorMode="light">
      <App />
    </Reshaped>
  </React.StrictMode>,
);
