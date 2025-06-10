import { Upload } from "lucide-react";

export function InputUI() {
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.files);
  };

  return (
    <div className="relative w-full h-full transition-all transition-ease hover:scale-120">
      <div className="w-full h-full flex flex-col items-center justify-center h-full space-y-2 ">
        <Upload className="h-12 w-12" />
        <p className="text-lg font-medium dark:text-gray-300">
          Drop images here
        </p>
        <p className="text-sm dark:text-gray-400">or click to open folder</p>
      </div>
      <input
        type="file"
        // @ts-ignore
        webkitdirectory="true"
        className="absolute inset-0 w-full h-full opacity-0"
        style={{
          cursor: "pointer",
        }}
        onChange={handleFileInput}
      />
      ;
    </div>
  );
}
