import { useSelector } from "@xstate/store/react";

import { editDataStore } from "../edit-data";
import { InputUI } from "./file-input";
import { DirectoryTreeSidebar } from "./tree-view";

export function ImageExplorer() {
  const editDatas = useSelector(
    editDataStore,
    (state) => state.context.editDatas
  );
  return editDatas.length === 0 ? <InputUI /> : <DirectoryTreeSidebar />;
}
