/**
 * FileUploadButton
 *
 * Companion control for textareas. Lets the user upload a PDF, DOCX, TXT,
 * or MD file; the server extracts plain text and we hand it back to the
 * parent via onExtracted(). Parent decides whether to replace or append
 * to the field's current value.
 *
 * Usage:
 *   <FileUploadButton onExtracted={(text) => setFieldValue(text)} />
 */

import { useRef, useState } from "react";
import { Upload, Loader2, Check, AlertCircle } from "lucide-react";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
const ACCEPT = ".pdf,.docx,.txt,.md";

type Status = "idle" | "uploading" | "success" | "error";

export interface FileUploadButtonProps {
  /** Called with extracted plain text on success. */
  onExtracted: (text: string, filename: string) => void;
  /** Optional label override. Default: "Upload file" */
  label?: string;
  /** Disable the button (e.g. while form is submitting). */
  disabled?: boolean;
  /** Compact styling for tight UIs. */
  size?: "sm" | "md";
}

export function FileUploadButton({
  onExtracted,
  label = "Upload file",
  disabled = false,
  size = "sm",
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [filename, setFilename] = useState<string>("");

  function pickFile() {
    if (disabled || status === "uploading") return;
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setErrorMsg("");
    setFilename(file.name);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/api/extract-text`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Upload failed (${res.status})`);
      }
      onExtracted(data.text || "", data.filename || file.name);
      setStatus("success");
      // Reset back to idle after a couple seconds so the button doesn't stay green forever.
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Upload failed");
      setTimeout(() => setStatus("idle"), 4000);
    } finally {
      // Allow re-uploading the same file later
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const baseClass =
    size === "sm"
      ? "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
      : "inline-flex items-center gap-2 px-3 py-2 text-sm";

  let pill =
    "rounded-md border transition-colors font-medium select-none cursor-pointer";
  let palette =
    "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400";
  if (status === "uploading") palette = "border-slate-300 bg-slate-50 text-slate-500 cursor-wait";
  if (status === "success") palette = "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (status === "error") palette = "border-rose-300 bg-rose-50 text-rose-700";
  if (disabled) palette = "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={pickFile}
        disabled={disabled || status === "uploading"}
        className={`${baseClass} ${pill} ${palette}`}
        title={`Upload a PDF, DOCX, TXT, or Markdown file. Text will fill the field below.`}
      >
        {status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {status === "success" && <Check className="h-3.5 w-3.5" />}
        {status === "error" && <AlertCircle className="h-3.5 w-3.5" />}
        {status === "idle" && <Upload className="h-3.5 w-3.5" />}
        <span>
          {status === "uploading" && "Reading…"}
          {status === "success" && "Loaded"}
          {status === "error" && "Failed"}
          {status === "idle" && label}
        </span>
      </button>

      {status === "success" && filename && (
        <span className="text-xs text-slate-500 truncate max-w-[180px]" title={filename}>
          {filename}
        </span>
      )}
      {status === "error" && errorMsg && (
        <span className="text-xs text-rose-600 truncate max-w-[260px]" title={errorMsg}>
          {errorMsg}
        </span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

export default FileUploadButton;
