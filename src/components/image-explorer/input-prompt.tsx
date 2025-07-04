import { Upload } from "lucide-react";

import { selectDirectory } from "@/lib/file";

export function InputPrompt() {
  return (
    <div
      className="relative w-full h-full transition-all ease-in-out duration-300 hover:scale-120 select-none cursor-pointer"
      onClick={selectDirectory}
    >
      <div className="w-full h-full flex flex-col items-center justify-center h-full gap-2">
        <Upload className="h-12 w-12" />
        <p className="text-lg font-medium dark:text-gray-300">
          Drop images here
        </p>
        <p className="text-sm dark:text-gray-400">or click to open folder</p>
      </div>
    </div>
  );
}
