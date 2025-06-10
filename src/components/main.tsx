import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  getPanelGroupElement,
  getResizeHandleElement,
} from "react-resizable-panels";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageEditor } from "./image-editor";
import { Explorer } from "./explorer";
import { InfoPanel, InfoPanelProps } from "./info-panel";

import { useEffect, useState } from "react";

import shinoa from "@/assets/shinoa.jpg";

const previewMinWidthPx = 300;
const previewStartSize = 20;

const propertiesMinWidthPx = 300;
const propertiesStartSize = 15;

export function Main() {
  const [previewMinSize, setPreviewMinSize] = useState(previewStartSize);
  const [propertiesMinSize, setPropertiesMinSize] =
    useState(propertiesStartSize);
  const [infoPanelInput, setInfoPanelInput] = useState<
    InfoPanelProps | undefined
  >(void 0);

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
  });

  const canvasInfoChangeCallback = (
    mousePos: { x: number; y: number },
    color: Uint8ClampedArray
  ) => {
    setInfoPanelInput({ mousePos, color });
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
        <ScrollArea>
          <div className="space-y-2 pr-3">{/* TODO: explorer */}</div>
        </ScrollArea>
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
        <InfoPanel
          mousePos={infoPanelInput?.mousePos}
          color={infoPanelInput?.color}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
