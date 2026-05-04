"use client";

import { useEffect, useCallback } from "react";
import { useCaseBoardStore } from "@/lib/caseboard-store";
import { Canvas } from "./canvas";
import { Toolbar } from "./toolbar";
import { motion, AnimatePresence } from "framer-motion";

export function CaseBoard() {
  const { theme, loadFromDB, exportToFile, importFromFile, clearBoard } =
    useCaseBoardStore();

  // Load from IndexedDB on mount
  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  // Handle file import
  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".caseboard,.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          importFromFile(data);
        } catch {
          alert("Invalid file format");
        }
      }
    };
    input.click();
  }, [importFromFile]);

  // Handle file export
  const handleExport = useCallback(async () => {
    const data = await exportToFile();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `caseboard-${Date.now()}.caseboard`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportToFile]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save/export
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleExport();
      }
      // Ctrl/Cmd + O to open/import
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        handleImport();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExport, handleImport]);

  // Theme classes
  const themeClasses = {
    chalkboard: "bg-slate-900",
    whiteboard: "bg-gray-50",
    detective: "bg-amber-900",
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={theme}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`relative h-screen w-screen overflow-hidden ${themeClasses[theme]}`}
      >
        {/* Theme-specific background patterns */}
        {theme === "chalkboard" && (
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
              }}
            />
          </div>
        )}

        {theme === "whiteboard" && (
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
                `,
                backgroundSize: "20px 20px",
              }}
            />
          </div>
        )}

        {theme === "detective" && (
          <div className="pointer-events-none absolute inset-0">
            <div
              className="h-full w-full opacity-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>
        )}

        <Canvas />
        <Toolbar
          onImport={handleImport}
          onExport={handleExport}
          onClear={clearBoard}
        />

        {/* Status indicator */}
        <div
          className={`absolute bottom-4 left-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
            theme === "chalkboard"
              ? "bg-slate-800 text-slate-400"
              : theme === "whiteboard"
                ? "bg-white text-gray-500 shadow-sm"
                : "bg-amber-800 text-amber-200"
          }`}
        >
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          Auto-saving enabled
        </div>

        {/* Keyboard shortcuts hint */}
        <div
          className={`absolute bottom-4 right-4 flex items-center gap-4 rounded-lg px-3 py-2 text-xs ${
            theme === "chalkboard"
              ? "bg-slate-800 text-slate-500"
              : theme === "whiteboard"
                ? "bg-white text-gray-400 shadow-sm"
                : "bg-amber-800 text-amber-300"
          }`}
        >
          <span>
            <kbd className="rounded bg-current/10 px-1.5 py-0.5">Ctrl+S</kbd>{" "}
            Save
          </span>
          <span>
            <kbd className="rounded bg-current/10 px-1.5 py-0.5">Ctrl+O</kbd>{" "}
            Open
          </span>
          <span>
            <kbd className="rounded bg-current/10 px-1.5 py-0.5">Del</kbd>{" "}
            Delete
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
