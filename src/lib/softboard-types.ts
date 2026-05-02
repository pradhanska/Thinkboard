export type ItemKind = "note" | "image" | "audio" | "document";

export type StringColor = "red" | "blue" | "green" | "yellow" | "white";

export interface BoardItem {
  id: string;
  kind: ItemKind;
  x: number;
  y: number;
  w: number;
  h: number;
  // note
  text?: string;
  color?: string; // note paper color tint (optional)
  // image / audio / document
  dataUrl?: string;
  fileName?: string;
  mimeType?: string;
  rotation?: number;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  color: StringColor;
}

export type ThemeName = "cork" | "white" | "cyber";

export interface SoftboardState {
  version: 1;
  theme: ThemeName;
  items: BoardItem[];
  connections: Connection[];
  pan: { x: number; y: number };
  zoom: number;
}

export const DEFAULT_STATE: SoftboardState = {
  version: 1,
  theme: "cork",
  items: [],
  connections: [],
  pan: { x: 0, y: 0 },
  zoom: 1,
};

export const STORAGE_KEY = "softboard.state.v1";

export const STRING_COLORS: { id: StringColor; label: string; varName: string }[] = [
  { id: "red", label: "Red", varName: "var(--string-red)" },
  { id: "blue", label: "Blue", varName: "var(--string-blue)" },
  { id: "green", label: "Green", varName: "var(--string-green)" },
  { id: "yellow", label: "Yellow", varName: "var(--string-yellow)" },
  { id: "white", label: "White", varName: "var(--string-white)" },
];

export function colorVar(c: StringColor): string {
  return `var(--string-${c})`;
}
