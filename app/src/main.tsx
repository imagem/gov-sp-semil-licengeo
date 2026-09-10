import "@arcgis/core/assets/esri/themes/light/main.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@xyflow/react/dist/style.css";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/workspace.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Elemento raiz da aplicação não encontrado.");
}

createRoot(root).render(<App />);
