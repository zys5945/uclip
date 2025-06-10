import {
  CropIcon,
  MoveIcon,
  PencilIcon,
  RedoIcon,
  SearchIcon,
  UndoIcon,
} from "lucide-react";
import { useState, useImperativeHandle, useEffect } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CropTool, CropToolSubToolbar } from "./crop";
import { EditContext, EditTool } from "./edit-context";
import { PanTool } from "./pan";
import { PenTool } from "./pen";
import { ZoomTool, ZoomToolSubToolbar } from "./zoom";

export type ToolName = "pan" | "zoom" | "crop" | "pen" | "undo" | "redo";

export interface ToolbarHandle {
  useTool: (toolName: ToolName) => void;
}

export function Toolbar({
  ctx,
  ref,
}: {
  ctx: EditContext;
  ref: React.Ref<ToolbarHandle>;
}) {
  const [currentToolName, setCurrentToolName] = useState<string | undefined>(
    void 0
  );

  const useTool = (toolName: ToolName) => {
    if (!ctx.initialized || !ctx.data) {
      setCurrentToolName(void 0);
      return;
    }

    if (toolName === "undo") {
      ctx.data.undo();
      return;
    }

    if (toolName === "redo") {
      ctx.data.redo();
      return;
    }

    // deactivate the current active tool. however pan tool cannot be manually deactivated
    if (toolName === currentToolName && toolName === "pan") return;
    ctx.deactivateTool();

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
      case "pen":
        tool = new PenTool();
        break;
    }

    ctx.setTool(tool);
    setCurrentToolName(nextToolName);
  };

  useImperativeHandle(
    ref,
    () => {
      return {
        useTool,
      };
    },
    []
  );

  const renderSubToolbar = () => {
    let subToolbar;

    switch (currentToolName ?? 0) {
      case "zoom":
        subToolbar = <ZoomToolSubToolbar ctx={ctx} />;
        break;
      case "crop":
        subToolbar = (
          <CropToolSubToolbar ctx={ctx} onExit={() => useTool("pan")} />
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

  return (
    <div className="flex p-2 space-x-2">
      {/* main toolbar */}
      <div className="flex space-x-2 p-1 bg-stone-700 rounded-md">
        <ToggleGroup
          type="single"
          className="gap-1"
          value={currentToolName}
          onValueChange={(value) => useTool((value as any) || "pan")}
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
          <ToggleGroupItem value="undo">
            <UndoIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="redo">
            <RedoIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* sub toolbar */}
      {renderSubToolbar()}
    </div>
  );
}
