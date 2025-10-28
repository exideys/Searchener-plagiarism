import { useState } from "react";

export function FileDrop({
  onFilesSelected,
  disabled,
}: {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [over, setOver] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) onFilesSelected(files);
    e.currentTarget.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onFilesSelected(files);
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl px-4 py-10 text-center cursor-pointer transition ${
        over ? "border-indigo-500 bg-indigo-50/40" : "border-gray-300 bg-white"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <input
        type="file"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={onChange}
        accept=".txt,text/plain"
      />
      <div className="text-sm font-medium">
        Drop files here or click to choose
      </div>
      <div className="text-xs text-gray-500">
        TXT recommended. Multiple files supported.
      </div>
    </label>
  );
}
