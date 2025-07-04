import {
  CropIcon,
  MoveIcon,
  PencilIcon,
  RedoIcon,
  SearchIcon,
  SquareDashed,
  UndoIcon,
} from "lucide-react";
import React, { useState, useImperativeHandle } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

function ToolButton({
  value,
  icon,
  label,
  ...props
}: {
  value: ToolName;
  icon: React.ComponentType;
  label: string;
} & React.ComponentProps<typeof ToggleGroupItem>) {
  return (
    <ToggleGroupItem value={value} className="px-0" {...props}>
      <Tooltip delayDuration={400}>
        <TooltipTrigger asChild>
          <div className="size-8 flex items-center justify-center">
            {React.createElement(icon)}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-md">{label}</p>
        </TooltipContent>
      </Tooltip>
    </ToggleGroupItem>
  );
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
        subToolbar = (
          <CropToolSubToolbar
            editContextRef={editContextRef}
            onExit={() => useTool("pan")}
          />
        );
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

  const toolButtons: {
    value: ToolName;
    icon: React.ComponentType;
    label: string;
  }[] = [
    {
      value: "pan",
      icon: MoveIcon,
      label: "Pan Tool (Ctrl+1)",
    },
    {
      value: "select",
      icon: SquareDashed,
      label: "Select Tool (Ctrl+2)",
    },
    {
      value: "zoom",
      icon: SearchIcon,
      label: "Zoom Tool (Ctrl+3)",
    },
    {
      value: "crop",
      icon: CropIcon,
      label: "Crop Tool (Ctrl+4)",
    },
    {
      value: "pen",
      icon: PencilIcon,
      label: "Pen Tool (Ctrl+5)",
    },
    {
      value: "undo",
      icon: UndoIcon,
      label: "Undo (Ctrl+Z)",
    },
    {
      value: "redo",
      icon: RedoIcon,
      label: "Redo (Ctrl+Shift+Z)",
    },
  ];

  return (
    <div className="flex p-2 gap-2">
      {/* main toolbar */}
      <ToggleGroup
        type="single"
        className="flex gap-2 p-1 bg-stone-700 rounded-md"
        value={currentToolName}
        onValueChange={(value) => useTool((value as any) || "pan")}
      >
        {toolButtons.map((button) => {
          if (button.value === "undo") {
            return (
              <ToolButton
                key={button.value}
                disabled={undoStackLength === 0}
                {...button}
              />
            );
          } else if (button.value === "redo") {
            return (
              <ToolButton
                key={button.value}
                disabled={redoStackLength === 0}
                {...button}
              />
            );
          } else {
            return <ToolButton key={button.value} {...button} />;
          }
        })}
      </ToggleGroup>

      {/* sub toolbar */}
      {renderSubToolbar()}
    </div>
  );
}
