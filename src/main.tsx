import { Menu } from "@tauri-apps/api/menu";
import React from "react";
import ReactDOM from "react-dom/client";

import { selectDirectory } from "./lib/utils";
import App from "./App";
import { editDataStore } from "./components/edit-data";

Menu.new({
  items: [
    {
      id: "open-folder",
      text: "Open Folder",
      action: () => selectDirectory(),
    },
    {
      id: "clear",
      text: "Clear",
      action: () => editDataStore.trigger.clear(),
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
