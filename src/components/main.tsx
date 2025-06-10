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

import shinoa from "@/assets/shinoa.jpg";
import { InfoPanel, InfoPanelHandle } from "./info-panel";

const previewMinWidthPx = 200;
const previewStartSize = 15;

const propertiesMinWidthPx = 300;
const propertiesStartSize = 15;

export function Main() {
  const [previewMinSize, setPreviewMinSize] = useState(previewStartSize);
  const [propertiesMinSize, setPropertiesMinSize] =
    useState(propertiesStartSize);

  const imageEditorRef = useRef<ImageEditorHandle | null>(null);
  const infoPanelRef = useRef<InfoPanelHandle | null>(null);

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
        case "z":
          if (e.shiftKey) {
            useTool("redo");
          } else {
            useTool("undo");
          }
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const canvasInfoChangeCallback = (
    mousePos: { x: number; y: number },
    color: Uint8ClampedArray
  ) => {
    if (!infoPanelRef.current) return;
    infoPanelRef.current.setData({
      mousePos,
      color,
    });
  };

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
          <ImageEditor
            image={shinoa}
            ref={imageEditorRef}
            canvasInfoChangeCallback={canvasInfoChangeCallback}
          />
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
        <InfoPanel ref={infoPanelRef} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
