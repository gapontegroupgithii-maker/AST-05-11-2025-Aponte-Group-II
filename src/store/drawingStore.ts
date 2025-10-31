import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LineStyle } from 'lightweight-charts';

export interface IDrawingPoint {
  time: number;
  price: number;
  x: number;
  y: number;
}

export interface IDrawingOptions {
  color: string;
  lineWidth: number;
  lineStyle: LineStyle;
  draggable: boolean;
  snapToPrice: boolean;
  text?: string;
  levels?: number[];
  fillColor?: string;
  borderColor?: string;
  showPercent?: boolean;
  showBars?: boolean;
  showVolume?: boolean;
  // position for floating boxes (like ruler info box) in pixels within the SVG overlay
  boxPosition?: { x: number; y: number } | null;
}

export interface IDrawing {
  id: string;
  type: 'select' | 'trendline' | 'horizontal' | 'vertical' | 'ruler' | 'rectangle' | 'circle' | 'fibonacci' | 'text' | 'draw' | 'eraser';
  points: IDrawingPoint[];
  options: IDrawingOptions;
  visible: boolean;
  selected: boolean;
}

interface DrawingStore {
  activeTool: string | null;
  drawings: IDrawing[];
  selectedDrawingId: string | null;
  clickCounts: Record<string, number>;
  dragState: {
    isDragging: boolean;
    drawingId: string | null;
    handleIndex: number | null;
  };
  setActiveTool: (tool: string | null) => void;
  addDrawing: (drawing: IDrawing) => void;
  updateDrawing: (id: string, updates: Partial<IDrawing>) => void;
  removeDrawing: (id: string) => void;
  toggleVisibility: (id: string) => void;
  selectDrawing: (id: string) => void;
  deselectDrawing: () => void;
  clearDrawings: () => void;
  setDragState: (state: Partial<DrawingStore['dragState']>) => void;
  incrementClickCount: (id: string) => number;
  resetClickCount: (id: string) => void;
}

export const useDrawingStore = create<DrawingStore>()(persist((set) => ({
  activeTool: null,
  drawings: [],
  selectedDrawingId: null,
  clickCounts: {},
  dragState: {
    isDragging: false,
    drawingId: null,
    handleIndex: null,
  },
  setActiveTool: (tool) => set({ activeTool: tool }),
  addDrawing: (drawing) => set((state) => ({ 
    drawings: [...state.drawings, drawing],
    activeTool: null // Auto-deselect tool after drawing
  })),
  updateDrawing: (id, updates) => set((state) => ({
    drawings: state.drawings.map(d => d.id === id ? { ...d, ...updates } : d)
  })),
  removeDrawing: (id) => set((state) => ({
    drawings: state.drawings.filter(d => d.id !== id)
  })),
  toggleVisibility: (id) => set((state) => ({
    drawings: state.drawings.map(d => d.id === id ? { ...d, visible: !d.visible } : d)
  })),
  selectDrawing: (id) => set((state) => ({
    drawings: state.drawings.map(d => ({ ...d, selected: d.id === id })),
    selectedDrawingId: id
  })),
  deselectDrawing: () => set((state) => ({
    drawings: state.drawings.map(d => ({ ...d, selected: false })),
    selectedDrawingId: null
  })),
  clearDrawings: () => set({ drawings: [] }),
  setDragState: (newState) => set((state) => ({
    dragState: { ...state.dragState, ...newState }
  }))
  ,
  incrementClickCount: (id) => {
    let newCount = 1;
    set((state) => {
      const prev = state.clickCounts[id] ?? 0;
      newCount = prev + 1;
      return { clickCounts: { ...state.clickCounts, [id]: newCount } };
    });
    return newCount;
  },
  resetClickCount: (id) => set((state) => ({ clickCounts: { ...state.clickCounts, [id]: 0 } }))
}), {
  name: 'drawing-store',
  // only persist activeTool to localStorage
  partialize: (state) => ({ activeTool: state.activeTool }),
}));
