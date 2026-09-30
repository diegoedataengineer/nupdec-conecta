import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

// Claro é o padrão e o tema só muda quando a pessoa pede — `enableSystem` fica
// desligado de propósito (mesma decisão do portal NeuroAgora).
createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <App />
  </ThemeProvider>,
);
