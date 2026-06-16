import React from "react";
import { createRoot } from "react-dom/client";
import { Reshaped } from "reshaped";
import "reshaped/bundle.css";
import "reshaped/themes/slate/theme.css";
import "./styles/global.css";
import App from "./App";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Reshaped defaultTheme="slate" defaultColorMode="light">
      <App />
    </Reshaped>
  </React.StrictMode>,
);
