import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import React from "react";
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

  constructor(
    parent: FileSystemNode,
    depth: number,
    name: string,
    editData: EditData
  ) {
    super(parent, depth);
    this.name = name;
    this.editData = editData;
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
    },

    setSelectedNode: (context, event: { node: FileSystemNode | null }) => ({
      root: context.root,
      selectedNode: event.node,
    }),

    clear: (_) => ({
      root: new DirectoryNode(null, -1, [], true),
      selectedNode: null,
    }),
  },
});

editDataStore.on("added", (event: { data: EditData }) => {
  imageUIStore.trigger.add({ data: event.data });
});
editDataStore.on("clear", (_) => {
  imageUIStore.trigger.clear();
});
editDataStore.on("currentChanged", (event: { current: EditData }) => {
  const node = imageUIStore
    .getSnapshot()
    .context.root.find(
      (node) => node instanceof FileNode && node.editData === event.current
    );

  if (node) {
    let current = node.parent;
    while (current) {
      if (current instanceof DirectoryNode) {
        current.isExpanded = true;
      }
      current = current.parent;
    }

    imageUIStore.trigger.setSelectedNode({ node });
  }
});

const TreeNode = ({
  node,
  selectedNode,
  showSelf = true,
}: {
  node: FileSystemNode;
  selectedNode: FileSystemNode | null;
  showSelf?: boolean;
}) => {
  const isSelected = selectedNode === node;

  const onClick = () => {
    if (node instanceof DirectoryNode) {
      node.isExpanded = !node.isExpanded;
    }
    if (node instanceof FileNode) {
      editDataStore.trigger.setCurrentEditData({
        data: node.editData,
      });
    }

    imageUIStore.trigger.setSelectedNode({ node });
  };

  let selfMarkup;

  if (node instanceof DirectoryNode) {
    selfMarkup = (
      <div className="flex items-center space-x-2">
        <ChevronRight
          className={cn(
            "w-3 h-3 text-gray-100 transition-transform duration-300",
            node.isExpanded && "rotate-90"
          )}
        />
        {node.isExpanded ? (
          <FolderOpen className="w-4 h-4 text-blue-400" />
        ) : (
          <Folder className="w-4 h-4 text-blue-400" />
        )}
        <span className="text-md truncate">{node.directory.join(pathSep)}</span>
      </div>
    );
  }
  if (node instanceof FileNode) {
    selfMarkup = <span className="text-sm pl-2">{node.name}</span>;
  }

  const childrenMarkup = node instanceof DirectoryNode &&
    node.children &&
    node.children.length !== 0 &&
    node.isExpanded && (
      <React.Fragment>
        {node.children!.map((child) => (
          <TreeNode key={child.key} node={child} selectedNode={selectedNode} />
        ))}
      </React.Fragment>
    );

  return (
    <div>
      {showSelf && selfMarkup && (
        <div
          className={cn(
            "cursor-pointer hover:bg-gray-800 py-2",
            isSelected && "bg-gray-600"
          )}
          style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
          onClick={onClick}
        >
          {selfMarkup}
        </div>
      )}
      {childrenMarkup}
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
      <TreeNode
        node={uiContext.root}
        selectedNode={uiContext.selectedNode}
        showSelf={false}
      />
    </ScrollArea>
  );
};
