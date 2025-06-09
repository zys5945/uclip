import { Toggle } from "@/components/ui/toggle";
import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";

import { CropIcon, MoveIcon, PencilIcon, ZoomInIcon } from "lucide-react";

import { CropTool } from "./crop";
import { EditContext, EditData } from "./edit-context";
import { PanTool } from "./pan";
import { ZoomTool } from "./zoom";

export interface ImageEditorProps {
  image?: string;
}

export function ImageEditor({ image }: ImageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [toolsEnabled, setToolsEnabled] = useState([true, false, false, false]);

  let editContext = useMemo(() => new EditContext(), []);
  let editData = useMemo(() => new EditData(), [image]);

  const imageElement = useMemo(() => new Image(), []);
  imageElement.onload = () => {
    if (!canvasRef.current) return;

    if (!editContext.initialized) {
      editContext.init(canvasRef.current);
    }
    const imageData = editContext.setImage(imageElement);
    editContext.deactivateTool();
    editContext.setTool(new PanTool());

    // TODO
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

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const updateCanvasSize = () => {
      if (!containerRef.current || !canvasRef.current) return;

      const containerBounds = containerRef.current.getBoundingClientRect();
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
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [canvasRef, containerRef]);

  const switchTool = (toolIndex: number) => {
    if (!editContext.initialized) return;
    if (isNaN(toolIndex)) return;
    if (toolIndex < 0 || toolIndex >= toolsEnabled.length) return;

    const enabled = new Array(toolsEnabled.length).fill(false);
    const activateTool = !toolsEnabled[toolIndex];

    if (activateTool) {
      editContext.deactivateTool();

      let tool;
      switch (toolIndex) {
        case 0:
          tool = new PanTool();
          break;
        case 1:
          tool = new ZoomTool();
          break;
        case 2:
          tool = new CropTool();
          break;
      }

      editContext.setTool(tool!);
      enabled[toolIndex] = true;
    } else {
      // deactivating pan tool is a no-op. it's only deactivated when switching to another tool
      if (toolIndex === 0) return;

      editContext.deactivateTool();
      editContext.setTool(new PanTool());
      enabled[0] = true;
    }

    setToolsEnabled(enabled);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!e.ctrlKey) return;
    switchTool(parseInt(e.key) - 1);
  };

  return image ? (
    <div
      className="w-full h-full flex flex-col space-y-0"
      tabIndex={1}
      onKeyDown={handleKeyDown}
    >
      <div className="flex justify-center p-2 z-10">
        <div className="flex space-x-2 p-2 bg-stone-700 rounded-md">
          <Toggle
            pressed={toolsEnabled[0]}
            onPressedChange={() => switchTool(0)}
          >
            <MoveIcon />
          </Toggle>
          <Toggle
            pressed={toolsEnabled[1]}
            onPressedChange={() => switchTool(1)}
          >
            <ZoomInIcon />
          </Toggle>
          <Toggle
            pressed={toolsEnabled[2]}
            onPressedChange={() => switchTool(2)}
          >
            <CropIcon />
          </Toggle>
          <Toggle
            pressed={toolsEnabled[3]}
            onPressedChange={() => switchTool(3)}
          >
            <PencilIcon />
          </Toggle>
        </div>
      </div>
      <div className="flex-1 w-full" ref={containerRef}>
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
        />
      </div>
    </div>
  ) : (
    <h2 className="text-xl font-semibold">No image selected</h2>
  );
}
