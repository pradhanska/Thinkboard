import { useEffect, useRef, useState } from "react";
import type { BoardItem, Stroke } from "@/lib/softboard-types";
import { Trash2, Link2, FileText, Music } from "lucide-react";
import pinRed from "@/assets/pin-red.png";
import { SketchCanvas } from "./SketchCanvas";

interface Props {
  item: BoardItem;
  zoom: number;
  onUpdate: (patch: Partial<BoardItem>) => void;
  onDelete: () => void;
  connectMode: boolean;
  isConnectFrom: boolean;
  onConnectClick: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}

export function BoardItemView({
  item,
  zoom,
  onUpdate,
  onDelete,
  connectMode,
  isConnectFrom,
  onConnectClick,
  registerRef,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ ox: number; oy: number; ix: number; iy: number; moved: boolean } | null>(null);
  const resizeRef = useRef<{ ox: number; oy: number; iw: number; ih: number } | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    registerRef(ref.current);
    return () => registerRef(null);
  }, [registerRef]);

  // CAPTURE phase: in connect mode, intercept BEFORE inner elements (textarea, audio, links)
  // can call stopPropagation. This makes connect work everywhere on the card.
  const onCaptureDown = (e: React.PointerEvent) => {
    if (!connectMode) return;
    e.stopPropagation();
    e.preventDefault();
    onConnectClick();
  };

  const onDragStart = (e: React.PointerEvent) => {
    if (connectMode) return; // handled in capture
    if (editing) return;
    if ((e.target as HTMLElement).dataset.role === "handle") return;
    e.stopPropagation();
    dragRef.current = {
      ox: e.clientX,
      oy: e.clientY,
      ix: item.x,
      iy: item.y,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (resizeRef.current) {
      const dx = (e.clientX - resizeRef.current.ox) / zoom;
      const dy = (e.clientY - resizeRef.current.oy) / zoom;
      onUpdate({
        w: Math.max(120, resizeRef.current.iw + dx),
        h: Math.max(80, resizeRef.current.ih + dy),
      });
      return;
    }
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.ox) / zoom;
    const dy = (e.clientY - dragRef.current.oy) / zoom;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragRef.current.moved = true;
    onUpdate({ x: dragRef.current.ix + dx, y: dragRef.current.iy + dy });
  };
  const onDragEnd = (e: React.PointerEvent) => {
    dragRef.current = null;
    resizeRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const onResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    resizeRef.current = { ox: e.clientX, oy: e.clientY, iw: item.w, ih: item.h };
    (e.currentTarget.parentElement as HTMLElement)?.setPointerCapture(e.pointerId);
  };

  const stopIfNotConnect = (e: React.PointerEvent) => {
    if (connectMode) return;
    e.stopPropagation();
  };

  return (
    <div
      ref={ref}
      className="note-card absolute group"
      style={{
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        transform: `rotate(${item.rotation ?? 0}deg)`,
        outline: isConnectFrom ? "3px dashed var(--primary)" : undefined,
        outlineOffset: isConnectFrom ? "4px" : undefined,
        cursor: connectMode ? "crosshair" : "grab",
      }}
      onPointerDownCapture={onCaptureDown}
      onPointerDown={onDragStart}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
    >
      {/* Pin */}
      <div
        className="pin absolute"
        style={{
          top: -10,
          left: "50%",
          transform: "translateX(-50%)",
          ["--pin-image" as string]: `url(${pinRed})`,
        }}
      />

      {/* Hover toolbar */}
      <div
        className="absolute -top-3 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        data-role="handle"
      >
        <button
          data-role="handle"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onConnectClick();
          }}
          className="rounded-full bg-primary text-primary-foreground p-1 shadow"
          title="Connect"
        >
          <Link2 size={12} />
        </button>
        <button
          data-role="handle"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-full bg-destructive text-destructive-foreground p-1 shadow"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Content */}
      <div
        className="h-full w-full overflow-hidden p-3 flex flex-col"
        style={{ pointerEvents: connectMode ? "none" : "auto" }}
      >
        {item.kind === "note" && (
          <textarea
            value={item.text ?? ""}
            onChange={(e) => onUpdate({ text: e.target.value })}
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
            onPointerDown={stopIfNotConnect}
            className="handwritten flex-1 resize-none bg-transparent outline-none text-lg leading-snug"
            placeholder="Type your note..."
          />
        )}

        {item.kind === "sketch" && (
          <div className="flex-1 w-full h-full" onPointerDown={stopIfNotConnect}>
            <SketchCanvas
              width={item.w}
              height={item.h}
              strokes={item.strokes ?? []}
              onChange={(strokes: Stroke[]) => onUpdate({ strokes })}
              zoom={zoom}
            />
          </div>
        )}

        {item.kind === "image" && item.dataUrl && (
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <img
              src={item.dataUrl}
              alt={item.fileName ?? "image"}
              draggable={false}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}

        {item.kind === "audio" && item.dataUrl && (
          <div className="flex-1 flex flex-col gap-2 justify-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Music size={14} />
              <span className="truncate">{item.fileName}</span>
            </div>
            <audio
              src={item.dataUrl}
              controls
              className="w-full"
              onPointerDown={stopIfNotConnect}
            />
          </div>
        )}

        {item.kind === "document" && item.dataUrl && (
          <a
            href={item.dataUrl}
            download={item.fileName}
            onPointerDown={stopIfNotConnect}
            onClick={(e) => {
              if (connectMode) e.preventDefault();
              else e.stopPropagation();
            }}
            className="flex-1 flex flex-col items-center justify-center gap-2 text-center hover:underline"
          >
            <FileText size={36} className="opacity-70" />
            <span className="text-xs font-medium break-all px-2">{item.fileName}</span>
            <span className="text-[10px] text-muted-foreground">Click to download</span>
          </a>
        )}

        {item.kind === "image" && !item.dataUrl && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        data-role="handle"
        onPointerDown={onResizeStart}
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-50 hover:opacity-100"
        style={{
          background:
            "linear-gradient(135deg, transparent 50%, var(--muted-foreground) 50%)",
        }}
      />
    </div>
  );
}

// Asset reference so the bundler keeps the pin image even if only used via CSS var.
export const PIN_RED_URL = pinRed;
