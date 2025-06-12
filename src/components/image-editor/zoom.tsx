import { ZoomInIcon, ZoomOutIcon } from "lucide-react";
import React, { useEffect, useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EditContext, EditTool } from "./edit-context";

interface ToolData {
  zoomInvariantPoint?: { x: number; y: number };
  dragged?: boolean;
  clickType: "in" | "out";
  eventHandlers?: { [key: string]: (e: MouseEvent) => void };
}

export class ZoomTool implements EditTool {
  activate(ctx: EditContext, toolData: ToolData) {
    toolData.clickType = "in";
    this.setCursorType(ctx, toolData);

    const zoom = (by: number, zoomInvariantPoint: { x: number; y: number }) => {
      const oldZoom = ctx.scale;
      ctx.logScale += by * ctx.scaleStepSize;
      const newZoom = ctx.scale;

      const deltaX = (newZoom - oldZoom) * zoomInvariantPoint.x;
      const deltaY = (newZoom - oldZoom) * zoomInvariantPoint.y;
      ctx.translation.x -= deltaX;
      ctx.translation.y -= deltaY;
    };

    const onMouseDown = (_: MouseEvent) => {
      toolData.zoomInvariantPoint = ctx.mousePos;
    };

    const onMouseMove = (_: MouseEvent) => {
      if (!ctx.isDragging || !ctx.mousePosPx || !ctx.lastMousePosPx) return;
      toolData.dragged = true;
      const deltaX = ctx.mousePosPx.x - ctx.lastMousePosPx.x;
      zoom(deltaX * ctx.scaleSensitivity, toolData.zoomInvariantPoint!);
    };

    const onMouseUp = (_: MouseEvent) => {
      if (toolData.dragged) {
        toolData.dragged = false;
        return;
      }
      zoom((toolData.clickType === "out" ? -1 : 1) * ctx.scaleStepSize, {
        x: ctx.mousePos!.x,
        y: ctx.mousePos!.y,
      });
    };

    toolData.eventHandlers = {};
    toolData.eventHandlers.onMouseDown = onMouseDown;
    toolData.eventHandlers.onMouseMove = onMouseMove;
    toolData.eventHandlers.onMouseUp = onMouseUp;

    ctx.subscribe("mousedown", onMouseDown);
    ctx.subscribe("mousemove", onMouseMove);
    ctx.subscribe("mouseup", onMouseUp);
  }

  draw() {}

  onMessage(ctx: EditContext, toolData: any, message: string): void {
    toolData.clickType = message;
    this.setCursorType(ctx, toolData);
  }

  deactivate(ctx: EditContext, toolData: ToolData) {
    ctx.canvas.style.cursor = "default";
    ctx.unsubscribe("mousemove", toolData.eventHandlers!.onMouseMove);
    ctx.unsubscribe("mouseup", toolData.eventHandlers!.onMouseUp);
  }

  setCursorType(ctx: EditContext, toolData: ToolData) {
    ctx.canvas.style.cursor =
      toolData.clickType === "out" ? "zoom-out" : "zoom-in";
  }
}

export function ZoomToolSubToolbar({
  editContextRef,
}: {
  editContextRef: React.MutableRefObject<EditContext | null>;
}) {
  const [zoomTypeIndex, setZoomTypeIndex] = useState(0);

  const changeZoomType = (index: number) => {
    if (!editContextRef.current) return;
    editContextRef.current.messageTool(index === 0 ? "in" : "out");
    setZoomTypeIndex(index);
  };

  useEffect(() => {
    changeZoomType(zoomTypeIndex);
  }, []);

  return (
    <ToggleGroup
      type="single"
      className="gap-1"
      value={zoomTypeIndex.toString()}
      onValueChange={(value) => changeZoomType(parseInt(value))}
    >
      <ToggleGroupItem value="0">
        <ZoomInIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="1">
        <ZoomOutIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
