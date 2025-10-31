import { useRef, useEffect, useCallback, useState } from 'react';
import { IChartApi, ISeriesApi, MouseEventParams } from 'lightweight-charts';
import { useDrawingStore } from '@/store/drawingStore';
import { coordinateToPoint } from '@/utils/snapUtils';
import { calculateMeasurements } from '@/utils/drawingPrimitives';
import {
  createTrendLineDrawing,
  createHorizontalLineDrawing,
  createRulerDrawing,
  createFibonacciDrawing,
  createRectangleDrawing,
  createCircleDrawing,
  createVerticalDrawing,
  createTextDrawing,
  createDrawDrawing,
} from '@/utils/drawingPrimitives';

export const useAdvancedDrawing = (
  chart: IChartApi | null,
  series: ISeriesApi<"Candlestick"> | null,
  containerRef: React.RefObject<HTMLElement> | null,
  timeframe: string = '1D'
) => {
  const { activeTool, addDrawing, setActiveTool, dragState, setDragState } = useDrawingStore();
  const { incrementClickCount, resetClickCount, selectDrawing, removeDrawing } = useDrawingStore();
  const startPointRef = useRef<{ time: number; price: number; x: number; y: number } | null>(null);
  const drawPointsRef = useRef<Array<{ time: number; price: number; x: number; y: number }> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewDrawing, setPreviewDrawing] = useState<any>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!chart || !series || !activeTool) return;

  // ignore pointer events for cursor-only tools (they shouldn't start drawings)
  if (typeof activeTool === 'string' && activeTool.startsWith('cursor')) return;
  // ruler is handled by ChartDrawingLayer to preserve TV-style interactions
  if (activeTool === 'ruler') return;

    const rect = (containerRef && containerRef.current)
      ? containerRef.current.getBoundingClientRect()
      : e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const point = coordinateToPoint(x, y, chart, series);

    // Freehand drawing: press -> drag -> release
    if (activeTool === 'draw') {
      drawPointsRef.current = [point];
      setDragState({ isDragging: true });
      setPreviewDrawing({ tool: 'draw', points: drawPointsRef.current });
      return;
    }

    // If eraser is active, clicking on canvas does nothing here; deletion handled via onDrawingClick
    if (activeTool === 'eraser' || activeTool === 'select') return;

    // Click-click behavior for other tools: first click sets start, second click finalizes
    if (!startPointRef.current) {
      startPointRef.current = point;
      setDragState({ isDragging: true });
      setPreviewDrawing(null);
      return;
    }

    // If start already exists, this click is the end point -> finalize
    const endPoint = point;

    // Create drawing based on tool
    let drawing;
    switch (activeTool) {
      case 'trendline':
        drawing = createTrendLineDrawing(startPointRef.current, endPoint);
        break;
      case 'horizontal':
        drawing = createHorizontalLineDrawing(startPointRef.current);
        break;
      case 'vertical':
        // vertical uses a single point (x/time)
        drawing = createVerticalDrawing(startPointRef.current, endPoint);
        break;
      case 'ruler':
        drawing = createRulerDrawing(startPointRef.current, endPoint);
        break;
      case 'fibonacci':
        drawing = createFibonacciDrawing(startPointRef.current, endPoint);
        break;
      case 'rectangle':
        drawing = createRectangleDrawing(startPointRef.current, endPoint);
        break;
      case 'circle':
        drawing = createCircleDrawing(startPointRef.current, endPoint);
        break;
      case 'text':
        drawing = createTextDrawing(endPoint);
        break;
      default:
        break;
    }

    if (drawing) {
      addDrawing(drawing);
    }

    // Reset state
    startPointRef.current = null;
    setPreviewDrawing(null);
    setDragState({ isDragging: false });
  }, [chart, series, activeTool, setDragState, addDrawing, containerRef]);

  // Clear any in-progress preview/start when switching to a non-drawing tool
  useEffect(() => {
    const drawingTools = new Set(['trendline','horizontal','vertical','ruler','fibonacci','rectangle','circle','text','draw']);
    if (!activeTool || !drawingTools.has(activeTool as string)) {
      // reset transient state
      startPointRef.current = null;
      drawPointsRef.current = null;
      setPreviewDrawing(null);
      setDragState({ isDragging: false });
    }
  }, [activeTool, setDragState]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!chart || !series) return;

    const rect = (containerRef && containerRef.current)
      ? containerRef.current.getBoundingClientRect()
      : e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const endPoint = coordinateToPoint(x, y, chart, series);

  // If ruler is active, ChartDrawingLayer handles preview/movement
  if (activeTool === 'ruler') return;

  // Freehand drawing move
    if (activeTool === 'draw' && drawPointsRef.current && drawPointsRef.current.length > 0) {
      // avoid adding too many points: check last point distance
      const last = drawPointsRef.current[drawPointsRef.current.length - 1];
      const dx = Math.abs(last.x - endPoint.x);
      const dy = Math.abs(last.y - endPoint.y);
      if (dx + dy > 2) {
        drawPointsRef.current.push(endPoint);
      }
      setPreviewDrawing({ tool: 'draw', points: drawPointsRef.current });
      return;
    }

    if (!startPointRef.current) return;

    // Update preview (stateful) for click-click tools
    let measurements;
    if (activeTool === 'ruler' && startPointRef.current && endPoint) {
      try {
        // use shared util to calculate measurements consistently
  // narrow types for the util (store points use same shape)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  measurements = calculateMeasurements(startPointRef.current as any, endPoint as any);
      } catch (err) {
        measurements = undefined;
      }
    }

    setPreviewDrawing({ start: startPointRef.current, end: endPoint, measurements });
  }, [chart, series, activeTool, containerRef]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // finalize freehand drawing
    if (activeTool === 'draw' && drawPointsRef.current && drawPointsRef.current.length > 0) {
      try {
        const drawing = createDrawDrawing(drawPointsRef.current);
        addDrawing(drawing);
      } catch (err) {
        // ignore
      }
      drawPointsRef.current = null;
      setPreviewDrawing(null);
      setDragState({ isDragging: false });
      return;
    }

    // ChartDrawingLayer handles ruler finalization; ignore here to avoid duplication
    if (activeTool === 'ruler') return;

    // inert for other click-click tools: finalization handled on second mousedown
    return;
  }, [activeTool, addDrawing, setDragState, chart, series, containerRef]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Keyboard shortcuts
    if (e.altKey && e.key === 't') {
      e.preventDefault();
      setActiveTool('trendline');
    } else if (e.altKey && e.key === 'h') {
      e.preventDefault();
      setActiveTool('horizontal');
    } else if (e.altKey && e.key === 'f') {
      e.preventDefault();
      setActiveTool('fibonacci');
    } else if (e.key === 'Escape') {
      setActiveTool(null);
      setDragState({ isDragging: false });
      startPointRef.current = null;
    }
  }, [setActiveTool, setDragState]);

  // Handler for clicks on existing drawings: select on first click, delete on 3rd click
  const handleDrawingClick = useCallback((id: string) => {
    // If eraser is active, immediately remove
    if (activeTool === 'eraser') {
      removeDrawing(id);
      resetClickCount(id);
      return;
    }

    const count = incrementClickCount(id);
    if (count === 1) {
      selectDrawing(id);
      // reset after 2s so 3rd click must be quick
      setTimeout(() => resetClickCount(id), 2000);
    } else if (count >= 3) {
      removeDrawing(id);
      resetClickCount(id);
    }
  }, [incrementClickCount, resetClickCount, selectDrawing, removeDrawing, activeTool]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    // pointer equivalents for integrations that use PointerEvents
    handlePointerDown: (e: React.PointerEvent) => handleMouseDown(e as unknown as React.MouseEvent),
    handlePointerMove: (e: React.PointerEvent) => handleMouseMove(e as unknown as React.MouseEvent),
    handlePointerUp: (e: React.PointerEvent) => handleMouseUp(e as unknown as React.MouseEvent),
    isDrawing: dragState.isDragging,
    startPoint: startPointRef.current,
    previewDrawing,
    handleDrawingClick,
  };
};
