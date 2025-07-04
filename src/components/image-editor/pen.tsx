import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { DrawnStroke } from "../edit-data";
import { EditContext, EditTool } from "./edit-context";

interface ToolData {
  currentStroke?: DrawnStroke;
  eventSubscribers: { [key: string]: (e: any) => void };
}

let globalStrokeColor = "#ff0000";
let globalStrokeWidth = 5;

export class PenTool implements EditTool {
  activate(ctx: EditContext, toolData: ToolData) {
    const onMouseDown = (e: MouseEvent) => {
      if (!ctx.data || !ctx.mousePos || e.button !== 0) return;

      toolData.currentStroke = {
        type: "stroke",
        color: globalStrokeColor,
        width: globalStrokeWidth,
        points: [ctx.data.toOriginalPos(ctx.mousePos.x, ctx.mousePos.y)],
      };
    };

    const onMouseMove = () => {
      if (!ctx.isDragging || !ctx.mousePos || !ctx.lastMousePos || !ctx.data) {
        return;
      }
      toolData.currentStroke!.points.push(
        ctx.data.toOriginalPos(ctx.mousePos.x, ctx.mousePos.y)
      );
    };

    const onMouseUp = () => {
      if (!ctx.data || !toolData.currentStroke) return;

      ctx.data.drawings.push(toolData.currentStroke);
      ctx.data.pushToUndoStack({
        type: "PushToField",
        fieldName: "drawings",
        value: toolData.currentStroke,
      });

      toolData.currentStroke = void 0;
    };

    toolData.eventSubscribers = {};
    toolData.eventSubscribers.mousedown = onMouseDown;
    toolData.eventSubscribers.mousemove = onMouseMove;
    toolData.eventSubscribers.mouseup = onMouseUp;
    ctx.subscribe("mousedown", toolData.eventSubscribers.mousedown);
    ctx.subscribe("mousemove", toolData.eventSubscribers.mousemove);
    ctx.subscribe("mouseup", toolData.eventSubscribers.mouseup);
  }

  draw(ctx: EditContext, toolData: any): void {
    if (!ctx.data || !toolData.currentStroke) return;
    ctx.data.drawStroke(ctx.invariantCtx, toolData.currentStroke);
  }

  onMessage(): void {}

  deactivate(ctx: EditContext, toolData: ToolData) {
    ctx.unsubscribe("mousedown", toolData.eventSubscribers.mousedown);
    ctx.unsubscribe("mousemove", toolData.eventSubscribers.mousemove);
    ctx.unsubscribe("mouseup", toolData.eventSubscribers.mouseup);
  }
}

const predefinedColors = [
  "#ff0000", // Red
  "#00ff00", // Green
  "#0000ff", // Blue
  "#ffff00", // Yellow
  "#ff00ff", // Magenta
  "#00ffff", // Cyan
  "#000000", // Black
  "#ffffff", // White
  "#808080", // Gray
  "#ffa500", // Orange
  "#800080", // Purple
  "#008000", // Dark Green
];

export function PenToolSubToolbar() {
  const [strokeColor, setStrokeColor] = useState(globalStrokeColor);
  const [strokeWidth, setStrokeWidth] = useState(globalStrokeWidth);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const handleColorChange = (color: string) => {
    globalStrokeColor = color;
    setStrokeColor(color);
  };

  const handleStrokeWidthChange = (width: number) => {
    globalStrokeWidth = width;
    setStrokeWidth(width);
  };

  return (
    <div className="flex items-center gap-4 px-2 select-none">
      {/* Color Picker */}
      <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="size-6 rounded-full border-0"
            style={{ backgroundColor: strokeColor }}
            aria-label="Choose color"
          />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Choose Color</h4>
            <div className="grid grid-cols-6 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  className="size-6 rounded-full"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                  aria-label={`Select ${color}`}
                />
              ))}
            </div>
            <div className="space-y-2">
              <label htmlFor="custom-color" className="text-sm">
                Custom Color:
              </label>
              <input
                id="custom-color"
                type="color"
                value={strokeColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-full h-8 rounded border"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Stroke Width Slider */}
      <div className="flex items-center gap-2">
        <span className="text-md">Width:</span>
        <Slider
          value={[strokeWidth]}
          onValueChange={(v) => handleStrokeWidthChange(v[0])}
          min={1}
          max={100}
          step={1}
          className="w-32"
        />
        <Input
          value={strokeWidth}
          onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
          className="text-md w-16"
        />
      </div>
    </div>
  );
}
