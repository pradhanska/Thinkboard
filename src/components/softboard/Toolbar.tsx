import { useRef } from "react";
import {
  STRING_COLORS,
  colorVar,
  type StringColor,
  type ThemeName,
} from "@/lib/softboard-types";
import {
  StickyNote,
  Image as ImageIcon,
  Music,
  FileText,
  Download,
  Upload,
  Link2,
  Trash,
  ZoomIn,
  Palette,
} from "lucide-react";

interface Props {
  theme: ThemeName;
  onSetTheme: (t: ThemeName) => void;
  onAddNote: () => void;
  onAddImage: () => void;
  onAddAudio: () => void;
  onAddDocument: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  connectMode: boolean;
  onToggleConnect: () => void;
  activeStringColor: StringColor;
  onSetStringColor: (c: StringColor) => void;
  zoom: number;
  onZoomReset: () => void;
  itemCount: number;
}

export function Toolbar(p: Props) {
  const importRef = useRef<HTMLInputElement>(null);

  const themes: { id: ThemeName; label: string }[] = [
    { id: "cork", label: "Cork" },
    { id: "white", label: "White" },
    { id: "cyber", label: "Cyber" },
  ];

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center gap-1.5 rounded-2xl bg-popover/90 text-popover-foreground backdrop-blur-md border px-2 py-2 shadow-lg max-w-[96vw]">
      <div className="px-2 font-bold tracking-tight handwritten text-xl mr-1">
        Softboard
      </div>

      <Divider />

      <ToolBtn onClick={p.onAddNote} icon={<StickyNote size={16} />} label="Note" />
      <ToolBtn onClick={p.onAddImage} icon={<ImageIcon size={16} />} label="Image" />
      <ToolBtn onClick={p.onAddAudio} icon={<Music size={16} />} label="Audio" />
      <ToolBtn onClick={p.onAddDocument} icon={<FileText size={16} />} label="Doc" />

      <Divider />

      <button
        onClick={p.onToggleConnect}
        title="Toggle connect mode"
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
          p.connectMode
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-accent"
        }`}
      >
        <Link2 size={16} />
        Connect
      </button>

      <div className="flex items-center gap-1 rounded-lg bg-secondary/60 px-1 py-1">
        {STRING_COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => p.onSetStringColor(c.id)}
            title={c.label}
            className={`h-5 w-5 rounded-full border-2 transition ${
              p.activeStringColor === c.id
                ? "border-foreground scale-110"
                : "border-transparent"
            }`}
            style={{ background: colorVar(c.id) }}
          />
        ))}
      </div>

      <Divider />

      <div className="flex items-center gap-1 rounded-lg bg-secondary/60 px-1 py-1">
        <Palette size={14} className="ml-1 text-muted-foreground" />
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => p.onSetTheme(t.id)}
            className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
              p.theme === t.id
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Divider />

      <ToolBtn onClick={p.onExport} icon={<Download size={16} />} label="Save" />
      <ToolBtn
        onClick={() => importRef.current?.click()}
        icon={<Upload size={16} />}
        label="Load"
      />
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) p.onImport(f);
          e.target.value = "";
        }}
      />

      <button
        onClick={p.onZoomReset}
        title="Reset view"
        className="flex items-center gap-1 rounded-lg bg-secondary text-secondary-foreground px-2 py-1.5 text-xs hover:bg-accent"
      >
        <ZoomIn size={14} />
        {Math.round(p.zoom * 100)}%
      </button>

      <ToolBtn
        onClick={p.onClear}
        icon={<Trash size={16} />}
        label=""
        title="Clear board"
        danger
      />

      <span className="text-[10px] text-muted-foreground px-1">
        {p.itemCount} item{p.itemCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-6 w-px bg-border mx-0.5" />;
}

function ToolBtn({
  onClick,
  icon,
  label,
  title,
  danger,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
        danger
          ? "bg-secondary text-destructive hover:bg-destructive hover:text-destructive-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-accent"
      }`}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}
