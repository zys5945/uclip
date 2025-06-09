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
  XIcon,
  CheckIcon,
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
   * object mapping main tool index to [subToolbar,
   * message per subtool index or function to call on switching sub tool]
   */
  const subToolConfig: {
    [key: number]: {
      toolbar: React.ReactNode;
      onSubTool:
        | { [key: string]: string }
        | ((toSubToolIndex: number | null) => void);
    };
  } = {
    1: {
      toolbar: (
        <React.Fragment>
          <ToggleGroupItem value="0">
            <ZoomInIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="1">
            <ZoomOutIcon />
          </ToggleGroupItem>
        </React.Fragment>
      ),
      onSubTool: { 0: "in", 1: "out" },
    },
    2: {
      toolbar: (
        <React.Fragment>
          <ToggleGroupItem value="0">
            <CheckIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="1">
            <XIcon />
          </ToggleGroupItem>
        </React.Fragment>
      ),
      onSubTool: (toSubToolIndex: number | null) => {
        if (toSubToolIndex === null) return;

        if (toSubToolIndex === 0) {
          editContext.messageTool("accept");
        }
        switchTool("0");
      },
    },
  };

  /**
   * message then set state for ui
   *
   * does not "deactivate" the sub tool if it's already activated
   * will just send message again
   */
  function switchSubTool({
    argMainToolIndex,
    argSubToolIndex: toSubToolIndex,
  }: {
    argMainToolIndex?: number;
    argSubToolIndex: number | null;
  }) {
    const toMainToolIndex = argMainToolIndex ?? mainToolIndex ?? 0;

    const messageConfig = subToolConfig[toMainToolIndex]?.onSubTool;
    if (messageConfig) {
      if (typeof messageConfig === "function") {
        messageConfig(toSubToolIndex);
      } else {
        const message = toSubToolIndex ? messageConfig[toSubToolIndex] : void 0;
        editContext.messageTool(message);
      }
    }

    setSubToolIndex(toSubToolIndex);
  }

  const switchTool = (toolIndexStr: string) => {
    if (!editContext.initialized) return;
    const selectedToolIndex = parseInt(toolIndexStr);
    if (isNaN(selectedToolIndex)) return;

    if (selectedToolIndex < 0 || selectedToolIndex >= 4) return;

    // deactivate the current active tool. however pan tool cannot be manually deactivated
    if (selectedToolIndex === mainToolIndex && selectedToolIndex === 0) return;
    editContext.deactivateTool();

    const toMainToolIndex =
      selectedToolIndex === mainToolIndex ? 0 : selectedToolIndex;

    let tool;
    let toSubToolIndex = null;
    switch (toMainToolIndex) {
      case 0:
        tool = new PanTool();
        break;
      case 1:
        tool = new ZoomTool();
        toSubToolIndex = 0;
        break;
      case 2:
        tool = new CropTool();
        break;
    }
    if (!tool) {
      throw new Error(`Tool ${toMainToolIndex} not found`);
    }

    editContext.setTool(tool);
    setMainToolIndex(selectedToolIndex);

    switchSubTool({
      argMainToolIndex: toMainToolIndex,
      argSubToolIndex: toSubToolIndex,
    });

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
      switchTool("0");
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
        {subToolConfig[mainToolIndex ?? 0] && (
          <div className="flex space-x-2 p-1 bg-stone-700 rounded-md">
            <ToggleGroup
              type="single"
              className="gap-1"
              value={subToolIndex?.toString()}
              onValueChange={(value) =>
                switchSubTool({ argSubToolIndex: parseInt(value) })
              }
            >
              {subToolConfig[mainToolIndex ?? 0].toolbar}
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
