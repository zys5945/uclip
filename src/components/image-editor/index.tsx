import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { CropIcon, MoveIcon, PencilIcon, SearchIcon } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CropTool, CropToolSubToolbar } from "./crop";
import { EditContext, EditData, EditTool } from "./edit-context";
import { PanTool } from "./pan";
import { ZoomTool, ZoomToolSubToolbar } from "./zoom";

export interface ImageEditorProps {
  image?: string;
}

export function ImageEditor({ image }: ImageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentToolName, setCurrentToolName] = useState<string | undefined>(
    void 0
  );

  let editContext = useMemo(() => new EditContext(), []);
  let editData = useMemo(() => new EditData(), [image]);

  const imageElement = useMemo(() => new Image(), []);
  imageElement.onload = () => {
    if (!canvasRef.current) return;

    if (!editContext.initialized) {
      editContext.init(canvasRef.current);
    }
    switchTool("pan");

    // TODO
    const imageData = editContext.setImage(imageElement);
    editData.init(imageData, imageElement.width, imageElement.height);
    editContext.data = editData;

    editContext.draw();
  };

  // reload image on change
  useEffect(() => {
    if (image) {
      imageElement.src = image;
    }
  }, [image]);

  // update canvas size on resize
  useEffect(() => {
    if (!canvasContainerRef.current || !canvasRef.current) return;

    const updateCanvasSize = () => {
      if (!canvasContainerRef.current || !canvasRef.current) return;

      const containerBounds =
        canvasContainerRef.current.getBoundingClientRect();
      canvasRef.current.width = containerBounds.width;
      canvasRef.current.height = containerBounds.height;

      if (editContext.initialized) {
        editContext.cancelAnimationFrame();
        editContext.draw();
      }
    };

    // initial update
    updateCanvasSize();

    const observer = new ResizeObserver(updateCanvasSize);
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, [canvasRef, canvasContainerRef]);

  const switchTool = (toolName: "pan" | "zoom" | "crop") => {
    if (!editContext.initialized) return;

    // deactivate the current active tool. however pan tool cannot be manually deactivated
    if (toolName === currentToolName && toolName === "pan") return;
    editContext.deactivateTool();

    const nextToolName = toolName === currentToolName ? "pan" : toolName;

    let tool!: EditTool;
    switch (nextToolName) {
      case "pan":
        tool = new PanTool();
        break;
      case "zoom":
        tool = new ZoomTool();
        break;
      case "crop":
        tool = new CropTool();
        break;
    }

    editContext.setTool(tool);
    setCurrentToolName(nextToolName);

    /**
     * prevents losing focus due to sub toolbar getting removed
     * losing focus will lead to keyboard shortcuts not working
     */
    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // deactivate current tool on escape
    if (e.key === "Escape") {
      switchTool("pan");
      return;
    }

    // ctrl + num to switch tool
    if (!e.ctrlKey) return;
    switch (parseInt(e.key)) {
      case 1:
        switchTool("pan");
        return;
      case 2:
        switchTool("zoom");
        return;
      case 3:
        switchTool("crop");
        return;
    }
  };

  const renderSubToolbar = () => {
    let subToolbar;

    switch (currentToolName ?? 0) {
      case "zoom":
        subToolbar = <ZoomToolSubToolbar ctx={editContext} />;
        break;
      case "crop":
        subToolbar = (
          <CropToolSubToolbar
            ctx={editContext}
            onExit={() => switchTool("pan")}
          />
        );
        break;
    }

    if (subToolbar) {
      return (
        <div className="flex space-x-2 p-1 bg-stone-700 rounded-md">
          {subToolbar}
        </div>
      );
    }
  };

  return image ? (
    <div
      className="w-full h-full flex flex-col space-y-0"
      tabIndex={1}
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <div className="flex p-2 space-x-2">
        {/* main toolbar */}
        <div className="flex space-x-2 p-1 bg-stone-700 rounded-md">
          <ToggleGroup
            type="single"
            className="gap-1"
            value={currentToolName}
            onValueChange={switchTool}
          >
            <ToggleGroupItem value="pan">
              <MoveIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="zoom">
              <SearchIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="crop">
              <CropIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="pen">
              <PencilIcon />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* sub toolbar */}
        {renderSubToolbar()}
      </div>

      <div className="flex-1 w-full" ref={canvasContainerRef}>
        <canvas ref={canvasRef} width={800} height={600} />
      </div>
    </div>
  ) : (
    <h2 className="text-xl font-semibold">No image selected</h2>
  );
}
