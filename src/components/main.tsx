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
import { handleShortcuts } from "./shortcuts";
import { ActionHistoryDisplay } from "./action-history-display";
import { DragDropReceiver } from "./drag-drop-receiver";

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

  // keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const toolbarHandle = imageEditorRef.current?.getToolbarHandle();
      if (!toolbarHandle) return;
      handleShortcuts(e, toolbarHandle);
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
      className="w-full"
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
        <div className="w-full h-full flex flex-col p-4 gap-2">
          <InfoPanel />
          <ActionHistoryDisplay />
        </div>
      </ResizablePanel>

      <DragDropReceiver />
    </ResizablePanelGroup>
  );
}
