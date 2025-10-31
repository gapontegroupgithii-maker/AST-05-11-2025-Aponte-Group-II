import React, { useRef, useEffect, useState, useCallback } from 'react';
import { coordinateToPoint } from '@/utils/snapUtils';
import { useDrawingStore } from '@/store/drawingStore';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { Drawing } from "@/hooks/useDrawingTools";

type Point = { x: number; y: number; price?: number };
type Measurements = { price: number; percent: number; bars: number };

interface PreviewDrawing {
  start: Point;
  end: Point;
  measurements?: Measurements;
  tool?: string;
  color?: string;
}

interface ChartDrawingLayerProps {
  drawings: Drawing[];
  activeTool: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onDrawingClick: (id: string) => void;
  previewDrawing?: PreviewDrawing | null;
  crosshair?: { x: number; y: number; time?: number | null; price?: number | null } | null;
  onUpdateDrawing?: (id: string, updates: Partial<Record<string, unknown>>) => void;
  containerRef?: React.RefObject<HTMLElement> | null;
  chartRef?: React.RefObject<IChartApi | null> | null;
  seriesRef?: React.RefObject<ISeriesApi<'Candlestick'> | null> | null;
  timeframe?: string;
  priceData?: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> | null;
}

const ChartDrawingLayer = ({
    drawings,
    activeTool,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onDrawingClick,
    onUpdateDrawing,
  previewDrawing = null,
  crosshair = null,
  containerRef = null,
    chartRef = null,
    seriesRef = null,
    timeframe = undefined,
    priceData = null,
  }: ChartDrawingLayerProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [precision, setPrecision] = useState<number>(2);
  const draggingBoxRef = useRef<{ id: string; offsetX: number; offsetY: number; pointerId: number } | null>(null);

  // Ruler TV-style state (two-clicks)
  const startPointRef = useRef<Point | null>(null);
  const currentPointRef = useRef<Point | null>(null);
  const isDrawingRef = useRef(false);
  const [rulerData, setRulerData] = useState<{ start: Point; end: Point } | null>(null);
  const [previewTick, setPreviewTick] = useState(0); // force re-render on mousemove during drawing

  // Floating cloud state
  const [cloudPos, setCloudPos] = useState<{ x: number; y: number } | null>(null);
  const [cloudVisible, setCloudVisible] = useState(false);
  const cloudDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  // (legacy note: previewDrawing may be provided by hook for other tools)

    const resolveIndex = (timeVal: number | undefined | null) => {
      if (!priceData || priceData.length === 0 || typeof timeVal !== 'number') return null;
      // Try as index
      const idx = Math.round(timeVal);
      if (idx >= 0 && idx < priceData.length) return idx;
      // Otherwise treat as timestamp (seconds) and find nearest
      let best = 0; let bestDiff = Infinity;
      for (let i = 0; i < priceData.length; i++) {
        const diff = Math.abs((priceData[i].time || 0) - timeVal);
        if (diff < bestDiff) { bestDiff = diff; best = i; }
      }
      return best;
    };

    const barsToTimeString = (bars: number) => {
      if (!timeframe) return `${bars} bars`;
      const tf = timeframe.toLowerCase();
      if (tf.endsWith('m')) {
        const m = parseInt(tf.replace('m','')) || 1;
        return `${bars * m}m`;
      }
      if (tf.endsWith('h')) {
        const h = parseInt(tf.replace('h','')) || 1;
        return `${bars * h * 60}m`;
      }
      if (tf === '1d' || tf === 'd') return `${bars}D`;
      return `${bars} bars`;
    };
  const cloudRef = useRef<HTMLDivElement | null>(null);
  const [cloudStylePos, setCloudStylePos] = useState<{ x: number; y: number } | null>(null);

    // helper to determine cloud colors based on measured price delta
    const getCloudColors = () => {
      let bg = 'rgba(30,136,229,0.9)';
      let stroke = 'rgba(30,136,229,0.95)';
      try {
        const s = rulerData ? rulerData.start : (previewDrawing?.start ?? null);
        const e = rulerData ? rulerData.end : (previewDrawing?.end ?? null);
        if (!s || !e) return { bg, stroke };
        if (chartRef && chartRef.current && seriesRef && seriesRef.current) {
          const sp = coordinateToPoint(s.x, s.y, chartRef.current, seriesRef.current);
          const ep = coordinateToPoint(e.x, e.y, chartRef.current, seriesRef.current);
          const pd = (ep.price ?? 0) - (sp.price ?? 0);
          if (pd < 0) {
            bg = 'rgba(236,72,153,0.95)';
            stroke = 'rgba(236,72,153,0.95)';
          }
        } else if (typeof (s as Point).price === 'number' && typeof (e as Point).price === 'number') {
          const pd = ((e as Point).price ?? 0) - ((s as Point).price ?? 0);
          if (pd < 0) {
            bg = 'rgba(236,72,153,0.95)';
            stroke = 'rgba(236,72,153,0.95)';
          }
        }
      } catch (err) {
        // ignore
      }
      return { bg, stroke };
    };

    // Compute adjusted cloud position so it doesn't sit on top of the ruler lines
    useEffect(() => {
      // Compute cloud style position based on previewDrawing or finalized rulerData
      const src = rulerData ? { start: rulerData.start, end: rulerData.end } : (previewDrawing ? { start: previewDrawing.start, end: previewDrawing.end } : null);
      if (!src || !src.start || !src.end || !cloudRef.current) {
        setCloudStylePos(null);
        return;
      }
      const cloudPosLocal = { x: Math.round((src.start.x + src.end.x) / 2), y: Math.round((src.start.y + src.end.y) / 2) };
      const container = containerRef && containerRef.current ? containerRef.current.getBoundingClientRect() : svgRef.current?.getBoundingClientRect();
      const cloudEl = cloudRef.current;
      if (!container || !cloudEl) {
        setCloudStylePos(cloudPosLocal);
        return;
      }

      const desiredAboveY = cloudPosLocal.y - 30;
      const desiredBelowY = cloudPosLocal.y + 30;
      const cloudRect = cloudEl.getBoundingClientRect();
      const candidateAbove = { x: cloudPosLocal.x, y: desiredAboveY - cloudRect.height / 2 };
      const candidateBelow = { x: cloudPosLocal.x, y: desiredBelowY - cloudRect.height / 2 };
      const fitsAbove = candidateAbove.y >= container.top && (candidateAbove.y + cloudRect.height) <= container.bottom;
      const fitsBelow = candidateBelow.y >= container.top && (candidateBelow.y + cloudRect.height) <= container.bottom;
      let chosen = candidateAbove;
      if (!fitsAbove && fitsBelow) chosen = candidateBelow;
      if (!fitsAbove && !fitsBelow) {
        const y = Math.max(container.top, Math.min(candidateAbove.y, container.bottom - cloudRect.height));
        chosen = { x: cloudPosLocal.x, y };
      }
      const left = Math.max(container.left + cloudRect.width / 2, Math.min(chosen.x, container.right - cloudRect.width / 2));
      setCloudStylePos({ x: left, y: chosen.y });
    }, [previewDrawing, rulerData, containerRef]);

  const setActiveTool = useDrawingStore(state => state.setActiveTool);

    const clearRuler = useCallback(() => {
      // Clear local TV-style ruler state and hide cloud.
      setRulerData(null);
      startPointRef.current = null;
      currentPointRef.current = null;
      isDrawingRef.current = false;
      setCloudVisible(false);
      setCloudPos(null);
      // After closing the ruler on the third click, switch to cursor-cross as requested
      try {
        if (typeof setActiveTool === 'function') setActiveTool('cursor-cross');
      } catch (err) { /* ignore */ }
    }, [setActiveTool]);

    // debug flag: enable by setting localStorage.setItem('debugDrawings', '1') in the browser console
    const debug = (() => {
      try { return typeof window !== 'undefined' && localStorage.getItem('debugDrawings') === '1'; } catch (err) { return false; }
    })();

  // listen to chart settings changes for precision and other visual tweaks
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem('chartSettings');
        if (raw) {
          const s = JSON.parse(raw);
          if (typeof s.precision === 'number') setPrecision(s.precision);
        }
      } catch (err) { /* ignore */ }
    };
    load();
    const handler = (ev: Event) => {
      try {
        // @ts-expect-error TS: CustomEvent typing used intentionally for settings payload
        const s = (ev as CustomEvent).detail;
        if (s && typeof s.precision === 'number') setPrecision(s.precision);
      } catch (err) { console.debug('[ChartDrawingLayer] ignored error in chartSettingsChange handler', err); }
    };
    window.addEventListener('chartSettingsChange', handler as EventListener);
    return () => { window.removeEventListener('chartSettingsChange', handler as EventListener); };
  }, []);

    const getCursorStyle = () => {
      switch (activeTool) {
        case "select": return "default";
        case "cursor-arrow": return "default";
        case "trendline":
        case "horizontal":
        case "ruler": return "crosshair";
        case "cursor-cross": return "crosshair";
        case "cursor-dot": return "crosshair";
        case "rectangle":
        case "circle": return "crosshair";
        case "text": return "text";
        case "draw": return "crosshair";
        case "eraser": return "pointer";
        default: return "default";
      }
    };

    const renderDrawing = (drawing: Drawing) => {
      const { id, tool, points, color, selected, measurements } = drawing;
      if (points.length < 1 && tool !== "text") return null;

      const strokeWidth = selected ? 3 : 2;
      const opacity = selected ? 1 : 0.8;

      // helper to render handles
      const renderHandles = () => selected ? points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />
      )) : null;

      switch (tool) {
        case 'trendline':
          return (
            <g key={id} onClick={() => onDrawingClick(id)}>
              <line x1={points[0].x} y1={points[0].y} x2={points[1]?.x || points[0].x} y2={points[1]?.y || points[0].y} stroke={color} strokeWidth={strokeWidth} opacity={opacity} style={{ cursor: 'pointer' }} />
              {renderHandles()}
            </g>
          );

        case 'horizontal':
          return (
            <g key={id} onClick={() => onDrawingClick(id)}>
              <line x1={0} y1={points[0].y} x2="100%" y2={points[0].y} stroke={color} strokeWidth={strokeWidth} opacity={opacity} strokeDasharray="5,5" style={{ cursor: 'pointer' }} />
              {points[0].price && <text x={10} y={points[0].y - 5} fill={color} fontSize="12" fontWeight="bold">{points[0].price.toFixed(2)}</text>}
              {renderHandles()}
            </g>
          );

        case 'ruler': {
          if (!points[1]) return null;
          const midX = (points[0].x + points[1].x) / 2;
          const midY = (points[0].y + points[1].y) / 2;
          const containerEl = containerRef && containerRef.current ? containerRef.current : svgRef.current;
          const containerWidth = containerEl ? containerEl.clientWidth : 800;
          const containerHeight = containerEl ? containerEl.clientHeight : 600;
          const boxW = 160; const boxH = 72; const margin = 8;
          // allow persisted box position from drawing.options.boxPosition (if user moved it)
          const optBoxPos = ((drawing as unknown) as { options?: { boxPosition?: { x: number; y: number } } })?.options?.boxPosition ?? null;
          let bx = optBoxPos?.x ?? (midX - boxW / 2);
          let by = optBoxPos?.y ?? (midY - boxH / 2);
          if (bx < margin) bx = margin;
          if (bx + boxW > containerWidth - margin) bx = containerWidth - boxW - margin;
          if (by < margin) by = margin;
          if (by + boxH > containerHeight - margin) by = containerHeight - boxH - margin;
          if (debug) {
            console.log('[draw-debug] renderDrawing ruler', { id, points, measurements, box: { bx, by, boxW, boxH }, containerWidth, containerHeight });
          }

          return (
            <g key={id} onClick={() => onDrawingClick(id)}>
              <line x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y} stroke={measurements?.price && measurements.price > 0 ? 'rgba(59,130,246,0.85)' : 'rgba(236,72,153,0.85)'} strokeWidth={strokeWidth} strokeDasharray="5,5" opacity={opacity} style={{ cursor: 'pointer' }} />
              {measurements && (
                <g>
                  {/* Transparent box with white border and central dashed cross - like TradingView */}
                  <rect x={bx} y={by} width={boxW} height={boxH} fill={'transparent'} stroke="#ffffff" strokeWidth={1} rx={8}
                    onPointerDown={(e) => {
                      // start dragging the floating box
                      e.stopPropagation();
                      const rect = containerRef && containerRef.current ? containerRef.current.getBoundingClientRect() : svgRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      const offsetX = e.clientX - rect.left - bx;
                      const offsetY = e.clientY - rect.top - by;
                      try { (e.target as Element).setPointerCapture(e.pointerId); } catch (err) { /* ignore pointer capture failures */ }
                      draggingBoxRef.current = { id, offsetX, offsetY, pointerId: e.pointerId };
                    }}
                  />
                  <line x1={bx + boxW / 2} y1={by} x2={bx + boxW / 2} y2={by + boxH} stroke="#ffffff" strokeWidth={1} strokeDasharray="4,4" />
                  <line x1={bx} y1={by + boxH / 2} x2={bx + boxW} y2={by + boxH / 2} stroke="#ffffff" strokeWidth={1} strokeDasharray="4,4" />
                  <text x={bx + boxW / 2} y={by + 20} fill="#ffffff" fontSize={14} textAnchor="middle" fontWeight={600}>{measurements.percent > 0 ? '+' : ''}{(measurements.percent || 0).toFixed(2)}%</text>
                  <text x={bx + boxW / 2} y={by + 38} fill="#ffffff" fontSize={12} textAnchor="middle" fontWeight={500}>{(measurements.bars ?? 0)} bars</text>
                  <text x={bx + boxW / 2} y={by + 56} fill="#ffffff" fontSize={12} textAnchor="middle" fontWeight={500}>{(measurements.price >= 0 ? '+' : '-')}${Math.abs(measurements.price ?? 0).toFixed(precision)}</text>
                </g>
              )}
              {renderHandles()}
            </g>
          );
        }

        case 'vertical':
          return (
            <g key={id} onClick={() => onDrawingClick(id)}>
              <line x1={points[0].x} y1={0} x2={points[0].x} y2={(containerRef && containerRef.current ? containerRef.current.clientHeight : (svgRef.current ? svgRef.current.clientHeight : 600))} stroke={color} strokeWidth={strokeWidth} strokeDasharray="5,5" opacity={opacity} style={{ cursor: 'pointer' }} />
              {points[0].price && <g><rect x={points[0].x + 6} y={10} width={100} height={28} fill="rgba(0,0,0,0.75)" rx={6} /><text x={points[0].x + 56} y={28} fill="#ffffff" fontSize={12} textAnchor="middle">{(points[0].price).toFixed(precision)}</text></g>}
            </g>
          );

        case 'rectangle': {
          const width = (points[1]?.x || points[0].x) - points[0].x;
          const height = (points[1]?.y || points[0].y) - points[0].y;
          return (
            <g key={id} onClick={() => onDrawingClick(id)}>
              <rect x={Math.min(points[0].x, points[1]?.x || points[0].x)} y={Math.min(points[0].y, points[1]?.y || points[0].y)} width={Math.abs(width)} height={Math.abs(height)} fill="rgba(59, 130, 246, 0.1)" stroke={color} strokeWidth={strokeWidth} opacity={opacity} style={{ cursor: 'move' }} />
            </g>
          );
        }

        case 'draw': {
          // freehand polyline
          const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
          return (
            <g key={id} onClick={() => onDrawingClick(id)}>
              <polyline points={pointsStr} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} style={{ cursor: 'move' }} />
            </g>
          );
        }

        case 'circle': {
          const radius = Math.sqrt(Math.pow((points[1]?.x || points[0].x) - points[0].x, 2) + Math.pow((points[1]?.y || points[0].y) - points[0].y, 2));
          return (
            <g key={id} onClick={() => onDrawingClick(id)}>
              <circle cx={points[0].x} cy={points[0].y} r={radius} fill="rgba(59, 130, 246, 0.1)" stroke={color} strokeWidth={strokeWidth} opacity={opacity} style={{ cursor: 'move' }} />
            </g>
          );
        }

        case 'fibonacci': {
          if (!points[1]) return null;
          const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const fibColors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981'];
          const yStart = points[0].y; const yEnd = points[1].y; const xStart = Math.min(points[0].x, points[1].x); const xEnd = Math.max(points[0].x, points[1].x);
          return (
            <g key={id} onClick={() => onDrawingClick(id)}>
              {fibLevels.map((level, idx) => {
                const y = yStart + (yEnd - yStart) * level;
                return (
                  <g key={idx}>
                    <line x1={xStart} y1={y} x2={xEnd} y2={y} stroke={fibColors[idx]} strokeWidth={1.5} strokeDasharray="4,4" opacity={0.8} />
                    <rect x={xEnd + 5} y={y - 9} width={50} height={18} fill="rgba(0,0,0,0.8)" stroke={fibColors[idx]} strokeWidth={1} rx={3} />
                    <text x={xEnd + 30} y={y + 4} fill={fibColors[idx]} fontSize={11} fontWeight="bold" textAnchor="middle">{(level * 100).toFixed(1)}%</text>
                  </g>
                );
              })}
            </g>
          );
        }

        default:
          return null;
      }
    };

    const renderPreview = (preview?: PreviewDrawing | null) => {
      if (!preview || !preview.start || !preview.end) return null;
      const { start, end, measurements } = preview;
      const midX = (start.x + end.x) / 2; const midY = (start.y + end.y) / 2;
    const boxW = 160; const boxH = 72;
    const containerEl = containerRef && containerRef.current ? containerRef.current : svgRef.current;
    const containerWidth = containerEl ? containerEl.clientWidth : 800; const containerHeight = containerEl ? containerEl.clientHeight : 600; const margin = 8;
      let bx = midX - boxW / 2; let by = midY - boxH / 2;
      if (bx < margin) bx = margin; if (bx + boxW > containerWidth - margin) bx = containerWidth - boxW - margin;
      if (by < margin) by = margin; if (by + boxH > containerHeight - margin) by = containerHeight - boxH - margin;

    // remove mixBlendMode because it can make SVG elements invisible over certain backdrops
    const rectStyle: React.CSSProperties = { pointerEvents: 'none' };

    if (debug) {
      console.log('[draw-debug] renderPreview called', { start, end, measurements });
    }

    const previewRectFill = debug ? 'rgba(255,0,255,0.10)' : 'transparent';
    const previewRectStroke = debug ? '#ffff00' : '#ffffff';
    const previewRectStrokeWidth = debug ? 2 : 1;

      return (
        <g key="preview">
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={measurements && measurements.price > 0 ? 'rgba(59,130,246,0.85)' : 'rgba(236,72,153,0.85)'} strokeWidth={2} strokeDasharray="5,5" opacity={0.9} />
          <rect x={bx} y={by} width={boxW} height={boxH} fill={previewRectFill} stroke={previewRectStroke} strokeWidth={previewRectStrokeWidth} rx={8} style={rectStyle} />
          <line x1={bx + boxW / 2} y1={by} x2={bx + boxW / 2} y2={by + boxH} stroke={previewRectStroke} strokeWidth={previewRectStrokeWidth} strokeDasharray="4,4" />
          <line x1={bx} y1={by + boxH / 2} x2={bx + boxW} y2={by + boxH / 2} stroke={previewRectStroke} strokeWidth={previewRectStrokeWidth} strokeDasharray="4,4" />
          <text x={bx + boxW / 2} y={by + 20} fill="#ffffff" fontSize={14} textAnchor="middle" fontWeight={600}>{measurements ? `${measurements.percent >= 0 ? '+' : ''}${(measurements.percent || 0).toFixed(2)}%` : ''}</text>
          <text x={bx + boxW / 2} y={by + 38} fill="#ffffff" fontSize={12} textAnchor="middle" fontWeight={500}>{measurements ? `${measurements.bars ?? 0} bars` : ''}</text>
          <text x={bx + boxW / 2} y={by + 56} fill="#ffffff" fontSize={12} textAnchor="middle" fontWeight={500}>{measurements ? `${measurements.price >= 0 ? '+' : '-'}$${Math.abs(measurements.price ?? 0).toFixed(precision)}` : ''}</text>
        </g>
      );
    };

    // DIAGNÓSTICO SEGURO Y MÍNIMO: imprime rects y estilos para ayudar a
    // identificar si el SVG overlay está siendo recortado por algún padre.
    useEffect(() => {
      const check = () => {
        const svg = document.querySelector('svg');
        const container = document.querySelector('div[style*="position: relative"], div[class*="chart"], div[id*="chart"]')?.closest('div') || document.body;
      
        if (svg && container) {
          const svgRect = svg.getBoundingClientRect();
          const contRect = container.getBoundingClientRect();
          const parentStyle = window.getComputedStyle(svg.parentElement!);

          console.log('%c[DIAGNÓSTICO RULER]', 'color: cyan; font-weight: bold;');
          console.log('SVG (overlay):', { width: Math.round(svgRect.width), height: Math.round(svgRect.height) });
          console.log('Contenedor padre:', { width: Math.round(contRect.width), height: Math.round(contRect.height) });
          console.log('¿SVG más pequeño que contenedor?', svgRect.width < contRect.width - 10 || svgRect.height < contRect.height - 10);
          console.log('Overflow del padre:', parentStyle.overflow, parentStyle.overflowX, parentStyle.overflowY);
          console.log('Transform del padre:', parentStyle.transform !== 'none' ? parentStyle.transform : 'ninguno');
          console.log('z-index del SVG:', parentStyle.zIndex);
        } else {
          console.warn('No se encontró SVG o contenedor. Intenta de nuevo.');
        }
      };

      const timer = setTimeout(check, 3000);
      return () => clearTimeout(timer);
    }, []);

    return (
      <>
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-auto"
        // force SVG to cover the whole parent container (diagnóstico / solución)
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
        }}
        onMouseDown={(e) => {
          // If the active tool is ruler, handle two-click logic here; otherwise forward
          if (activeTool === 'ruler') {
            const rect = containerRef && containerRef.current ? containerRef.current.getBoundingClientRect() : svgRef.current?.getBoundingClientRect();
            if (!rect) return;
            const px = e.clientX - rect.left; const py = e.clientY - rect.top;
            // Case A: not drawing and no finalized ruler -> start drawing (first click)
            if (!isDrawingRef.current && !rulerData) {
              startPointRef.current = { x: px, y: py };
              currentPointRef.current = { x: px, y: py };
              isDrawingRef.current = true;
              setCloudVisible(true);
              setCloudPos({ x: px, y: py });
              setPreviewTick(t => t + 1);
            }
            // Case B: currently drawing -> finalize (second click)
            else if (isDrawingRef.current) {
              const s = startPointRef.current!;
              const ept = { x: px, y: py };
              currentPointRef.current = ept;
              isDrawingRef.current = false;
              setRulerData({ start: s, end: ept });
              // place cloud at midpoint
              const mid = { x: Math.round((s.x + ept.x) / 2), y: Math.round((s.y + ept.y) / 2) };
              setCloudPos(mid);
              setCloudVisible(true);
              // persist via callback if provided
              if (onUpdateDrawing) {
                try {
                  const id = `ruler-${Date.now()}`;
                  let data: Record<string, unknown> = {};
                  try {
                    if (chartRef && chartRef.current && seriesRef && seriesRef.current) {
                      const sp = coordinateToPoint(s.x, s.y, chartRef.current, seriesRef.current);
                      const ep = coordinateToPoint(ept.x, ept.y, chartRef.current, seriesRef.current);
                      const priceDiff = (ep.price ?? 0) - (sp.price ?? 0);
                      const percent = (sp.price ? (priceDiff / Math.abs(sp.price) * 100) : 0);
                      let bars = Math.abs((ep.time ?? 0) - (sp.time ?? 0));
                      let timeString = `${bars} bars`;
                      let volume: number | null = null;
                      if (priceData && priceData.length > 0) {
                        const i0 = resolveIndex(sp.time as number);
                        const i1 = resolveIndex(ep.time as number);
                        if (i0 !== null && i1 !== null) {
                          const a = Math.min(i0, i1);
                          const b = Math.max(i0, i1);
                          bars = Math.abs(b - a);
                          timeString = barsToTimeString(bars);
                          volume = priceData.slice(a, b + 1).reduce((s, v) => s + (v.volume || 0), 0);
                        }
                      }
                      data = { priceDiff, percent, bars, timeString, volume, startPoint: sp, endPoint: ep };
                    }
                  } catch (err) {
                    data = { priceDiff: null, percent: null, bars: null, timeString: null, volume: null };
                  }
                  onUpdateDrawing(id, { type: 'ruler', start: s, end: ept, cloudPos: mid, data });
                } catch (err) {
                  // ignore
                }
              }
            }
            // Case C: not drawing and already have a finalized ruler -> third click: clear it
            else if (!isDrawingRef.current && rulerData) {
              clearRuler();
            }
            e.stopPropagation();
            return;
          }
          onMouseDown(e);
        }}
        onMouseMove={(e) => {
          // update cursor position for cursor modes
          if (activeTool && (activeTool === 'cursor-cross' || activeTool === 'cursor-dot' || activeTool === 'cursor-arrow')) {
            const rect = containerRef && containerRef.current ? containerRef.current.getBoundingClientRect() : svgRef.current?.getBoundingClientRect();
            if (rect) {
              const px = e.clientX - rect.left; const py = e.clientY - rect.top;
              setCursorPos({ x: px, y: py });
            }
          }
          // handle cloud dragging (preview) and live ruler update
          if (cloudDragRef.current) {
            const rect = containerRef && containerRef.current ? containerRef.current.getBoundingClientRect() : svgRef.current?.getBoundingClientRect();
            if (rect) {
              const nx = e.clientX - rect.left - cloudDragRef.current.offsetX;
              const ny = e.clientY - rect.top - cloudDragRef.current.offsetY;
              setCloudPos({ x: Math.max(0, nx), y: Math.max(0, ny) });
            }
          }

          // if drawing a ruler, update current point
          if (activeTool === 'ruler' && isDrawingRef.current && startPointRef.current) {
            const rect = containerRef && containerRef.current ? containerRef.current.getBoundingClientRect() : svgRef.current?.getBoundingClientRect();
            if (rect) {
              const px = e.clientX - rect.left; const py = e.clientY - rect.top;
              currentPointRef.current = { x: px, y: py };
              // move cloud to midpoint
              const s = startPointRef.current;
              setCloudPos({ x: Math.round((s.x + px) / 2), y: Math.round((s.y + py) / 2) });
              setPreviewTick(t => t + 1);
            }
          }

          // if user is dragging a floating box, update its position
          if (draggingBoxRef.current && onUpdateDrawing) {
            const drag = draggingBoxRef.current;
            const rect = containerRef && containerRef.current ? containerRef.current.getBoundingClientRect() : svgRef.current?.getBoundingClientRect();
            if (rect) {
              const nx = e.clientX - rect.left - drag.offsetX;
              const ny = e.clientY - rect.top - drag.offsetY;
              // clamp to bounds
              const cw = rect.width || 800;
              const ch = rect.height || 600;
              const boxW = 160; const boxH = 72; const margin = 8;
              const nbx = Math.max(margin, Math.min(nx, cw - boxW - margin));
              const nby = Math.max(margin, Math.min(ny, ch - boxH - margin));
              onUpdateDrawing(drag.id, { options: { boxPosition: { x: nbx, y: nby } } });
            }
          }
          onMouseMove(e as unknown as React.MouseEvent);
        }}
        onMouseLeave={() => { setCursorPos(null); }}
        onMouseUp={(e) => {
          // release pointer capture if needed
          if (draggingBoxRef.current) {
            try { (e.target as Element).releasePointerCapture(draggingBoxRef.current.pointerId); } catch (err) { /* ignore */ }
            draggingBoxRef.current = null;
          }
          // cloud drag no longer handled in this layer
          onMouseUp(e as unknown as React.MouseEvent);
        }}
    >
    {debug && (() => { const rectEl = containerRef && containerRef.current ? containerRef.current : svgRef.current; const diagW = rectEl ? rectEl.clientWidth : 800; const diagH = rectEl ? rectEl.clientHeight : 600; return <rect x={0} y={0} width={diagW} height={diagH} fill="none" stroke="magenta" strokeWidth={2} strokeDasharray="6,4" pointerEvents="none" /> })()}
    {drawings.map(drawing => renderDrawing(drawing))}
        {renderPreview(previewDrawing)}
        {/* Live or finalized ruler rendering */}
        {(() => {
          const live = isDrawingRef.current && startPointRef.current && currentPointRef.current;
          const final = rulerData;
          if (!live && !final) return null;
          const a = live ? startPointRef.current! : final!.start;
          const b = live ? currentPointRef.current! : final!.end;
          return (
            <g key="tv-ruler">
                {/* Rectangle between A and B (cloud-color) and central cross */}
                {(() => {
                  const minX = Math.min(a.x, b.x);
                  const minY = Math.min(a.y, b.y);
                  const w = Math.abs(b.x - a.x);
                  const h = Math.abs(b.y - a.y);
                  // default to blue
                  let fill = 'rgba(30,136,229,0.12)';
                  let stroke = 'rgba(30,136,229,0.95)';
                  try {
                    if (chartRef && chartRef.current && seriesRef && seriesRef.current) {
                      const sp = coordinateToPoint(a.x, a.y, chartRef.current, seriesRef.current);
                      const ep = coordinateToPoint(b.x, b.y, chartRef.current, seriesRef.current);
                      const pd = (ep.price ?? 0) - (sp.price ?? 0);
                      if (pd < 0) {
                        fill = 'rgba(236,72,153,0.12)';
                        stroke = 'rgba(236,72,153,0.95)';
                      }
                    } else if (typeof (a as Point).price === 'number' && typeof (b as Point).price === 'number') {
                      const pd = ((b as Point).price ?? 0) - ((a as Point).price ?? 0);
                      if (pd < 0) {
                        fill = 'rgba(236,72,153,0.12)';
                        stroke = 'rgba(236,72,153,0.95)';
                      }
                    }
                  } catch (err) { /* ignore */ }
                  return (
                    <g>
                      <rect x={minX} y={minY} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1} rx={6} />
                      <line x1={minX + w / 2} y1={minY} x2={minX + w / 2} y2={minY + h} stroke={stroke} strokeWidth={1} />
                      <line x1={minX} y1={minY + h / 2} x2={minX + w} y2={minY + h / 2} stroke={stroke} strokeWidth={1} />
                    </g>
                  );
                })()}
              </g>
          );
        })()}
        {/* Ruler live rendering is handled via previewDrawing above; no local live state here. */}
        {/* crosshair rendering */}
        {crosshair && (() => {
          const rectEl = containerRef && containerRef.current ? containerRef.current : svgRef.current;
          const cw = rectEl ? rectEl.clientWidth : 800;
          const ch = rectEl ? rectEl.clientHeight : 600;
          const priceBoxW = 90; const priceBoxH = 28; const margin = 8;
          const priceBoxX = Math.max(margin, cw - priceBoxW - margin);
          const priceBoxY = Math.min(Math.max(margin, crosshair.y - priceBoxH / 2), ch - priceBoxH - margin);
          const timeBoxW = 140; const timeBoxH = 28;
          const timeBoxX = Math.min(Math.max(margin, crosshair.x - timeBoxW / 2), cw - timeBoxW - margin);
          const timeBoxY = ch - timeBoxH - margin;
          const formattedPrice = typeof crosshair.price === 'number' ? crosshair.price.toFixed(precision) : '';
          const formattedTime = typeof crosshair.time === 'number' ? new Date(crosshair.time * 1000).toLocaleString() : (crosshair.time ?? '');

          return (
            <g key="crosshair">
              <line x1={crosshair.x} y1={0} x2={crosshair.x} y2={ch} stroke="#ffffff" strokeWidth={1} strokeDasharray="4,4" opacity={0.9} />
              <line x1={0} y1={crosshair.y} x2={cw} y2={crosshair.y} stroke="#ffffff" strokeWidth={1} strokeDasharray="4,4" opacity={0.9} />
              <g>
                <rect x={priceBoxX} y={priceBoxY} width={priceBoxW} height={priceBoxH} fill="#0b1220" rx={6} stroke="#ffffff" strokeWidth={1} />
                <text x={priceBoxX + priceBoxW / 2} y={priceBoxY + priceBoxH / 2 + 4} fill="#ffffff" fontSize={12} textAnchor="middle">{formattedPrice}</text>
                {/* bidirectional arrows (visual) */}
                <g transform={`translate(${priceBoxX - 18}, ${priceBoxY + priceBoxH / 2 - 6})`}>
                  <polyline points="12,0 0,6 12,12" fill="none" stroke="#ffffff" strokeWidth={1.5} />
                  <polyline points="0,0 12,6 0,12" fill="none" stroke="#ffffff" strokeWidth={1.5} transform="translate(18,0)" />
                </g>
              </g>
              <g>
                <rect x={timeBoxX} y={timeBoxY} width={timeBoxW} height={timeBoxH} fill="#0b1220" rx={6} stroke="#ffffff" strokeWidth={1} />
                <text x={timeBoxX + timeBoxW / 2} y={timeBoxY + timeBoxH / 2 + 4} fill="#ffffff" fontSize={12} textAnchor="middle">{formattedTime}</text>
                {/* bidirectional arrows (visual) */}
                <g transform={`translate(${timeBoxX + timeBoxW / 2 - 12}, ${timeBoxY - 18})`}>
                  <polyline points="0,12 6,0 12,12" fill="none" stroke="#ffffff" strokeWidth={1.5} />
                  <polyline points="0,0 6,12 12,0" fill="none" stroke="#ffffff" strokeWidth={1.5} transform="translate(0,18)" />
                </g>
              </g>
            </g>
          );
        })()}
        {/* Cursor modes rendering: Arrow (no lines), Cross (full crosshair lines), Dot (full lines + dot) */}
        {cursorPos && (activeTool === 'cursor-cross' || activeTool === 'cursor-dot') && (() => {
          const rectEl = containerRef && containerRef.current ? containerRef.current : svgRef.current;
          const cw = rectEl ? rectEl.clientWidth : 800;
          const ch = rectEl ? rectEl.clientHeight : 600;
          const cx = cursorPos.x; const cy = cursorPos.y;
          const lineColor = 'rgba(255,255,255,0.9)';
          return (
            <g key="custom-cursor">
              <line x1={cx} y1={0} x2={cx} y2={ch} stroke={lineColor} strokeWidth={1} />
              <line x1={0} y1={cy} x2={cw} y2={cy} stroke={lineColor} strokeWidth={1} />
              {activeTool === 'cursor-dot' && <circle cx={cx} cy={cy} r={4} fill={lineColor} stroke="#000" strokeWidth={0.5} />}
            </g>
          );
        })()}
      </svg>
      {/* Floating cloud (HTML) */}
      {cloudVisible && cloudPos && (
        <div
          ref={cloudRef}
          style={{
            position: 'absolute',
            left: cloudStylePos ? cloudStylePos.x : cloudPos.x,
            top: cloudStylePos ? cloudStylePos.y : cloudPos.y,
            // lift the floating info a bit higher above the measured area
            transform: 'translate(-50%, -60%)',
            pointerEvents: 'auto',
            ...( (() => { const c = getCloudColors(); return { background: c.bg, border: `1px solid ${c.stroke}` }; })() ),
            color: '#fff',
            borderRadius: 4,
            padding: '6px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontSize: 12,
            zIndex: 100,
            userSelect: 'none',
            cursor: 'grab',
          }}
          onMouseDown={(ev) => {
            ev.stopPropagation();
            const rect = containerRef && containerRef.current ? containerRef.current.getBoundingClientRect() : svgRef.current?.getBoundingClientRect();
            if (!rect) return;
            cloudDragRef.current = { offsetX: ev.clientX - rect.left - cloudPos.x, offsetY: ev.clientY - rect.top - cloudPos.y };
          }}
        >
          {/* Compute precise values (price A/B, percent, volume, bars, time) when possible */}
          {(() => {
            const s = rulerData ? rulerData.start : (startPointRef.current || null);
            const e = rulerData ? rulerData.end : (currentPointRef.current || null);
            if (!s || !e) return <div>—</div>;

            let priceA: number | null = null;
            let priceB: number | null = null;
            let priceDiff: number | null = null;
            let percent: number | null = null;
            let bars: number | null = null;
            let timeString: string | null = null;
            let volSum: number | null = null;

            try {
              if (chartRef && chartRef.current && seriesRef && seriesRef.current) {
                const sp = coordinateToPoint(s.x, s.y, chartRef.current, seriesRef.current);
                const ep = coordinateToPoint(e.x, e.y, chartRef.current, seriesRef.current);
                priceA = typeof sp.price === 'number' ? sp.price : null;
                priceB = typeof ep.price === 'number' ? ep.price : null;
                if (priceA !== null && priceB !== null) {
                  priceDiff = priceB - priceA;
                  percent = priceA !== 0 ? (priceDiff / Math.abs(priceA) * 100) : null;
                }
                // resolve bars/volume using priceData if available
                if (priceData && priceData.length > 0) {
                  const i0 = resolveIndex(sp.time as number);
                  const i1 = resolveIndex(ep.time as number);
                  if (i0 !== null && i1 !== null) {
                    const a = Math.min(i0, i1);
                    const b = Math.max(i0, i1);
                    bars = Math.abs(b - a);
                    timeString = barsToTimeString(bars);
                    volSum = priceData.slice(a, b + 1).reduce((s, v) => s + (v.volume || 0), 0);
                  } else {
                    bars = Math.abs((ep.time ?? 0) - (sp.time ?? 0));
                    timeString = barsToTimeString(bars);
                  }
                }
              } else {
                // fallback to point.price if available
                priceA = typeof (s as Point).price === 'number' ? (s as Point).price as number : null;
                priceB = typeof (e as Point).price === 'number' ? (e as Point).price as number : null;
                if (priceA !== null && priceB !== null) {
                  priceDiff = priceB - priceA;
                  percent = priceA !== 0 ? (priceDiff / Math.abs(priceA) * 100) : null;
                }
                bars = null;
                timeString = null;
              }
            } catch (err) {
              // keep nulls as fallback
            }

            const fmt = (n: number | null) => (n === null ? '-' : typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-');
            const fmtVol = (v: number | null) => {
              if (v === null) return '-';
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
              if (v >= 1000) return `${(v / 1000).toFixed(2)}K`;
              return `${Math.round(v)}`;
            };

            const isPositive = (priceDiff !== null ? priceDiff > 0 : (percent !== null ? percent > 0 : null));
            // build price lines in requested order: if positive show Precio Fin above Precio Inicio; if negative Precio Inicio above Precio Fin
            const priceLines = isPositive === null ? [
              <div key="inicio" style={{ fontSize: 12 }}>Precio Inicio: <strong>{priceA !== null ? priceA.toFixed(precision).replace(/0+$/, '') : '-'}</strong></div>,
              <div key="fin" style={{ fontSize: 12 }}>Precio Fin: <strong>{priceB !== null ? priceB.toFixed(precision).replace(/0+$/, '') : '-'}</strong></div>
            ] : (isPositive ? [
              <div key="fin" style={{ fontSize: 12 }}>Precio Fin: <strong>{priceB !== null ? priceB.toFixed(precision).replace(/0+$/, '') : '-'}</strong></div>,
              <div key="inicio" style={{ fontSize: 12 }}>Precio Inicio: <strong>{priceA !== null ? priceA.toFixed(precision).replace(/0+$/, '') : '-'}</strong></div>
            ] : [
              <div key="inicio" style={{ fontSize: 12 }}>Precio Inicio: <strong>{priceA !== null ? priceA.toFixed(precision).replace(/0+$/, '') : '-'}</strong></div>,
              <div key="fin" style={{ fontSize: 12 }}>Precio Fin: <strong>{priceB !== null ? priceB.toFixed(precision).replace(/0+$/, '') : '-'}</strong></div>
            ]);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', color: '#fff' }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{percent !== null ? `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%` : 'Δ%: -'}</div>
                {priceLines}
                <div style={{ fontSize: 12 }}>Vol: <strong>{fmtVol(volSum)}</strong></div>
                <div style={{ fontSize: 12 }}>Velas: <strong>{bars !== null ? bars : '-'}</strong> • <strong>{timeString ?? '-'}</strong></div>
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
};

export default ChartDrawingLayer;
