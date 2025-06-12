import { CheckIcon, XIcon } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EditContext, EditTool } from "./edit-context";

type MouseDownPosType =
  | "inside"
  | "outside"
  | "handle-nw"
  | "handle-ne"
  | "handle-sw"
  | "handle-se"
  | "handle-n"
  | "handle-s"
  | "handle-e"
  | "handle-w";

interface ToolData {
  accepted?: boolean;
  originalCropBox?: { x: number; y: number; width: number; height: number };
  currentCropBox?: { x: number; y: number; width: number; height: number };

  mouseDownPosType?: MouseDownPosType;
  eventSubscribers?: { [key: string]: (e: any) => void };
}

export class CropTool implements EditTool {
  handleSize: number;

  constructor(handleSize = 10) {
    this.handleSize = handleSize;
  }

  activate(editContext: EditContext, toolData: ToolData) {
    toolData.accepted = false;
    toolData.originalCropBox = { ...editContext.data!.cropBox };
    toolData.currentCropBox = { ...editContext.data!.cropBox };
    editContext.data!.cropBox = {
      x: 0,
      y: 0,
      width: editContext.data!.originalImageData.width,
      height: editContext.data!.originalImageData.height,
    };

    toolData.mouseDownPosType = undefined;
    toolData.eventSubscribers = {};

    const onMouseDown = () => {
      toolData.mouseDownPosType = this.getMousePositionType(
        editContext,
        toolData
      );
    };
    const onMouseUp = () => {
      toolData.mouseDownPosType = undefined;
    };

    const onMouseLeave = () => {
      editContext.canvas.style.cursor = "default";
    };

    const onMouseMove = () => {
      editContext.canvas.style.cursor = this.getCursorType(
        editContext,
        toolData
      );

      if (
        !editContext.isDragging ||
        !editContext.mousePos ||
        !editContext.lastMousePos ||
        !toolData.currentCropBox ||
        !toolData.mouseDownPosType ||
        toolData.mouseDownPosType === "outside"
      )
        return;

      const deltaX = editContext.mousePos.x - editContext.lastMousePos.x;
      const deltaY = editContext.mousePos.y - editContext.lastMousePos.y;

      const newCropBox = { ...toolData.currentCropBox }!;

      switch (toolData.mouseDownPosType) {
        case "inside":
          newCropBox.x += deltaX;
          newCropBox.y += deltaY;
          break;
        case "handle-nw":
          newCropBox.x += deltaX;
          newCropBox.y += deltaY;
          newCropBox.width -= deltaX;
          newCropBox.height -= deltaY;
          break;
        case "handle-ne":
          newCropBox.y += deltaY;
          newCropBox.width += deltaX;
          newCropBox.height -= deltaY;
          break;
        case "handle-sw":
          newCropBox.x += deltaX;
          newCropBox.width -= deltaX;
          newCropBox.height += deltaY;
          break;
        case "handle-se":
          newCropBox.width += deltaX;
          newCropBox.height += deltaY;
          break;
        case "handle-n":
          newCropBox.y += deltaY;
          newCropBox.height -= deltaY;
          break;
        case "handle-s":
          newCropBox.height += deltaY;
          break;
        case "handle-w":
          newCropBox.x += deltaX;
          newCropBox.width -= deltaX;
          break;
        case "handle-e":
          newCropBox.width += deltaX;
          break;
      }

      this.constrainCropBox(
        newCropBox,
        editContext.data!.originalImageData.width,
        editContext.data!.originalImageData.height
      );

      toolData.currentCropBox = newCropBox;
    };

    toolData.eventSubscribers.mousedown = onMouseDown;
    toolData.eventSubscribers.mouseup = onMouseUp;
    toolData.eventSubscribers.mouseleave = onMouseLeave;
    toolData.eventSubscribers.mousemove = onMouseMove;

    editContext.subscribe("mousedown", onMouseDown);
    editContext.subscribe("mouseup", onMouseUp);
    editContext.subscribe("mouseleave", onMouseLeave);
    editContext.subscribe("mousemove", onMouseMove);
  }

  draw(editContext: EditContext, toolData: ToolData) {
    const canvas = editContext.invariantCanvas;
    const ctx = editContext.invariantCtx;
    const { x, y, width, height } = toolData.currentCropBox!;

    // draw semi-transparent overlay outside crop area
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, y); // top
    ctx.fillRect(0, y + height, canvas.width, canvas.height - y - height); // bottom
    ctx.fillRect(0, y, x, height); // left
    ctx.fillRect(x + width, y, ctx.canvas.width - x - width, height); // right

    // draw crop box border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.setLineDash([7, 7]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);

    // draw resize handles
    const handlePositions = this._computeHandlePosition(x, y, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    handlePositions.forEach((handle) => {
      ctx.fillRect(handle.x, handle.y, this.handleSize, this.handleSize);
      ctx.strokeRect(handle.x, handle.y, this.handleSize, this.handleSize);
    });
  }

  onMessage(ctx: EditContext, toolData: any, message?: string): void {
    if (!message) return;

    if (message === "accept") {
      ctx.data!.applyUndoableAction({
        type: "SetField",
        fieldName: "cropBox",
        before: toolData.originalCropBox,
        after: toolData.currentCropBox,
      });
      toolData.accepted = true;
    }
  }

  deactivate(editContext: EditContext, toolData: ToolData) {
    if (!toolData.accepted) {
      editContext.data!.cropBox = toolData.originalCropBox!;
    }

    editContext.unsubscribe("mousedown", toolData.eventSubscribers!.mousedown);
    editContext.unsubscribe("mouseup", toolData.eventSubscribers!.mouseup);
    editContext.unsubscribe(
      "mouseleave",
      toolData.eventSubscribers!.mouseleave
    );
    editContext.unsubscribe("mousemove", toolData.eventSubscribers!.mousemove!);

    editContext.canvas.style.cursor = "default";
  }

  _computeHandlePosition(x: number, y: number, width: number, height: number) {
    return [
      {
        x: x - this.handleSize / 2,
        y: y - this.handleSize / 2,
        direction: "nw",
      },
      {
        x: x + width / 2 - this.handleSize / 2,
        y: y - this.handleSize / 2,
        direction: "n",
      },
      {
        x: x + width - this.handleSize / 2,
        y: y - this.handleSize / 2,
        direction: "ne",
      },
      {
        x: x + width - this.handleSize / 2,
        y: y + height / 2 - this.handleSize / 2,
        direction: "e",
      },
      {
        x: x + width - this.handleSize / 2,
        y: y + height - this.handleSize / 2,
        direction: "se",
      },
      {
        x: x + width / 2 - this.handleSize / 2,
        y: y + height - this.handleSize / 2,
        direction: "s",
      },
      {
        x: x - this.handleSize / 2,
        y: y + height - this.handleSize / 2,
        direction: "sw",
      },
      {
        x: x - this.handleSize / 2,
        y: y + height / 2 - this.handleSize / 2,
        direction: "w",
      },
    ];
  }
  getMousePositionType(
    editContext: EditContext,
    toolData: ToolData
  ): MouseDownPosType {
    if (!toolData.currentCropBox) {
      return "outside";
    }

    const { x, y, width, height } = toolData.currentCropBox;

    // check if over resize handles
    const handlePositions = this._computeHandlePosition(x, y, width, height);
    for (const handle of handlePositions) {
      if (
        editContext.isMouseInRect(
          handle.x,
          handle.y,
          this.handleSize,
          this.handleSize
        )
      ) {
        return ("handle-" + handle.direction) as MouseDownPosType;
      }
    }

    // check if inside crop box
    if (editContext.isMouseInRect(x, y, width, height)) {
      return "inside";
    }

    return "outside";
  }

  getCursorType(editContext: EditContext, toolData: ToolData): string {
    const mousePositionType = this.getMousePositionType(editContext, toolData);
    if (mousePositionType === "inside") {
      return "move";
    } else if (mousePositionType === "outside") {
      return "default";
    } else {
      return mousePositionType.split("-")[1] + "-resize";
    }
  }

  constrainCropBox(
    cropBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
    constraintWidth: number,
    constraintHeight: number,
    minCropSize: number = 20
  ) {
    cropBox.x = Math.max(0, Math.min(cropBox.x, constraintWidth - minCropSize));
    cropBox.y = Math.max(
      0,
      Math.min(cropBox.y, constraintHeight - minCropSize)
    );
    cropBox.width = Math.max(
      minCropSize,
      Math.min(cropBox.width, constraintWidth - cropBox.x)
    );
    cropBox.height = Math.max(
      minCropSize,
      Math.min(cropBox.height, constraintHeight - cropBox.y)
    );
  }
}

interface CropToolSubToolbarProps {
  editContextRef: React.MutableRefObject<EditContext | null>;
  onExit?: () => void;
}

export function CropToolSubToolbar({
  editContextRef,
  onExit,
}: CropToolSubToolbarProps) {
  const handleButtonClick = (value?: string | null) => {
    if (!editContextRef.current || !value) return;
    editContextRef.current.messageTool(value);
    onExit?.();
  };

  return (
    <ToggleGroup
      type="single"
      className="gap-1"
      onValueChange={(value: string) => handleButtonClick(value)}
    >
      <ToggleGroupItem value="accept">
        <CheckIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="reject">
        <XIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
