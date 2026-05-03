import { useEffect, useRef, useState } from "react";
import { STRING_COLORS, colorVar, type Stroke, type StringColor } from "@/lib/softboard-types";
import { Eraser, Pen, Undo2 } from "lucide-react";

interface Props {
  width: number;
  height: number;
  strokes: Stroke[];
  onChange: (strokes: Stroke[]) => void;
  zoom: number;
}

export function SketchCanvas({ width, height, strokes, onChange, zoom }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<Stroke | null>(null);
  const [color, setColor] = useState<StringColor>("red");
  const [width$, setWidth$] = useState(2.5);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  // Keep latest in ref to avoid stale closures
  const drawingRef = useRef<Stroke | null>(null);
  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  const localPoint = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = localPoint(e);
    if (tool === "eraser") {
      eraseAt(p.x, p.y);
      return;
    }
    setDrawing({ color, width: width$, points: [p.x, p.y] });
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    const p = localPoint(e);
    if (tool === "eraser") {
      eraseAt(p.x, p.y);
      return;
    }
    setDrawing((d) => (d ? { ...d, points: [...d.points, p.x, p.y] } : d));
  };
  const onUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    const d = drawingRef.current;
    if (d && d.points.length >= 4) onChange([...strokes, d]);
    setDrawing(null);
  };

  const eraseAt = (x: number, y: number) => {
    const r = 14;
    const next = strokes.filter((s) => {
      for (let i = 0; i < s.points.length; i += 2) {
        const dx = s.points[i] - x;
        const dy = s.points[i + 1] - y;
        if (dx * dx + dy * dy < r * r) return false;
      }
      return true;
    });
    if (next.length !== strokes.length) onChange(next);
  };

  const undo = () => onChange(strokes.slice(0, -1));

  const renderPath = (s: Stroke, key: string | number) => {
    if (s.points.length < 2) return null;
    let d = `M ${s.points[0]} ${s.points[1]}`;
    for (let i = 2; i < s.points.length; i += 2) d += ` L ${s.points[i]} ${s.points[i + 1]}`;
    return (
      <path
        key={key}
        d={d}
        stroke={colorVar(s.color)}
        strokeWidth={s.width}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  return (
    <div className="relative w-full h-full">
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full touch-none"
        style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {strokes.map((s, i) => renderPath(s, i))}
        {drawing && renderPath(drawing, "live")}
      </svg>
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 h-7 rounded-full bg-popover/90 backdrop-blur-xl border border-white/10 px-1.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setTool("pen")}
          className={`h-5 w-5 rounded-full flex items-center justify-center ${tool === "pen" ? "bg-foreground text-background" : ""}`}
          title="Pen"
        >
          <Pen size={11} />
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`h-5 w-5 rounded-full flex items-center justify-center ${tool === "eraser" ? "bg-foreground text-background" : ""}`}
          title="Eraser"
        >
          <Eraser size={11} />
        </button>
        <div className="w-px h-3 bg-foreground/20 mx-0.5" />
        {STRING_COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setColor(c.id);
              setTool("pen");
            }}
            title={c.label}
            className={`h-3.5 w-3.5 rounded-full ring-2 ${color === c.id ? "ring-foreground" : "ring-transparent"}`}
            style={{ background: colorVar(c.id) }}
          />
        ))}
        <div className="w-px h-3 bg-foreground/20 mx-0.5" />
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={width$}
          onChange={(e) => setWidth$(parseFloat(e.target.value))}
          className="w-14 accent-foreground"
          title="Stroke width"
        />
        <button onClick={undo} className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-foreground/10" title="Undo">
          <Undo2 size={11} />
        </button>
      </div>
    </div>
  );
}
