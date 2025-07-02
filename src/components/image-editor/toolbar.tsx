import {
  CropIcon,
  MoveIcon,
  PencilIcon,
  RedoIcon,
  SearchIcon,
  SquareDashed,
  UndoIcon,
} from "lucide-react";
import { useState, useImperativeHandle } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CropTool, CropToolSubToolbar } from "./crop";
import { EditContext, EditTool } from "./edit-context";
import { PanTool } from "./pan";
import { PenTool, PenToolSubToolbar } from "./pen";
import { ZoomTool, ZoomToolSubToolbar } from "./zoom";
import { editDataStore } from "../edit-data";
import { useSelector } from "@xstate/store/react";
import { SelectTool } from "./select";

export const TOOL_NAMES = [
  "pan",
  "select",
  "zoom",
  "crop",
  "pen",
  "undo",
  "redo",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export interface ToolbarHandle {
  getCurrentToolName: () => ToolName | null;
  useTool: (toolName: ToolName) => void;
  messageTool: (message: string) => void;
}

export function Toolbar({
  editContextRef,
  ref,
}: {
  editContextRef: React.RefObject<EditContext | null>;
  ref: React.Ref<ToolbarHandle>;
}) {
  const [currentToolName, setCurrentToolName] = useState<string>("null");
  const undoStackLength = useSelector(
    editDataStore,
    (state) => state.context.currentEditData?.undoStack.length
  );
  const redoStackLength = useSelector(
    editDataStore,
    (state) => state.context.currentEditData?.redoStack.length
  );

  const useTool = (toolName: ToolName) => {
    const ctx = editContextRef?.current;
    if (!ctx || !ctx.data) {
      setCurrentToolName("null");
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
      case "select":
        tool = new SelectTool();
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

  const messageTool = (message: string) => {
    if (!editContextRef.current || !editContextRef.current.currentTool) return;
    editContextRef.current.messageTool(message);
  };

  const getCurrentToolName = () => {
    return currentToolName === "null" ? null : (currentToolName as ToolName);
  };

  useImperativeHandle(
    ref,
    () => {
      return {
        getCurrentToolName,
        useTool,
        messageTool,
      };
    },
    [currentToolName]
  );

  const renderSubToolbar = () => {
    let subToolbar;

    switch (currentToolName ?? 0) {
      case "zoom":
        subToolbar = <ZoomToolSubToolbar editContextRef={editContextRef} />;
        break;
      case "crop":
        subToolbar = <CropToolSubToolbar editContextRef={editContextRef} />;
        break;
      case "pen":
        subToolbar = <PenToolSubToolbar />;
        break;
    }

    if (subToolbar) {
      return (
        <div className="flex gap-2 p-1 bg-stone-700 rounded-md">
          {subToolbar}
        </div>
      );
    }
  };

  return (
    <div className="flex p-2 gap-2">
      {/* main toolbar */}
      <div className="flex gap-2 p-1 bg-stone-700 rounded-md">
        <ToggleGroup
          type="single"
          className="gap-1"
          value={currentToolName}
          onValueChange={(value) => useTool((value as any) || "pan")}
        >
          <ToggleGroupItem value="pan">
            <MoveIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="select">
            <SquareDashed />
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
          <ToggleGroupItem value="undo" disabled={undoStackLength === 0}>
            <UndoIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="redo" disabled={redoStackLength === 0}>
            <RedoIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* sub toolbar */}
      {renderSubToolbar()}
    </div>
  );
}
