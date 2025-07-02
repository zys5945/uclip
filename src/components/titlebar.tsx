import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, PictureInPicture2, Square, X } from "lucide-react";
import { useEffect, useState } from "react";

import "./titlebar.css";

export function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const window = getCurrentWindow();
      const maximized = await window.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    // Listen for window state changes
    const unlisten = getCurrentWindow().listen("tauri://resize", () => {
      checkMaximized();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    if (isMaximized) {
      await window.unmaximize();
    } else {
      await window.maximize();
    }
  };

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.close();
  };

  const handleStartDragging = async () => {
    const window = getCurrentWindow();
    await window.startDragging();
  };

  return (
    <div className="titlebar" data-tauri-drag-region>
      {/* left side */}
      <div
        className="flex items-center gap-2 px-3 flex-1"
        onMouseDown={handleStartDragging}
      >
        <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center text-xs font-bold text-stone-800">
          U
        </div>
      </div>

      {/* right side - Window controls */}
      <div className="flex">
        <button
          className="titlebar-button"
          onClick={handleMinimize}
          title="Minimize"
        >
          <Minus className="size-6 text-white" />
        </button>
        <button
          className="titlebar-button"
          onClick={handleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <PictureInPicture2 className="size-4 text-white" />
          ) : (
            <Square className="size-4 text-white" />
          )}
        </button>
        <button className="titlebar-button" onClick={handleClose} title="Close">
          <X className="size-5 text-white" />
        </button>
      </div>
    </div>
  );
}
