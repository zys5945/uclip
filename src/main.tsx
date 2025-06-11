import { selectDirectory } from "./lib/utils";
import { Menu } from "@tauri-apps/api/menu";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

Menu.new({
  items: [
    {
      id: "open-folder",
      text: "Open Folder",
      action: () => selectDirectory(),
    },
  ],
}).then((menu) => {
  menu.setAsAppMenu();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
