import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { sep } from "@tauri-apps/api/path";

import { EditData, editDataStore } from "../edit-data";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";

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
  parent: FileSystemNode | null;
  depth: number;

  constructor(parent: FileSystemNode | null, depth: number) {
    this.key = makeKey();
    this.parent = parent;
    this.depth = depth;
  }
}

class DirectoryNode extends FileSystemNode {
  directory: string[];
  isExpanded: boolean;
  children: FileSystemNode[];

  constructor(
    parent: FileSystemNode | null,
    depth: number,
    directory: string[],
    isExpanded = false
  ) {
    super(parent, depth);
    this.directory = directory;
    this.isExpanded = isExpanded;
    this.children = [];
  }

  addFile(directory: string[], name: string, editData: EditData) {
    const node = this.getOrCreateOwningDirectory(directory);
    node.children.push(new FileNode(node, node.depth + 1, name, editData));
  }

  addDirectory(directory: string[]) {
    this.getOrCreateOwningDirectory(directory);
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
      const oldChildrenNewDirectory = this.directory.slice(overlap + 1);
      const newChildDirectory = directory.slice(overlap + 1);

      const oldChildren = this.children;
      const oldChildrenParent = new DirectoryNode(
        this,
        this.depth + 1,
        oldChildrenNewDirectory
      );
      oldChildrenParent.children = oldChildren;

      const newChild = new DirectoryNode(
        this,
        this.depth + 1,
        newChildDirectory
      );

      this.directory = newDirectory;
      this.children = [oldChildrenParent, newChild];

      return newChild;
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
      const newChild = new DirectoryNode(this, this.depth + 1, directory);
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

  constructor(
    parent: FileSystemNode,
    depth: number,
    name: string,
    editData: EditData
  ) {
    super(parent, depth);
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
    root: new DirectoryNode(null, -1, [], true),
    selectedNode: null as FileSystemNode | null,
  },
  on: {
    add: (context, event: { data: EditData }) => {
      context.root.addFile(
        event.data.directory,
        event.data.filename,
        event.data
      );
      return context;
    },

    selectNode(context, event: { node: FileSystemNode | null }) {
      return {
        root: context.root,
        selectedNode: event.node,
      };
    },

    selectNodeWithData: (context, event: { editData: EditData | null }) => {
      const node = context.root.find(
        (node) => node instanceof FileNode && node.editData === event.editData
      );
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
      root: new DirectoryNode(null, -1, [], true),
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
editDataStore.on("clear", (_) => {
  imageUIStore.trigger.clear();
});
const currentEditData = editDataStore.select(
  (context) => context.currentEditData
);
currentEditData.subscribe((data) => {
  imageUIStore.trigger.selectNodeWithData({ editData: data });
});

const renderCanvas = (canvas: HTMLCanvasElement | null, node: FileNode) => {
  if (!canvas) {
    return;
  }
  const { width, height } = node.calcCanvasDimensions(300);
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
        "cursor-pointer hover:bg-gray-800 py-2 justify-center",
        isSelected && "bg-gray-600"
      )}
      style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-1">
        <h1>{node.name}</h1>
        <canvas ref={canvasCallback} />
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

  const onClick = () => {
    node.isExpanded = !node.isExpanded;
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      {showSelf && (
        <div
          className="cursor-pointer hover:bg-gray-800 py-2 justify-center"
          style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
          onClick={onClick}
        >
          <div className="flex items-center gap-2 ">
            <ChevronRight
              className={cn(
                "w-3 h-3 text-gray-100 transition-transform duration-300",
                isExpanded && "rotate-90"
              )}
            />
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-400" />
            ) : (
              <Folder className="w-4 h-4 text-blue-400" />
            )}
            <span className="text-md truncate">
              {node.directory.join(pathSep)}
            </span>
          </div>
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
    </div>
  );
};

export const DirectoryTree = () => {
  const uiContext = useSelector(imageUIStore, (state) => state.context);

  if (!uiContext.root) {
    return null;
  }

  return (
    <ScrollArea className="w-full h-full flex flex-col p-2 select-none transition-colors duration-150">
      <RenderDirectoryNode node={uiContext.root} showSelf={false} />
    </ScrollArea>
  );
};
