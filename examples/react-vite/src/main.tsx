import { StrictMode } from "react";
import "./index.css";
import { createRoot } from "react-dom/client";
import Providers from "./providers";

// biome-ignore lint/style/noNonNullAssertion: <explanation>
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers />
  </StrictMode>
);
