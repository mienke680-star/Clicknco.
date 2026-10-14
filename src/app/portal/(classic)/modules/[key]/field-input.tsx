"use client";

import { useRef, useState } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";
import { Input, Textarea, Select, Checkbox } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface FieldDef {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  showInList: boolean;
  options: { choices?: string[]; targetModuleKey?: string } | null;
}

export interface FileValue {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

interface Props {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  users: { id: string; name: string }[];
  relationshipOptions: { id: string; label: string }[];
  moduleKey: string;
}

export function DynamicFieldInput({ field, value, onChange, users, relationshipOptions, moduleKey }: Props) {
  switch (field.type) {
    case "TEXT":
    case "EMAIL":
    case "PHONE":
    case "ADDRESS":
      return (
        <Input
          type={field.type === "EMAIL" ? "email" : "text"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      );
    case "NOTES":
      return <Textarea value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} />;
    case "NUMBER":
    case "CURRENCY":
      return (
        <Input
          type="number"
          step={field.type === "CURRENCY" ? "0.01" : "1"}
          value={(value as string | number) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "DATE":
      return <Input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "TIME":
      return <Input type="time" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "CHECKBOX":
      return <Checkbox checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
    case "DROPDOWN":
    case "STATUS":
      return (
        <Select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {(field.options?.choices ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      );
    case "MULTISELECT": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-3 rounded-xl border border-navy-200 p-3">
          {(field.options?.choices ?? []).map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-1.5 text-sm text-navy-700">
              <Checkbox
                checked={selected.includes(c)}
                onChange={(e) => onChange(e.target.checked ? [...selected, c] : selected.filter((x) => x !== c))}
              />
              {c}
            </label>
          ))}
        </div>
      );
    }
    case "USER":
      return (
        <Select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      );
    case "RELATIONSHIP":
      return (
        <Select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">None</option>
          {relationshipOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
      );
    case "FILE":
    case "IMAGE":
      return (
        <FileFieldInput
          value={value as FileValue | null}
          onChange={onChange}
          accept={field.type === "IMAGE" ? "image/*" : undefined}
          moduleKey={moduleKey}
        />
      );
    default:
      return <Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

function FileFieldInput({
  value,
  onChange,
  accept,
  moduleKey,
}: {
  value: FileValue | null;
  onChange: (v: FileValue | null) => void;
  accept?: string;
  moduleKey: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("moduleKey", moduleKey);
      const res = await apiFetch<{ file: FileValue }>("/api/uploads", { method: "POST", body: form });
      onChange(res.file);
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-navy-200 px-3 py-2 text-sm">
        <Paperclip className="h-4 w-4 shrink-0 text-navy-400" />
        <a href={value.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-coral-600 hover:underline">
          {value.fileName}
        </a>
        <button type="button" onClick={() => onChange(null)} className="text-navy-300 hover:text-danger cursor-pointer" aria-label="Remove file">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 rounded-xl border border-dashed border-navy-200 px-3 py-2 text-sm text-navy-500 hover:bg-navy-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        {uploading ? "Uploading…" : "Choose file"}
      </button>
    </div>
  );
}
