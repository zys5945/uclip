import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useEffect, useRef, useState } from "react";
import {
  getPanelGroupElement,
  getResizeHandleElement,
} from "react-resizable-panels";

import { ImageEditor, ImageEditorHandle } from "./image-editor";
import { ImageExplorer } from "./image-explorer";
import { InfoPanel } from "./info-panel";
import { canvasInfoStore } from "./image-editor/canvas-info";

const previewMinWidthPx = 200;
const previewStartSize = 15;

const propertiesMinWidthPx = 300;
const propertiesStartSize = 15;

export function Main() {
  const [previewMinSize, setPreviewMinSize] = useState(previewStartSize);
  const [propertiesMinSize, setPropertiesMinSize] =
    useState(propertiesStartSize);

  const imageEditorRef = useRef<ImageEditorHandle | null>(null);

  // pseudo pixel-based min sizes
  useEffect(() => {
    const onResize = () => {
      const panelGroupWidth = getPanelGroupElement(
        "clip-manager-panel-group"
      )?.offsetWidth;
      const resizeHandleWidth = getResizeHandleElement(
        "clip-manager-resize-handle-0"
      )?.offsetWidth;

      if (!panelGroupWidth || !resizeHandleWidth) return;

      const availableWidth = panelGroupWidth - 2 * resizeHandleWidth;

      setPreviewMinSize((previewMinWidthPx / availableWidth) * 100);
      setPropertiesMinSize((propertiesMinWidthPx / availableWidth) * 100);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const copyInfoPanel = () => {
    const canvasInfo = canvasInfoStore.getSnapshot().context;
    navigator.clipboard.writeText(
      `((${canvasInfo.mousePos.x.toFixed(0)}, ${canvasInfo.mousePos.y.toFixed(
        0
      )}), (${canvasInfo.color[0]}, ${canvasInfo.color[1]}, ${
        canvasInfo.color[2]
      }))`
    );
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!imageEditorRef.current) return;
      const useTool = imageEditorRef.current.useTool;

      // deactivate current tool on escape
      if (e.key === "Escape") {
        useTool("pan");
        return;
      }
      if (!e.ctrlKey) return;
      switch (e.key) {
        // ctrl + num to switch tool
        case "1":
          useTool("pan");
          break;
        case "2":
          useTool("zoom");
          break;
        case "3":
          useTool("crop");
          break;
        case "4":
          useTool("pen");
          break;
        case "c":
          copyInfoPanel();
          break;
        case "z":
          if (e.shiftKey) {
            useTool("redo");
          } else {
            useTool("undo");
          }
          break;
        case "Z":
          useTool("redo");
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <ResizablePanelGroup
      id="clip-manager-panel-group"
      direction="horizontal"
      autoSaveId="clip-manager-panel-layout"
      className="w-full h-full"
    >
      {/* Left side - Image previews */}
      <ResizablePanel defaultSize={previewStartSize} minSize={previewMinSize}>
        <ImageExplorer />
      </ResizablePanel>

      <ResizableHandle
        id="clip-manager-resize-handle-0"
        className="bg-stone-600 data-[resize-handle-state=hover]:bg-stone-300"
        withHandle
      />

      {/* Middle - Main image display */}
      <ResizablePanel>
        <div className="w-full h-full">
          <ImageEditor ref={imageEditorRef} />
        </div>
      </ResizablePanel>

      <ResizableHandle
        className="bg-stone-600 data-[resize-handle-state=hover]:bg-stone-300"
        withHandle
      />

      {/* Right side - Metadata */}
      <ResizablePanel
        defaultSize={propertiesStartSize}
        minSize={propertiesMinSize}
      >
        <InfoPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
