import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  KeyboardEvent,
  default as React,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CropIcon,
  MoveIcon,
  PencilIcon,
  SearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";

import { CropTool } from "./crop";
import { EditContext, EditData } from "./edit-context";
import { PanTool } from "./pan";
import { ZoomTool } from "./zoom";

export interface ImageEditorProps {
  image?: string;
}

export function ImageEditor({ image }: ImageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [mainToolIndex, setMainToolIndex] = useState<number | null>(null);
  const [subToolIndex, setSubToolIndex] = useState<number | null>(null);

  let editContext = useMemo(() => new EditContext(), []);
  let editData = useMemo(() => new EditData(), [image]);

  const imageElement = useMemo(() => new Image(), []);
  imageElement.onload = () => {
    if (!canvasRef.current) return;

    if (!editContext.initialized) {
      editContext.init(canvasRef.current);
    }
    switchTool("0");

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

  /**
   * object mapping main tool index to [subToolbar, subToolbarIndex to message]
   */
  const subToolbar: {
    [key: number]: [React.ReactNode, { [key: string]: string }];
  } = {
    1: [
      <React.Fragment>
        <ToggleGroupItem value="0">
          <ZoomInIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="1">
          <ZoomOutIcon />
        </ToggleGroupItem>
      </React.Fragment>,
      { 0: "in", 1: "out" },
    ],
  };

  /**
   * messages the tool using message defined in subToolbar
   * if no definition is found in subToolbar then no message is sent
   * if subToolbar is defined for the tool, but subToolIndex is null then empty message is sent
   */
  function messageTool({
    argMainToolIndex,
    argSubToolIndex,
  }: {
    argMainToolIndex?: number;
    argSubToolIndex?: number | null;
  }) {
    const toMainToolIndex = argMainToolIndex ?? mainToolIndex ?? 0;
    const toSubToolIndex = argSubToolIndex ?? subToolIndex;

    if (toSubToolIndex) {
      const subToolbarConfig = subToolbar[toMainToolIndex];
      if (!subToolbarConfig) return;
      editContext.messageTool(subToolbarConfig[1][toSubToolIndex]);
    } else {
      editContext.messageTool();
    }
  }

  const switchTool = (toolIndexStr: string) => {
    if (!editContext.initialized) return;
    const selectedToolIndex = parseInt(toolIndexStr);
    if (isNaN(selectedToolIndex)) return;

    if (selectedToolIndex < 0 || selectedToolIndex >= 4) return;

    // deactivate the current active tool. however pan tool cannot be manually deactivated
    if (selectedToolIndex === mainToolIndex && selectedToolIndex === 0) return;
    if (selectedToolIndex !== 0) {
      editContext.deactivateTool();
    }

    const toActivate =
      selectedToolIndex === mainToolIndex ? 0 : selectedToolIndex;

    let tool;
    let subToolIndex = null;
    switch (toActivate) {
      case 0:
        tool = new PanTool();
        break;
      case 1:
        tool = new ZoomTool();
        subToolIndex = 0;
        break;
      case 2:
        tool = new CropTool();
        break;
    }
    if (!tool) return; // TODO

    editContext.setTool(tool);
    setMainToolIndex(selectedToolIndex);

    messageTool({
      argMainToolIndex: selectedToolIndex,
      argSubToolIndex: subToolIndex,
    });
    setSubToolIndex(subToolIndex);

    /**
     * prevents losing focus due to sub toolbar getting removed
     * losing focus will lead to keyboard shortcuts not working
     */
    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      editContext.deactivateTool();
      return;
    }

    // ctrl + num to switch tool
    if (!e.ctrlKey) return;
    switchTool((parseInt(e.key) - 1).toString());
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
            value={mainToolIndex?.toString()}
            onValueChange={switchTool}
          >
            <ToggleGroupItem value="0">
              <MoveIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="1">
              <SearchIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="2">
              <CropIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="3">
              <PencilIcon />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* sub toolbar */}
        {subToolbar[mainToolIndex ?? 0] && (
          <div className="flex space-x-2 p-1 bg-stone-700 rounded-md">
            <ToggleGroup
              type="single"
              className="gap-1"
              value={subToolIndex?.toString()}
              onValueChange={(value) => {
                messageTool({ argSubToolIndex: parseInt(value) });
                setSubToolIndex(parseInt(value));
              }}
            >
              {subToolbar[mainToolIndex ?? 0][0]}
            </ToggleGroup>
          </div>
        )}
      </div>

      <div className="flex-1 w-full" ref={canvasContainerRef}>
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
