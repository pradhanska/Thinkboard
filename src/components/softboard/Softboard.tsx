import { useEffect, useRef, useState, useCallback } from "react";
import {
  DEFAULT_STATE,
  colorVar,
  type BoardItem,
  type Connection,
  type ItemKind,
  type SoftboardState,
  type StringColor,
  type ThemeName,
} from "@/lib/softboard-types";
import {
  exportToFile,
  fileToDataUrl,
  importFromFile,
  loadState,
  saveState,
} from "@/lib/softboard-storage";
import { BoardItemView } from "./BoardItem";
import { Toolbar } from "./Toolbar";
import { ThreadControls } from "./ThreadControls";
import { toast } from "sonner";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function Softboard() {
  const [state, setState] = useState<SoftboardState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [activeStringColor, setActiveStringColor] = useState<StringColor>("red");
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [selectedConn, setSelectedConn] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);

  // hydrate
  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // autosave
  useEffect(() => {
    if (!hydrated) return;
    saveState(state);
  }, [state, hydrated]);

  // theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-cork", "theme-white", "theme-cyber");
    root.classList.add(`theme-${state.theme}`);
  }, [state.theme]);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return { x: sx, y: sy };
      return {
        x: (sx - rect.left - state.pan.x) / state.zoom,
        y: (sy - rect.top - state.pan.y) / state.zoom,
      };
    },
    [state.pan, state.zoom]
  );

  // Pan/zoom handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    setSelectedConn(null);
    if (connectMode) {
      // Clicking empty board in connect mode resets the in-progress connection.
      setConnectFrom(null);
      return;
    }
    if (e.button === 1 || e.button === 2 || e.shiftKey || e.button === 0) {
      isPanning.current = true;
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: state.pan.x,
        panY: state.pan.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (connectMode && connectFrom) {
      setCursorWorld(screenToWorld(e.clientX, e.clientY));
    }
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setState((s) => ({
      ...s,
      pan: { x: panStart.current.panX + dx, y: panStart.current.panY + dy },
    }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    isPanning.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setState((s) => {
      const zoom = Math.max(0.25, Math.min(2.5, s.zoom * (1 + delta)));
      return { ...s, zoom };
    });
  };

  // Item ops
  const addItem = useCallback(
    (partial: Partial<BoardItem> & { kind: ItemKind }) => {
      const rect = boardRef.current?.getBoundingClientRect();
      const cx = rect ? rect.width / 2 : 400;
      const cy = rect ? rect.height / 2 : 300;
      const world = screenToWorld(cx + (Math.random() - 0.5) * 80, cy + (Math.random() - 0.5) * 80);
      const item: BoardItem = {
        id: uid(),
        x: world.x - 110,
        y: world.y - 80,
        w: 220,
        h: 160,
        rotation: (Math.random() - 0.5) * 6,
        ...partial,
      };
      setState((s) => ({ ...s, items: [...s.items, item] }));
    },
    [screenToWorld]
  );

  const updateItem = useCallback((id: string, patch: Partial<BoardItem>) => {
    setState((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      items: s.items.filter((it) => it.id !== id),
      connections: s.connections.filter((c) => c.from !== id && c.to !== id),
    }));
  }, []);

  const handleItemClickConnect = useCallback(
    (id: string) => {
      if (!connectMode) return;
      if (!connectFrom) {
        setConnectFrom(id);
        return;
      }
      if (connectFrom === id) {
        setConnectFrom(null);
        return;
      }
      const conn: Connection = {
        id: uid(),
        from: connectFrom,
        to: id,
        color: activeStringColor,
      };
      setState((s) => ({ ...s, connections: [...s.connections, conn] }));
      setConnectFrom(null);
    },
    [connectMode, connectFrom, activeStringColor]
  );

  // File adders
  const onAddNote = () =>
    addItem({
      kind: "note",
      text: "New note...",
      w: 200,
      h: 180,
    });

  const onAddFiles = async (files: FileList | null, forcedKind?: ItemKind) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file);
      let kind: ItemKind = forcedKind ?? "document";
      if (!forcedKind) {
        if (file.type.startsWith("image/")) kind = "image";
        else if (file.type.startsWith("audio/")) kind = "audio";
        else kind = "document";
      }
      addItem({
        kind,
        dataUrl,
        fileName: file.name,
        mimeType: file.type,
        w: kind === "image" ? 260 : 220,
        h: kind === "image" ? 220 : kind === "audio" ? 110 : 140,
      });
    }
  };

  // Save / Load file
  const onExport = () => {
    exportToFile(state);
    toast.success("Softboard exported");
  };
  const onImport = async (file: File) => {
    try {
      const next = await importFromFile(file);
      setState(next);
      toast.success("Softboard loaded");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to load file");
    }
  };
  const onClear = () => {
    if (!confirm("Clear the entire board? This cannot be undone.")) return;
    setState((s) => ({ ...DEFAULT_STATE, theme: s.theme }));
  };

  // Re-render connections when items move (via measured DOM rects)
  useEffect(() => {
    const id = requestAnimationFrame(rerender);
    return () => cancelAnimationFrame(id);
  }, [state.items, state.pan, state.zoom, state.connections, rerender]);

  // Compute world bounds for SVG layer
  const items = state.items;
  const bounds = items.reduce(
    (acc, it) => ({
      minX: Math.min(acc.minX, it.x - 200),
      minY: Math.min(acc.minY, it.y - 200),
      maxX: Math.max(acc.maxX, it.x + it.w + 200),
      maxY: Math.max(acc.maxY, it.y + it.h + 200),
    }),
    { minX: -2000, minY: -2000, maxX: 2000, maxY: 2000 }
  );
  const svgW = bounds.maxX - bounds.minX;
  const svgH = bounds.maxY - bounds.minY;

  // Anchor at the actual pin head — accounts for the card's rotation,
  // since the pin is positioned at top-center of the rotated card.
  const pinAnchor = (it: BoardItem) => {
    const cx = it.x + it.w / 2;
    const cy = it.y + it.h / 2;
    // Pin sits 10px above the top edge, centered horizontally.
    // Local offset from card center, before rotation:
    const lx = 0;
    const ly = -(it.h / 2) - 10;
    const rad = ((it.rotation ?? 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: cx + lx * cos - ly * sin,
      y: cy + lx * sin + ly * cos,
    };
  };

  const onSetTheme = (t: ThemeName) => setState((s) => ({ ...s, theme: t }));
  const onAddSketch = () =>
    addItem({ kind: "sketch", w: 320, h: 240, strokes: [] });

  const updateConnection = (id: string, patch: Partial<Connection>) =>
    setState((s) => ({
      ...s,
      connections: s.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  const deleteConnection = (id: string) => {
    setState((s) => ({ ...s, connections: s.connections.filter((c) => c.id !== id) }));
    setSelectedConn(null);
  };

  const selected = state.connections.find((c) => c.id === selectedConn) ?? null;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Toolbar
        theme={state.theme}
        onSetTheme={onSetTheme}
        onAddNote={onAddNote}
        onAddImage={() => pickFiles("image/*", (fl) => onAddFiles(fl, "image"))}
        onAddAudio={() => pickFiles("audio/*", (fl) => onAddFiles(fl, "audio"))}
        onAddDocument={() => pickFiles("*/*", (fl) => onAddFiles(fl, "document"))}
        onAddSketch={onAddSketch}
        onExport={onExport}
        onImport={(f) => onImport(f)}
        onClear={onClear}
        connectMode={connectMode}
        onToggleConnect={() => {
          setConnectMode((v) => !v);
          setConnectFrom(null);
        }}
        activeStringColor={activeStringColor}
        onSetStringColor={setActiveStringColor}
        zoom={state.zoom}
        onZoomReset={() => setState((s) => ({ ...s, zoom: 1, pan: { x: 0, y: 0 } }))}
        itemCount={state.items.length}
      />

      {selected && (
        <ThreadControls
          conn={selected}
          onChange={(patch) => updateConnection(selected.id, patch)}
          onDelete={() => deleteConnection(selected.id)}
          onClose={() => setSelectedConn(null)}
        />
      )}

      <div
        ref={boardRef}
        className="board-surface absolute inset-0 cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          style={{
            transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {/* SVG connections layer */}
          <svg
            style={{
              position: "absolute",
              left: bounds.minX,
              top: bounds.minY,
              width: svgW,
              height: svgH,
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {state.connections.map((c) => {
              const a = state.items.find((i) => i.id === c.from);
              const b = state.items.find((i) => i.id === c.to);
              if (!a || !b) return null;
              const pa = pinAnchor(a);
              const pb = pinAnchor(b);
              const x1 = pa.x - bounds.minX;
              const y1 = pa.y - bounds.minY;
              const x2 = pb.x - bounds.minX;
              const y2 = pb.y - bounds.minY;
              const dist = Math.hypot(x2 - x1, y2 - y1);
              const themeSag =
                state.theme === "cork" ? 0.18 : state.theme === "white" ? 0.04 : 0;
              const sagFactor = c.sag ?? themeSag;
              const sag = Math.min(140, dist * sagFactor);
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2 + sag;
              const isSel = selectedConn === c.id;
              const stroke = colorVar(c.color);
              const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
              const baseW = isSel ? 5 : 3;
              const onClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                setSelectedConn(c.id);
              };
              return (
                <g key={c.id} style={{ pointerEvents: "auto", color: stroke }}>
                  {state.theme === "cork" && (
                    <>
                      <path
                        className="connection-string-base"
                        d={d}
                        stroke={stroke}
                        strokeWidth={baseW + 1.5}
                        fill="none"
                        strokeLinecap="round"
                        opacity={0.9}
                      />
                      <path
                        className="connection-string"
                        d={d}
                        stroke={stroke}
                        strokeWidth={baseW}
                        fill="none"
                        style={{ cursor: "pointer" }}
                        onClick={onClick}
                      />
                    </>
                  )}
                  {state.theme === "white" && (
                    <path
                      className="connection-string"
                      d={d}
                      stroke={stroke}
                      strokeWidth={baseW + 0.5}
                      fill="none"
                      style={{ cursor: "pointer" }}
                      onClick={onClick}
                    />
                  )}
                  {state.theme === "cyber" && (
                    <>
                      <path
                        className="connection-string"
                        d={d}
                        stroke={stroke}
                        strokeWidth={baseW + 1}
                        fill="none"
                        opacity={0.9}
                        style={{ cursor: "pointer" }}
                        onClick={onClick}
                      />
                      <path
                        className="connection-string-core"
                        d={d}
                        strokeWidth={1.2}
                        fill="none"
                        style={{ pointerEvents: "none" }}
                      />
                    </>
                  )}
                  {isSel && (
                    <g
                      transform={`translate(${mx}, ${my - 18})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setState((s) => ({
                          ...s,
                          connections: s.connections.filter((x) => x.id !== c.id),
                        }));
                        setSelectedConn(null);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <circle r={11} fill="var(--destructive)" />
                      <text
                        textAnchor="middle"
                        dy="4"
                        fontSize="14"
                        fill="var(--destructive-foreground)"
                        style={{ userSelect: "none" }}
                      >
                        ×
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Items */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {state.items.map((it) => (
              <div key={it.id} style={{ pointerEvents: "auto" }}>
                <BoardItemView
                  item={it}
                  zoom={state.zoom}
                  onUpdate={(p) => updateItem(it.id, p)}
                  onDelete={() => deleteItem(it.id)}
                  connectMode={connectMode}
                  isConnectFrom={connectFrom === it.id}
                  onConnectClick={() => handleItemClickConnect(it.id)}
                  registerRef={(el) => {
                    if (el) itemRefs.current.set(it.id, el);
                    else itemRefs.current.delete(it.id);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {hydrated && state.items.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="note-card max-w-md p-8 text-center" style={{ transform: "rotate(-2deg)" }}>
              <h2 className="handwritten text-3xl font-bold mb-2">Welcome to Softboard</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Pin notes, images, audio and documents. Connect ideas with colored strings.
              </p>
              <p className="text-xs text-muted-foreground">
                Drag the board to pan • Ctrl + scroll to zoom • Use the toolbar above
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function pickFiles(accept: string, cb: (files: FileList | null) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = true;
  input.onchange = () => cb(input.files);
  input.click();
}
