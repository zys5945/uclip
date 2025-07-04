import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { sep } from "@tauri-apps/api/path";

import { EditData, editDataStore } from "../edit-data";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import React from "react";
import {
  exportCurrentImage,
  exportImage,
  saveCurrentEditData,
  saveEditData,
} from "@/lib/file";
import { showContextMenu } from "@/lib/context-menu";
import { MenuItemOptions } from "@tauri-apps/api/menu";

const pathSep = sep();

const makeKey = (() => {
  let count = 0;
  return () => {
    count++;
    return count;
  };
})();

class FileSystemNode {
  key: number;
  parent: DirectoryNode | null;

  constructor(parent: DirectoryNode | null) {
    this.key = makeKey();
    this.parent = parent;
  }
}

class DirectoryNode extends FileSystemNode {
  directory: string[];
  isExpanded: boolean;
  children: FileSystemNode[];
  depth: number;

  constructor(
    parent: DirectoryNode | null,
    directory: string[],
    depth: number,
    isExpanded = false
  ) {
    super(parent);
    this.directory = directory;
    this.depth = depth;
    this.isExpanded = isExpanded;
    this.children = [];
  }

  addFile(directory: string[], name: string, editData: EditData) {
    const node = this.getOrCreateOwningDirectory(directory);
    node.children.push(new FileNode(node, name, editData));
  }

  addDirectory(directory: string[]) {
    this.getOrCreateOwningDirectory(directory);
  }

  findNodeWithData(editData: EditData | null): FileNode | null {
    if (!editData) {
      return null;
    }
    return this.find(
      (node) => node instanceof FileNode && node.editData === editData
    ) as FileNode | null;
  }

  private getOrCreateOwningDirectory(directory: string[]): DirectoryNode {
    if (directory.length === 0) {
      return this;
    }

    let overlap = -1;
    for (let i = 0; i < directory.length; i++) {
      if (i >= this.directory.length || this.directory[i] !== directory[i]) {
        break;
      }
      overlap = i;
    }

    // note it's not possible to have no match at all, except when this is the root node
    // in which case we still consider that a "full match"

    // matched partially, need to split
    if (overlap >= 0 && overlap < this.directory.length - 1) {
      const newDirectory = this.directory.slice(0, overlap + 1);
      const childNewDirectory = this.directory.slice(overlap + 1);

      const oldChildren = this.children;
      const oldChildrenParent = new DirectoryNode(
        this,
        childNewDirectory,
        this.depth + 1
      );
      oldChildrenParent.children = oldChildren;
      for (const child of oldChildren) {
        child.parent = oldChildrenParent;
      }

      this.directory = newDirectory;
      this.children = [oldChildrenParent];

      return this;
    }

    // self directory fully consumed

    // perfect match
    if (overlap === directory.length - 1) {
      return this;
    }

    // otherwise check children
    directory = directory.slice(overlap + 1);

    let firstPathName = directory[0];
    const child: DirectoryNode = this.children.find(
      (child) =>
        child instanceof DirectoryNode && child.directory[0] === firstPathName
    ) as DirectoryNode;

    // if found child then recurse, otherwise create new
    if (child) {
      return child.getOrCreateOwningDirectory(directory);
    } else {
      const newChild = new DirectoryNode(this, directory, this.depth + 1);
      this.children.push(newChild);
      return newChild;
    }
  }

  find(predicate: (node: FileSystemNode) => boolean): FileSystemNode | null {
    if (predicate(this)) {
      return this;
    }

    for (const child of this.children) {
      if (child instanceof DirectoryNode) {
        const childResult = child.find(predicate);
        if (childResult) {
          return childResult;
        }
      } else {
        if (predicate(child)) {
          return child;
        }
      }
    }

    return null;
  }
}

class FileNode extends FileSystemNode {
  name: string;
  editData: EditData;
  invariantCanvas: HTMLCanvasElement;

  constructor(parent: DirectoryNode, name: string, editData: EditData) {
    super(parent);
    this.name = name;
    this.editData = editData;

    this.invariantCanvas = document.createElement("canvas");
    this.invariantCanvas.width = editData.originalImageData.width;
    this.invariantCanvas.height = editData.originalImageData.height;
  }

  calcCanvasDimensions(maxDimension: number) {
    const scale =
      maxDimension /
      Math.max(this.editData.cropBox.width, this.editData.cropBox.height);

    const width = Math.floor(this.editData.cropBox.width * scale);
    const height = Math.floor(this.editData.cropBox.height * scale);

    return {
      width,
      height,
    };
  }

  drawToCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    const invariantCtx = this.invariantCanvas.getContext("2d")!;
    this.editData.drawToCanvas(invariantCtx);
    ctx.drawImage(
      this.invariantCanvas,
      this.editData.cropBox.x,
      this.editData.cropBox.y,
      this.editData.cropBox.width,
      this.editData.cropBox.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }
}

const imageUIStore = createStore({
  context: {
    root: new DirectoryNode(null, [], -1, true),
    selectedNode: null as FileSystemNode | null,
  },
  on: {
    add: (context, event: { data: EditData }) => {
      context.root.addFile(
        event.data.directory,
        event.data.filename,
        event.data
      );
      return {
        ...context,
      };
    },

    remove: (context, event: { data: EditData }) => {
      const node = context.root.findNodeWithData(event.data);
      if (!node) {
        return context;
      }

      let toRemove: FileSystemNode = node;
      let parent = toRemove.parent!;

      while (parent) {
        parent.children = parent.children.filter((child) => child !== toRemove);
        if (parent.children.length > 0) {
          break;
        }
        toRemove = parent;
        parent = parent.parent!;
      }

      return {
        ...context,
      };
    },

    selectNode(context, event: { node: FileSystemNode | null }) {
      return {
        root: context.root,
        selectedNode: event.node,
      };
    },

    selectNodeWithData: (context, event: { editData: EditData | null }) => {
      const node = context.root.findNodeWithData(event.editData);
      if (!node) {
        return {
          root: context.root,
          selectedNode: null,
        };
      }

      let current = node.parent;
      while (current) {
        if (current instanceof DirectoryNode) {
          current.isExpanded = true;
        }
        current = current.parent;
      }

      return {
        root: context.root,
        selectedNode: node,
      };
    },

    clear: (_) => ({
      root: new DirectoryNode(null, [], -1, true),
      selectedNode: null,
    }),
  },
});

editDataStore.on("added", (event: { data: EditData }) => {
  imageUIStore.trigger.add({ data: event.data });
  if (imageUIStore.getSnapshot().context.selectedNode === null) {
    imageUIStore.trigger.selectNodeWithData({ editData: event.data });
  }
});
editDataStore.on("removed", (event: { data: EditData }) => {
  imageUIStore.trigger.remove({ data: event.data });
});
editDataStore.on("clear", (_) => {
  imageUIStore.trigger.clear();
});
const currentEditData = editDataStore.select(
  (context) => context.currentEditData
);
currentEditData.subscribe((data) => {
  imageUIStore.trigger.selectNodeWithData({ editData: data });
});

function useContextMenu(node: FileSystemNode) {
  let items: MenuItemOptions[];
  if (node instanceof FileNode) {
    items = [
      {
        text: "Save As",
        action: () => saveEditData(node.editData),
      },
      {
        text: "Export",
        action: () => exportImage(node.editData),
      },
      {
        text: "Remove",
        action: () =>
          editDataStore.trigger.removeEditData({ data: node.editData }),
      },
    ];
  } else if (node instanceof DirectoryNode) {
    items = [
      {
        text: "Remove Directory",
        action: () => {
          let nodes: FileSystemNode[] = [node];
          while (nodes.length > 0) {
            const curNode = nodes.shift()!;
            if (curNode instanceof DirectoryNode) {
              nodes = nodes.concat(curNode.children);
            } else if (curNode instanceof FileNode) {
              editDataStore.trigger.removeEditData({ data: curNode.editData });
            }
          }
        },
      },
    ];
  }

  const handleContextMenu = (e: MouseEvent) => {
    showContextMenu({ x: e.clientX, y: e.clientY }, { items });
  };

  const refCallback = useCallback((node: HTMLDivElement) => {
    if (!node) return;

    node.addEventListener("contextmenu", handleContextMenu);
    return () => {
      node.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return refCallback;
}

const renderCanvas = (canvas: HTMLCanvasElement | null, node: FileNode) => {
  if (!canvas) {
    return;
  }
  const { width, height } = node.calcCanvasDimensions(300);

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  canvas.width = width;
  canvas.height = height;
  node.drawToCanvas(canvas);
};

const RenderFileNode = ({ node }: { node: FileNode }) => {
  const selectedNode = useSelector(
    imageUIStore,
    (store) => store.context.selectedNode,
    // only notify if selected node was or will be the node we're rendering
    (prev, next) => prev !== node && next !== node
  );
  const isSelected = selectedNode === node;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  if (canvasRef.current) {
    node.drawToCanvas(canvasRef.current);
  }
  const canvasCallback = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
    renderCanvas(canvasRef.current, node);
  }, []);

  const containerRefCallback = useContextMenu(node);

  useEffect(() => {
    const sub = editDataStore.on(
      "editDataUpdated",
      (event: { data: EditData }) => {
        if (event.data === node.editData && canvasRef.current) {
          // canvas dimensions have to be set here instead of passing in into canvas as props
          // the canvas bitmap will be reset upon setting width/height, and the content will be wiped
          // drawing needs to occur after the dimensions are set, which is inconvenient if doing through props
          renderCanvas(canvasRef.current, node);
        }
      }
    );
    return () => {
      sub.unsubscribe();
    };
  }, []);

  const onClick = () => {
    editDataStore.trigger.setCurrentEditData({
      data: node.editData,
    });
  };

  return (
    <div
      className={cn(
        "cursor-pointer hover:bg-gray-800 py-2",
        isSelected && "bg-gray-600"
      )}
      onClick={onClick}
      ref={containerRefCallback}
    >
      <div className="flex flex-col gap-1">
        <h1 className="mx-auto">{node.name}</h1>
        <canvas
          className="mx-auto"
          ref={canvasCallback}
          width={300}
          height={300}
        />
      </div>
    </div>
  );
};

const RenderDirectoryNode = ({
  node,
  showSelf = true,
}: {
  node: DirectoryNode;
  showSelf: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(node.isExpanded);

  const containerRefCallback = useContextMenu(node);

  const onClick = () => {
    node.isExpanded = !node.isExpanded;
    setIsExpanded(!isExpanded);
  };

  return (
    <React.Fragment>
      {showSelf && (
        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 py-2"
          style={{ paddingLeft: `${node.depth * 8}px` }}
          onClick={onClick}
          ref={containerRefCallback}
        >
          <ChevronRight
            className={cn(
              "w-3 h-3 text-gray-100 transition-transform duration-300 min-w-[24px]",
              isExpanded && "rotate-90"
            )}
          />
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-400 min-w-[24px]" />
          ) : (
            <Folder className="w-4 h-4 text-blue-400 min-w-[24px]" />
          )}
          <span className="text-md truncate">
            {node.directory.join(pathSep)}
          </span>
        </div>
      )}
      {isExpanded &&
        node.children!.map((child) =>
          child instanceof DirectoryNode ? (
            <RenderDirectoryNode key={child.key} node={child} showSelf={true} />
          ) : (
            <RenderFileNode key={child.key} node={child as FileNode} />
          )
        )}
    </React.Fragment>
  );
};

function useShortcuts() {
  const handleShortcuts = (e: KeyboardEvent) => {
    if (e.key === "Delete") {
      editDataStore.trigger.removeCurrentEditData();
      return;
    }

    if (!e.ctrlKey) return;

    switch (e.key) {
      case "s":
        saveCurrentEditData();
        break;
      case "e":
        exportCurrentImage();
        break;
    }
  };

  const containerCallback = useCallback((node: HTMLDivElement) => {
    if (!node) return;

    node.addEventListener("keydown", handleShortcuts);
    return () => {
      node.removeEventListener("keydown", handleShortcuts);
    };
  }, []);

  return containerCallback;
}

export const DirectoryTree = () => {
  const uiContext = useSelector(imageUIStore, (state) => state.context);

  if (!uiContext.root) {
    return null;
  }

  const containerCallback = useShortcuts();

  return (
    <ScrollArea
      tabIndex={0}
      ref={containerCallback}
      className="w-full h-full flex flex-col p-2 select-none transition-colors duration-150"
    >
      <RenderDirectoryNode node={uiContext.root} showSelf={false} />
    </ScrollArea>
  );
};
