import { UndoIcon, RedoIcon } from "lucide-react";
import { useSelector } from "@xstate/store/react";
import { useEffect, useReducer } from "react";

import { editDataStore, EditAction, EditData } from "./edit-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getActionDisplayName(action: EditAction): string {
  switch (action.type) {
    case "SetField":
      switch (action.fieldName) {
        case "cropBox":
          return "Crop";
        case "drawings":
          return "Drawing";
        default:
          return `Set ${action.fieldName}`;
      }
    case "PushToField":
      switch (action.fieldName) {
        case "drawings":
          return "Draw stroke";
        default:
          return `Add to ${action.fieldName}`;
      }
    default:
      return "Unknown action";
  }
}

export function ActionHistoryDisplay() {
  const currentEditData = useSelector(
    editDataStore,
    (state) => state.context.currentEditData
  );
  const [, forceUpdate] = useReducer((state) => state + 1, 0);

  useEffect(() => {
    const subscription = editDataStore.on(
      "editDataUpdated",
      (event: { data: EditData }) => {
        if (event.data === currentEditData) {
          forceUpdate();
        }
      }
    );
    return () => {
      subscription.unsubscribe();
    };
  }, [currentEditData]);

  const { undoStack, redoStack } = currentEditData ?? {
    undoStack: [],
    redoStack: [],
  };
  const allActions = [...undoStack, ...redoStack.slice().reverse()];
  const undoStackLength = undoStack.length;

  const handleActionClick = (index: number) => {
    if (index < undoStackLength) {
      const undosNeeded = undoStackLength - index;
      for (let i = 0; i < undosNeeded; i++) {
        currentEditData && currentEditData.undo();
      }
    } else {
      const redosNeeded = index - undoStackLength + 1;
      for (let i = 0; i < redosNeeded; i++) {
        currentEditData && currentEditData.redo();
      }
    }
  };

  return (
    <ScrollArea className="flex flex-col gap-2 select-none min-h-0 flex-1">
      <div className="font-semibold">Action History</div>
      {allActions.length > 0 && (
        <div className="flex flex-col gap-1">
          {allActions.map((action, index) => {
            const isUndoAction = index < undoStackLength;
            const isCurrentState = index === undoStackLength - 1;

            return (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start h-8 px-2 text-left",
                  isCurrentState && "bg-accent text-accent-foreground",
                  !isUndoAction && "text-muted-foreground opacity-60"
                )}
                onClick={() => handleActionClick(index)}
              >
                <div className="flex items-center gap-2 w-full">
                  {isUndoAction ? (
                    <UndoIcon className="size-3" />
                  ) : (
                    <RedoIcon className="size-3" />
                  )}
                  <span className="text-xs truncate">
                    {getActionDisplayName(action)}
                  </span>
                </div>
              </Button>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
}
