import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, PictureInPicture2, Square, X } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  clearAll,
  exportCurrentImage,
  saveCurrentEditData,
  selectDirectory,
  selectFile,
} from "@/lib/file";
import { editDataStore, getCurrentEditData } from "./edit-data";
import "./titlebar.css";

import icon from "@/assets/icon_128x128.png";

export function Titlebar() {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // monitor maximization state
  useEffect(() => {
    const checkMaximized = async () => {
      const window = getCurrentWindow();
      const maximized = await window.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    const unlisten = getCurrentWindow().listen("tauri://resize", () => {
      checkMaximized();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleMinimize = async () => {
    await getCurrentWindow().minimize();
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
    await getCurrentWindow().close();
  };

  const handleStartDragging = async () => {
    await getCurrentWindow().startDragging();
  };

  const buttons: {
    [menuName: string]: {
      label: string;
      shortcut?: string;
      onClick: () => void;
      enabled?: () => boolean;
    }[][];
  } = {
    File: [
      [
        { label: "Open File", onClick: selectFile },
        { label: "Open Folder", onClick: selectDirectory },
      ],
      [
        {
          label: "Save",
          shortcut: "Ctrl + S",
          onClick: saveCurrentEditData,
          enabled: () => getCurrentEditData() !== null,
        },
        {
          label: "Export",
          shortcut: "Ctrl + E",
          onClick: exportCurrentImage,
          enabled: () => getCurrentEditData() !== null,
        },
      ],
      [
        {
          label: "Remove Selected",
          shortcut: "Delete",
          onClick: () => editDataStore.trigger.removeCurrentEditData(),
          enabled: () => getCurrentEditData() !== null,
        },
        { label: "Clear All", onClick: clearAll },
      ],
    ],
  };

  return (
    <div className="titlebar" data-tauri-drag-region>
      {/* left side */}
      <div className="flex items-center gap-2 px-3">
        <img src={icon} className="w-6 h-6" />

        {/* menu items*/}
        {Object.entries(buttons).map(([name, items]) => (
          <Popover
            key={name}
            open={menuOpen === name}
            onOpenChange={(open) => setMenuOpen(open ? name : null)}
          >
            <PopoverTrigger asChild>
              <button className="px-2 py-1 text-white text-sm hover:bg-white/30 rounded transition-colors">
                {name}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <div className="space-y-1">
                {items.map((itemGroup, i) => (
                  <React.Fragment key={i}>
                    {itemGroup.map(({ label, shortcut, onClick, enabled }) => (
                      <Button
                        key={label}
                        variant="ghost"
                        disabled={enabled ? !enabled() : false}
                        className="w-full h-8 flex justify-between hover:bg-white/20 items-center"
                        onClick={() => {
                          setMenuOpen(null);
                          onClick();
                        }}
                      >
                        <span>{label}</span>
                        {shortcut && (
                          <span className="text-xs text-muted-foreground">
                            {shortcut}
                          </span>
                        )}
                      </Button>
                    ))}
                    {i < items.length - 1 && <Separator className="my-1" />}
                  </React.Fragment>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>

      {/* middle draggable area */}
      <div className="flex-1 h-full" onMouseDown={handleStartDragging} />

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
