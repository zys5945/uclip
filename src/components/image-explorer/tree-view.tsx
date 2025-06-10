import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import React from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";

import { EditData, editDataStore } from "../edit-data";

class FileSystemNode {
  name: string;
  path: string[];
  depth: number;
  isFile: boolean;
  isExpanded?: boolean; // undefined for files
  children?: FileSystemNode[]; // undefined for files, array for folders

  constructor(name: string, path: string[], depth: number, isFile: boolean) {
    this.name = name;
    this.path = path;
    this.depth = depth;
    this.isFile = isFile;

    if (!isFile) {
      this.isExpanded = false;
      this.children = [];
    }
  }

  addFile(path: string[], fileName: string): void {
    const parent = this.getOrCreateFolder(path);
    parent.children!.push(
      new FileSystemNode(fileName, path, parent.depth + 1, true)
    );
  }

  addFolder(path: string[]): void {
    this.getOrCreateFolder(path);
  }

  private getOrCreateFolder(path: string[]): FileSystemNode {
    let current: FileSystemNode = this;

    for (const folderName of path) {
      let folder = current.children!.find(
        (child) => child.name === folderName && !child.isFile
      );

      if (!folder) {
        folder = new FileSystemNode(folderName, path, current.depth + 1, false);
        current.children!.push(folder);
      }

      current = folder;
    }

    return current;
  }

  find(path: string[]): FileSystemNode | null {
    let current: FileSystemNode = this;

    for (const name of path) {
      const child = current.children?.find((child) => child.name === name);
      if (!child) return null;
      current = child;
    }

    return current;
  }
}

const imageUIStore = createStore({
  context: {
    root: new FileSystemNode("root", [], -1, false),
    selectedNode: null as FileSystemNode | null,
  },
  on: {
    add: (context, event: { data: EditData }) => {
      context.root.addFile(event.data.directory, event.data.filename);
    },

    setRoot: (context, event?: { root: FileSystemNode }) => ({
      root: event?.root ?? context.root,
      selectedNode: context.selectedNode,
    }),

    setSelectedNode: (context, event: { node: FileSystemNode | null }) => ({
      root: context.root,
      selectedNode: event.node,
    }),
  },
});

editDataStore.on("added", (event: { data: EditData }) => {
  imageUIStore.trigger.add({ data: event.data });
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
  const onClick = () => {
    if (!node.isFile) {
      node.isExpanded = !node.isExpanded;
    }
    imageUIStore.trigger.setSelectedNode({ node });
  };

  const isSelected = node === selectedNode;

  const selfMarkup = (
    <div
      className={`transition-colors duration-150 cursor-pointer hover:bg-gray-800 py-2 ${
        isSelected && "bg-gray-600"
      }`}
      onClick={onClick}
    >
      {!node.isFile ? (
        <div
          className="flex items-center space-x-2"
          style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
        >
          {node.isExpanded ? (
            <React.Fragment>
              <ChevronDown className="w-3 h-3 text-gray-100" />
              <FolderOpen className="w-4 h-4 text-blue-400" />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <ChevronRight className="w-3 h-3 text-gray-100" />
              <Folder className="w-4 h-4 text-blue-400" />
            </React.Fragment>
          )}
          <span className="text-md truncate">{node.name}</span>
        </div>
      ) : (
        <div className="py-2 px-2 flex flex-col items-center space-y-1 mb-3">
          <span className="text-sm">{node.name}</span>
          <canvas width="200" height="100" className="border max-h-48" />
        </div>
      )}
    </div>
  );

  const childrenMarkup = node.children &&
    node.children.length &&
    node.isExpanded && (
      <React.Fragment>
        {node.children!.map((child: FileSystemNode, index) => (
          <TreeNode
            key={child.name || `${child.name}-${index}`}
            node={child}
            selectedNode={selectedNode}
          />
        ))}
      </React.Fragment>
    );

  return (
    <div>
      {showSelf && selfMarkup}
      {childrenMarkup}
    </div>
  );
};

export const DirectoryTreeSidebar = () => {
  const uiContext = useSelector(imageUIStore, (state) => state.context);

  if (!uiContext.root) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col p-2 select-none">
      <TreeNode
        node={uiContext.root}
        selectedNode={uiContext.selectedNode}
        showSelf={false}
      />
    </div>
  );
};
