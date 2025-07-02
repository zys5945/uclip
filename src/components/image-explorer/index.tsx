import { useSelector } from "@xstate/store/react";
import React from "react";

import { editDataStore } from "../edit-data";
import { InputPrompt } from "./input-prompt";
import { DirectoryTree } from "./tree-view";

export function ImageExplorer() {
  const editDatas = useSelector(
    editDataStore,
    (state) => state.context.editDatas
  );

  return (
    <React.Fragment>
      {editDatas.length === 0 ? <InputPrompt /> : <DirectoryTree />}
    </React.Fragment>
  );
}
