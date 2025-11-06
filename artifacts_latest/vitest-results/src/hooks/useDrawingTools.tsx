import { useState, useCallback, useEffect } from "react";
import { useDrawingStore } from '@/store/drawingStore';

export type DrawingTool = 
  | "select" 
  | "trendline" 
  | "horizontal" 
  | "vertical"
  | "ruler"
  | "cursor-arrow"
  | "cursor-cross"
  | "cursor-dot"
  | "rectangle"
  | "circle"
  | "fibonacci"
  | "text"
  | "draw"
  | "eraser";

export interface Drawing {
  id: string;
  tool: DrawingTool;
  points: { x: number; y: number; price?: number; time?: number }[];
  color: string;
  selected: boolean;
  measurements?: {
    price?: number;
    percent?: number;
    bars?: number;
  };
}

export const useDrawingTools = () => {
  // Use the global zustand store for the active tool so selection persists across reloads
  const storeActive = useDrawingStore(state => state.activeTool);
  const setStoreActive = useDrawingStore(state => state.setActiveTool);
  const [activeTool, setActiveTool] = useState<DrawingTool>( (storeActive as DrawingTool) ?? "select");

  // keep local hook state in sync with global store
  useEffect(() => {
    if ((storeActive as DrawingTool) && storeActive !== activeTool) {
      setActiveTool(storeActive as DrawingTool);
    }
  }, [storeActive, activeTool]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);

  const startDrawing = useCallback((x: number, y: number, price?: number, time?: number) => {
  if (activeTool === "select" || activeTool === "eraser") return;

    const newDrawing: Drawing = {
      id: `drawing-${Date.now()}`,
      tool: activeTool,
      points: [{ x, y, price, time }],
      color: "#3b82f6",
      selected: false,
    };

    setCurrentDrawing(newDrawing);
    setIsDrawing(true);
  }, [activeTool]);

  const updateDrawing = useCallback((x: number, y: number, price?: number, time?: number) => {
    if (!isDrawing || !currentDrawing) return;

    setCurrentDrawing({
      ...currentDrawing,
      points: [...currentDrawing.points.slice(0, 1), { x, y, price, time }],
    });
  }, [isDrawing, currentDrawing]);

  const finishDrawing = useCallback(() => {
    if (!currentDrawing || currentDrawing.points.length < 2) {
      setIsDrawing(false);
      setCurrentDrawing(null);
      return;
    }

    // Calculate measurements for ruler
    if (currentDrawing.tool === "ruler" && currentDrawing.points.length === 2) {
      const [p1, p2] = currentDrawing.points;
      const priceDiff = (p2.price || 0) - (p1.price || 0);
      const percentChange = ((priceDiff / (p1.price || 1)) * 100);
      const timeDiff = Math.abs((p2.time || 0) - (p1.time || 0));

      currentDrawing.measurements = {
        price: priceDiff,
        percent: percentChange,
        bars: Math.round(timeDiff / 86400), // Assuming daily bars
      };
    }

    setDrawings([...drawings, currentDrawing]);
    setIsDrawing(false);
    setCurrentDrawing(null);
  }, [currentDrawing, drawings]);

  const deleteDrawing = useCallback((id: string) => {
    setDrawings(drawings.filter(d => d.id !== id));
  }, [drawings]);

  const selectDrawing = useCallback((id: string) => {
    setDrawings(drawings.map(d => ({ ...d, selected: d.id === id })));
  }, [drawings]);

  const clearDrawings = useCallback(() => {
    setDrawings([]);
  }, []);

  // whenever consumer calls setActiveTool, sync both local and store
  const setActiveToolSynced = useCallback((tool: DrawingTool) => {
    setActiveTool(tool);
    setStoreActive(tool === 'select' ? null : (tool as unknown as string));
  }, [setStoreActive]);

  return {
    activeTool,
    setActiveTool: setActiveToolSynced,
    drawings: [...drawings, ...(currentDrawing ? [currentDrawing] : [])],
    isDrawing,
    startDrawing,
    updateDrawing,
    finishDrawing,
    deleteDrawing,
    selectDrawing,
    clearDrawings,
  };
};
