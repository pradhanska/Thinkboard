import { STRING_COLORS, colorVar, type Connection } from "@/lib/softboard-types";
import { Trash2, X } from "lucide-react";

interface Props {
  conn: Connection;
  onChange: (patch: Partial<Connection>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ThreadControls({ conn, onChange, onDelete, onClose }: Props) {
  const sag = conn.sag ?? 0.18;
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 h-10 rounded-full bg-popover/85 text-popover-foreground backdrop-blur-xl border border-white/10 px-2.5 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.4)]">
      <span className="text-[11px] font-medium opacity-70 px-1">Thread</span>
      <div className="flex items-center gap-1">
        {STRING_COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => onChange({ color: c.id })}
            title={c.label}
            className={`h-4 w-4 rounded-full ring-2 transition ${
              conn.color === c.id ? "ring-foreground scale-110" : "ring-transparent"
            }`}
            style={{ background: colorVar(c.id) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[10px] opacity-60">Tension</span>
        <input
          type="range"
          min={0}
          max={0.6}
          step={0.02}
          value={sag}
          onChange={(e) => onChange({ sag: parseFloat(e.target.value) })}
          className="w-24 accent-foreground"
        />
      </div>
      <button
        onClick={onDelete}
        className="h-7 w-7 rounded-full flex items-center justify-center text-foreground/70 hover:text-destructive hover:bg-destructive/10"
        title="Delete thread"
      >
        <Trash2 size={13} />
      </button>
      <button
        onClick={onClose}
        className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-foreground/10"
        title="Close"
      >
        <X size={13} />
      </button>
    </div>
  );
}
