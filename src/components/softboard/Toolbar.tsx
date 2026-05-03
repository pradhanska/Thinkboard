import { useRef, useState } from "react";
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
  Palette,
  ChevronDown,
  Pencil,
} from "lucide-react";

interface Props {
  theme: ThemeName;
  onSetTheme: (t: ThemeName) => void;
  onAddNote: () => void;
  onAddImage: () => void;
  onAddAudio: () => void;
  onAddDocument: () => void;
  onAddSketch: () => void;
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
  const [themeOpen, setThemeOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const themes: { id: ThemeName; label: string; swatch: string }[] = [
    { id: "cork", label: "Cork", swatch: "linear-gradient(135deg,#b07a44,#7d4f23)" },
    { id: "white", label: "Paper", swatch: "linear-gradient(135deg,#ffffff,#e8eaf0)" },
    { id: "cyber", label: "Cyber", swatch: "linear-gradient(135deg,#00e5ff,#a855f7)" },
  ];
  const currentTheme = themes.find((t) => t.id === p.theme)!;
  const currentColor = STRING_COLORS.find((c) => c.id === p.activeStringColor)!;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 h-10 rounded-full bg-popover/70 text-popover-foreground backdrop-blur-xl border border-white/10 px-1.5 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.4)]">
      <div className="px-3 text-[13px] font-semibold tracking-tight select-none">
        <span className="opacity-90">soft</span>
        <span className="opacity-50">·</span>
        <span className="opacity-90">board</span>
      </div>

      <Sep />

      <Btn onClick={p.onAddNote} icon={<StickyNote size={14} />} label="Note" />
      <Btn onClick={p.onAddSketch} icon={<Pencil size={14} />} label="Sketch" />
      <Btn onClick={p.onAddImage} icon={<ImageIcon size={14} />} label="Image" />
      <Btn onClick={p.onAddAudio} icon={<Music size={14} />} label="Audio" />
      <Btn onClick={p.onAddDocument} icon={<FileText size={14} />} label="Doc" />

      <Sep />

      <button
        onClick={p.onToggleConnect}
        title="Connect mode"
        className={`flex items-center gap-1.5 h-7 rounded-full px-2.5 text-[11px] font-medium transition ${
          p.connectMode
            ? "bg-foreground text-background"
            : "hover:bg-foreground/10"
        }`}
      >
        <Link2 size={13} />
        Link
      </button>

      {/* String color popover */}
      <div className="relative">
        <button
          onClick={() => {
            setColorOpen((v) => !v);
            setThemeOpen(false);
          }}
          className="flex items-center gap-1.5 h-7 rounded-full px-2 hover:bg-foreground/10 transition"
          title="String color"
        >
          <span
            className="h-3.5 w-3.5 rounded-full ring-1 ring-foreground/20"
            style={{ background: colorVar(currentColor.id) }}
          />
          <ChevronDown size={11} className="opacity-60" />
        </button>
        {colorOpen && (
          <div className="absolute top-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-popover/95 backdrop-blur-xl border border-white/10 px-2 py-1.5 shadow-lg">
            {STRING_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  p.onSetStringColor(c.id);
                  setColorOpen(false);
                }}
                title={c.label}
                className={`h-5 w-5 rounded-full ring-2 transition ${
                  p.activeStringColor === c.id ? "ring-foreground scale-110" : "ring-transparent"
                }`}
                style={{ background: colorVar(c.id) }}
              />
            ))}
          </div>
        )}
      </div>

      <Sep />

      {/* Theme popover */}
      <div className="relative">
        <button
          onClick={() => {
            setThemeOpen((v) => !v);
            setColorOpen(false);
          }}
          className="flex items-center gap-1.5 h-7 rounded-full px-2 hover:bg-foreground/10 transition"
          title="Theme"
        >
          <Palette size={13} className="opacity-70" />
          <span
            className="h-3.5 w-3.5 rounded-full ring-1 ring-foreground/20"
            style={{ background: currentTheme.swatch }}
          />
          <ChevronDown size={11} className="opacity-60" />
        </button>
        {themeOpen && (
          <div className="absolute top-9 right-0 flex flex-col rounded-xl bg-popover/95 backdrop-blur-xl border border-white/10 p-1 shadow-lg min-w-[120px]">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  p.onSetTheme(t.id);
                  setThemeOpen(false);
                }}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium transition text-left ${
                  p.theme === t.id ? "bg-foreground/10" : "hover:bg-foreground/5"
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-foreground/20"
                  style={{ background: t.swatch }}
                />
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Sep />

      <Btn onClick={p.onExport} icon={<Download size={14} />} label="Save" />
      <Btn
        onClick={() => importRef.current?.click()}
        icon={<Upload size={14} />}
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
        className="h-7 rounded-full px-2 text-[10px] tabular-nums font-medium hover:bg-foreground/10 transition"
      >
        {Math.round(p.zoom * 100)}%
      </button>

      <button
        onClick={p.onClear}
        title="Clear board"
        className="h-7 w-7 rounded-full flex items-center justify-center text-foreground/60 hover:text-destructive hover:bg-destructive/10 transition"
      >
        <Trash size={13} />
      </button>
    </div>
  );
}

function Sep() {
  return <div className="h-4 w-px bg-foreground/15 mx-1" />;
}

function Btn({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center gap-1.5 h-7 rounded-full px-2.5 text-[11px] font-medium hover:bg-foreground/10 transition"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
