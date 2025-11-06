import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from 'react-dom';
import { createChart, ColorType, CandlestickSeries, IChartApi, ISeriesApi } from "lightweight-charts";
import { TrendingUp } from "lucide-react";
import ChartDrawingLayer from "./ChartDrawingLayer";
import DrawingPropertiesPanel from "./DrawingPropertiesPanel";
import PriceScaleHandle from "./PriceScaleHandle";
import { useAdvancedDrawing } from "@/hooks/useAdvancedDrawing";
import { useDrawingStore, IDrawing } from "@/store/drawingStore";
import { pointToCoordinate, coordinateToPoint } from "@/utils/snapUtils";
import { calculateMeasurements } from "@/utils/drawingPrimitives";
import useMarketData from '@/hooks/useMarketData';

interface TradingChartProps {
  symbol: string;
  timeframe: string;
  drawingTools: ReturnType<typeof import("@/hooks/useDrawingTools").useDrawingTools>;
  isMarketPanelOpen?: boolean;
}

interface OHLCData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TradingChart = ({ symbol, timeframe, drawingTools, isMarketPanelOpen }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const barSpacingRef = useRef<number>(8);
  const priceScaleMarginsRef = useRef<{ top: number; bottom: number }>({ top: 0.1, bottom: 0.1 });
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [ohlcData, setOhlcData] = useState<OHLCData>({
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    volume: 0,
  });
  const [priceData, setPriceData] = useState<Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>>([]);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; time?: number | null; price?: number | null } | null>(null);
  const [barSpacing, setBarSpacing] = useState<number>(() => barSpacingRef.current);
  const [verticalStretch, setVerticalStretch] = useState<number>(0.1);
  const [crosshairOn, setCrosshairOn] = useState<boolean>(true);
  const [gridOn, setGridOn] = useState<boolean>(true);
  // compute right offset so the price-scale handle sits left of the MarketPanel overlay
  // MarketPanel uses Tailwind w-64 when open (16rem = 256px) and w-14 when closed (3.5rem = 56px)
  const defaultPanelWidth = isMarketPanelOpen ? 256 : 56;
  const [panelWidthPx, setPanelWidthPx] = useState<number>(defaultPanelWidth);
  // gap between price-scale handle and the market panel (in pixels)
  const gapPx = 12;
  const priceScaleRightOffsetPx = panelWidthPx + gapPx; // small gap

  // Measure the #market-panel width at runtime and update on resize / panel changes.
  useEffect(() => {
    let mounted = true;
    const update = () => {
      try {
        const el = document.getElementById('market-panel');
        const measured = el ? Math.round(el.getBoundingClientRect().width) : (isMarketPanelOpen ? 256 : 56);
        if (mounted) setPanelWidthPx(measured);
      } catch (err) {
        if (mounted) setPanelWidthPx(isMarketPanelOpen ? 256 : 56);
      }
    };
    update();

    let ro: ResizeObserver | null = null;
    const el = document.getElementById('market-panel');
    if (el && typeof ResizeObserver !== 'undefined') {
      try {
        ro = new ResizeObserver(() => update());
        ro.observe(el);
      } catch (err) {
        ro = null;
      }
    }

    window.addEventListener('resize', update);
    return () => {
      mounted = false;
      window.removeEventListener('resize', update);
      if (ro) ro.disconnect();
    };
  }, [isMarketPanelOpen]);

  // Apply the measured panel width to the chart container so the chart's
  // internal price scale is rendered to the left of the panel instead of
  // underneath it. This shrinks the chart area by setting the right CSS
  // inset and asks the chart to resize.
  useEffect(() => {
    try {
      const el = chartContainerRef.current;
      if (!el) return;
      // set right inset so the chart area avoids the market panel
      el.style.right = `${panelWidthPx}px`;
      // if chart instance exists, resize it to the new container width
      if (chartRef.current) {
        const w = el.clientWidth || Math.max(0, (chartRef.current as unknown).width || 0);
        const h = el.clientHeight || Math.max(0, (chartRef.current as unknown).height || 0);
        try {
          chartRef.current.applyOptions({ width: w, height: h } as unknown);
        } catch (err) {
          // fallback: attempt to call chartRef.current.resize if available
          try { (chartRef.current as unknown).resize?.(w, h); } catch (e) { /* ignore */ }
        }
      }
    } catch (err) {
      // ignore
    }
  }, [panelWidthPx]);
 

  const { drawings: legacyDrawings } = drawingTools;
  const { drawings: storeDrawings } = useDrawingStore();
  const { handleMouseDown, handleMouseMove, handleMouseUp, handlePointerDown: drawPointerDown, handlePointerMove: drawPointerMove, handlePointerUp: drawPointerUp, isDrawing, previewDrawing, handleDrawingClick } = useAdvancedDrawing(
    chartRef.current,
    seriesRef.current,
    chartContainerRef,
    timeframe
  );
  const { incrementClickCount, resetClickCount, selectDrawing, removeDrawing, updateDrawing, dragState, setDragState } = useDrawingStore();
  
  // Combine legacy and new drawings (storeDrawings converted to pixel coordinates)
  const allDrawings = useMemo(() => {
    const legacy = legacyDrawings;
    if (!chartRef.current || !seriesRef.current) return legacy;

    const mapped = storeDrawings.map(d => {
      const points = d.points.map(p => {
        const { x, y } = pointToCoordinate(p, chartRef.current!, seriesRef.current!);
        return { x, y, price: p.price, time: p.time };
      });
      const measurements = d.type === 'ruler' && d.points.length >= 2
        ? calculateMeasurements(d.points[0], d.points[1], timeframe)
        : undefined;
      return {
        id: d.id,
        tool: d.type,
        points,
        color: d.options.color,
        selected: d.selected,
        measurements,
      };
    });

    return [...legacy, ...mapped];
  }, [legacyDrawings, storeDrawings, timeframe]);

  // Apply chart settings (colors, precision, wick) when settings change
  useEffect(() => {
    const applySettings = (s: unknown) => {
      try {
        if (!seriesRef.current) return;
        const opts: unknown = {};
        if (s.symbolColorBody) {
          // map body color to up/down for demo: keep same color for up, slightly darker for down if not provided
          opts.upColor = s.symbolColorBody;
          opts.borderColor = s.symbolColorBody;
          opts.borderUpColor = s.symbolColorBody;
          opts.borderDownColor = s.symbolColorBody;
        }
        // bullish / bearish explicit colors
        // Prefer explicit body/wick colors if provided, otherwise fallback
        if (s.bullishBody) {
          opts.upColor = s.bullishBody;
          opts.borderUpColor = s.bullishBody;
        } else if (s.bullishColor) {
          opts.upColor = s.bullishColor;
          opts.borderUpColor = s.bullishColor;
        }
        if (s.bearishBody) {
          opts.downColor = s.bearishBody;
          opts.borderDownColor = s.bearishBody;
        } else if (s.bearishColor) {
          opts.downColor = s.bearishColor;
          opts.borderDownColor = s.bearishColor;
        }

        // wick colors (support per-direction)
        if (s.bullishWick) opts.wickUpColor = s.bullishWick;
        else if (s.symbolColorWick) opts.wickUpColor = s.symbolColorWick;
        if (s.bearishWick) opts.wickDownColor = s.bearishWick;
        else if (s.symbolColorWick) opts.wickDownColor = s.symbolColorWick;
        if (s.symbolColorWick) {
          opts.wickColor = s.symbolColorWick;
        }

        // per-direction body visibility: if explicitly set, override colors to transparent
        // fallback to global showBody if per-direction flags are undefined
        const showBullish = (typeof s.showBullishBody === 'boolean') ? s.showBullishBody : (typeof s.showBody === 'boolean' ? s.showBody : true);
        const showBearish = (typeof s.showBearishBody === 'boolean') ? s.showBearishBody : (typeof s.showBody === 'boolean' ? s.showBody : true);

        if (!showBullish) {
          // make bullish body transparent but keep wick color
          opts.upColor = 'rgba(0,0,0,0)';
          opts.borderUpColor = 'rgba(0,0,0,0)';
        }
        if (!showBearish) {
          opts.downColor = 'rgba(0,0,0,0)';
          opts.borderDownColor = 'rgba(0,0,0,0)';
        }
        if (typeof s.showBody === 'boolean') {
          opts.borderVisible = !!s.showBody;
          opts.bodyVisible = !!s.showBody;
        }
        if (typeof s.precision === 'number') {
          // price format on series
          opts.priceFormat = { type: 'price', precision: s.precision };
        }
        seriesRef.current.applyOptions(opts);
        // apply chart background if provided
        try {
          if (s.chartBg && chartRef.current) {
            chartRef.current.applyOptions({ layout: { background: { type: ColorType.Solid, color: s.chartBg } } });
          }
        } catch (err) {
              console.debug('[TradingChart] ignored error applying chart background', err);
            }
      } catch (err) {
        // ignore
      }
    };

    // load from localStorage initially
    try {
      const raw = localStorage.getItem('chartSettings');
      if (raw) {
        applySettings(JSON.parse(raw));
      }
  } catch (err) { console.debug('[TradingChart] ignored error loading settings from localStorage', err); }

    const handler = (ev: Event) => {
      try {
        // @ts-expect-error TS: we expect CustomEvent detail shape here
        const s = (ev as CustomEvent).detail;
        applySettings(s);
      } catch (err) { console.debug('[TradingChart] ignored error in chartSettingsChange handler', err); }
    };
    window.addEventListener('chartSettingsChange', handler as EventListener);
    return () => { window.removeEventListener('chartSettingsChange', handler as EventListener); };
  }, []);

  // Handlers: wheel zoom centered approximation
  const onWheel = (e: React.WheelEvent) => {
    if (!chartRef.current || !chartContainerRef.current) return;
    // prefer preventing default to avoid page scrolling
    e.preventDefault();
    const rect = chartContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const width = rect.width || 1;
    const ratio = Math.max(0, Math.min(1, mouseX / width));

    // If Ctrl is pressed, zoom vertically (approx) by adjusting rightPriceScale margins
    if (e.ctrlKey && seriesRef.current && chartRef.current && chartContainerRef.current) {
      try {
        const rect = chartContainerRef.current.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const height = rect.height || 1;
        // current prices at top and bottom
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const series = seriesRef.current as unknown;
        const topPrice = series.priceToCoordinate ? series.coordinateToPrice(0) : null;
        // coordinateToPrice expects y coordinate; top=0, bottom=height
        const priceTop = series.coordinateToPrice(0);
        const priceBottom = series.coordinateToPrice(height);
        const priceAtCursor = series.coordinateToPrice(mouseY);
        if (typeof priceTop !== 'number' || typeof priceBottom !== 'number' || typeof priceAtCursor !== 'number') {
          // fallback to margins approach
          const dy = e.deltaY;
          const delta = dy * 0.0008;
          const curr = priceScaleMarginsRef.current;
          const top = Math.max(0, Math.min(0.45, curr.top + delta));
          const bottom = Math.max(0, Math.min(0.45, curr.bottom + delta));
          chartRef.current.applyOptions({ rightPriceScale: { scaleMargins: { top, bottom } } });
          priceScaleMarginsRef.current = { top, bottom };
          return;
        }

        const top = priceTop;
        const bottom = priceBottom;
        const span = bottom - top;
        const sensitivity = 0.0014;
        const factorV = Math.exp(e.deltaY * sensitivity);
        const center = priceAtCursor;
        const newSpan = span * factorV;
        const rel = (priceAtCursor - top) / span; // relative position in [0,1]
        const newTop = center - rel * newSpan;
        const newBottom = newTop + newSpan;
        // set visible price range on right price scale if available
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const priceScaleApi = (chartRef.current as unknown).priceScale?.('right');
          if (priceScaleApi && typeof priceScaleApi.setVisibleRange === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            priceScaleApi.setVisibleRange({ from: newTop as unknown, to: newBottom as unknown });
            return;
          }
        } catch (err) {
          // ignore and fallback
        }
        // fallback to adjusting margins if priceScale API not available
        const dy = e.deltaY;
        const delta = dy * 0.0008;
        const curr = priceScaleMarginsRef.current;
        const topM = Math.max(0, Math.min(0.45, curr.top + delta));
        const bottomM = Math.max(0, Math.min(0.45, curr.bottom + delta));
        chartRef.current.applyOptions({ rightPriceScale: { scaleMargins: { top: topM, bottom: bottomM } } });
        priceScaleMarginsRef.current = { top: topM, bottom: bottomM };
      } catch (err) {
        // ignore
      }
      return;
    }

    // Horizontal zoom: manipulate visible time range centered on cursor
    try {
      const timeScale = chartRef.current.timeScale();
      const visible = timeScale.getVisibleRange() as unknown;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!visible || typeof (visible as unknown).from === 'undefined' || typeof (visible as unknown).to === 'undefined') return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const from = (visible as unknown).from as number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const to = (visible as unknown).to as number;
      const span = to - from;
      // sensitivity: smaller value => slower zoom; positive deltaY -> zoom out
      const sensitivity = 0.0014;
      const factor = Math.exp(e.deltaY * sensitivity);
      // Prevent extreme zooming
      const minSpan = 1; // minimum logical span (1 second)
      const maxSpan = Math.max(span, 60 * 60 * 24 * 365 * 10); // very large cap
      const center = from + span * ratio;
      const newFrom = center - (center - from) * factor;
      const newTo = center + (to - center) * factor;
      let newSpan = newTo - newFrom;
      if (newSpan < minSpan) {
        // clamp around center
        const half = minSpan / 2;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timeScale.setVisibleRange({ from: (center - half) as unknown, to: (center + half) as unknown });
        return;
      }
      if (newSpan > maxSpan) {
        newSpan = maxSpan;
        // keep center
        const half = newSpan / 2;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timeScale.setVisibleRange({ from: (center - half) as unknown, to: (center + half) as unknown });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      timeScale.setVisibleRange({ from: newFrom as unknown, to: newTo as unknown });
    } catch (err) {
      // ignore
    }
  };

  // ChartControls handlers
  const handleZoomIn = () => {
    if (!chartRef.current) return;
    try {
      const timeScale = chartRef.current.timeScale();
      const vis = timeScale.getVisibleRange() as unknown;
      if (!vis) return;
      const from = vis.from as number;
      const to = vis.to as number;
      const center = (from + to) / 2;
      const factor = 0.8; // zoom in
      const newFrom = center - (center - from) * factor;
      const newTo = center + (to - center) * factor;
      timeScale.setVisibleRange({ from: newFrom as unknown, to: newTo as unknown });
    } catch (e) { /* ignore */ }
  };

  const handleZoomOut = () => {
    if (!chartRef.current) return;
    try {
      const timeScale = chartRef.current.timeScale();
      const vis = timeScale.getVisibleRange() as unknown;
      if (!vis) return;
      const from = vis.from as number;
      const to = vis.to as number;
      const center = (from + to) / 2;
      const factor = 1.25; // zoom out
      const newFrom = center - (center - from) * factor;
      const newTo = center + (to - center) * factor;
      timeScale.setVisibleRange({ from: newFrom as unknown, to: newTo as unknown });
    } catch (e) { /* ignore */ }
  };

  const handleResetZoom = () => {
    try { chartRef.current?.timeScale().fitContent(); } catch (e) { /* ignore */ }
  };

  const handleToggleCrosshair = () => {
    const next = !crosshairOn; setCrosshairOn(next);
    try {
      chartRef.current?.applyOptions({
        crosshair: { vertLine: { visible: next }, horzLine: { visible: next } }
      });
    } catch (e) { /* ignore */ }
  };

  const handleToggleGrid = () => {
    const next = !gridOn; setGridOn(next);
    try {
      chartRef.current?.applyOptions({
        grid: { vertLines: { visible: next }, horzLines: { visible: next } }
      });
    } catch (e) { /* ignore */ }
  };

  const handleSnapshot = async () => {
    try {
      // try built-in screenshot if available
      // @ts-ignore
      const dataUrl = await (chartRef.current as unknown)?.takeScreenshot?.();
      if (dataUrl) {
        const a = document.createElement('a'); a.href = dataUrl; a.download = `${symbol || 'chart'}-snapshot.png`; a.click();
        return;
      }
    } catch (e) { /* ignore */ }
    alert('Snapshot not supported in this build');
  };

  const handleBarSpacingChange = (v: number) => {
    setBarSpacing(v);
    try { chartRef.current?.applyOptions({ timeScale: { barSpacing: v } as unknown } as unknown); } catch (e) { /* ignore */ }
  };

  const handleVerticalStretchChange = (v: number) => {
    setVerticalStretch(v);
    try { chartRef.current?.applyOptions({ rightPriceScale: { scaleMargins: { top: v * 0.4, bottom: v * 0.4 } } }); } catch (e) { /* ignore */ }
  };

  const handleAddHLine = () => {
    try {
      const price = ohlcData.close || currentPrice || 0;
      // @ts-ignore
      seriesRef.current?.createPriceLine?.({ price, color: '#888', lineWidth: 1, lineStyle: 0 });
    } catch (e) { console.debug('addHLine failed', e); }
  };

  const handleRemoveSelected = () => {
    try { removeDrawing(); } catch (e) { /* ignore */ }
  };

  // Space key handlers to enable temporary pan (hold space to pan)
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') {
        // prevent page scroll
        ev.preventDefault();
        spaceDownRef.current = true;
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') {
        ev.preventDefault();
        spaceDownRef.current = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Panning (press+drag) like TradingView
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panStartRangeRef = useRef<{ from: number; to: number } | null>(null);
  const priceHandleDraggingRef = useRef(false);
  const priceHandleStartYRef = useRef<number>(0);
  const priceHandleStartMarginsRef = useRef<{ top: number; bottom: number }>({ top: 0.1, bottom: 0.1 });

  // Price handle pointer handlers (defined at component scope so JSX can reference them)
  const handlePriceHandlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!chartRef.current) return;
    priceHandleDraggingRef.current = true;
    priceHandleStartYRef.current = e.clientY;
    priceHandleStartMarginsRef.current = { ...priceScaleMarginsRef.current };
    try { (e.currentTarget as Element).setPointerCapture((e.nativeEvent as PointerEvent).pointerId); } catch (err) { /* ignore */ }
  };

  const handlePriceHandlePointerMove = (e: React.PointerEvent) => {
    if (!priceHandleDraggingRef.current || !chartRef.current) return;
    const dy = e.clientY - priceHandleStartYRef.current;
    const delta = -dy * 0.0015;
    const start = priceHandleStartMarginsRef.current;
    const top = Math.max(0, Math.min(0.45, start.top + delta));
    const bottom = Math.max(0, Math.min(0.45, start.bottom - delta));
    try {
      chartRef.current.applyOptions({ rightPriceScale: { scaleMargins: { top, bottom } } });
      priceScaleMarginsRef.current = { top, bottom };
      const avg = (top + bottom) / 2;
      const v = Math.max(0, Math.min(1, avg / 0.4));
      setVerticalStretch(v);
    } catch (err) { /* ignore */ }
  };

  const handlePriceHandlePointerUp = (e: React.PointerEvent) => {
    if (!priceHandleDraggingRef.current) return;
    priceHandleDraggingRef.current = false;
    try { (e.currentTarget as Element).releasePointerCapture((e.nativeEvent as PointerEvent).pointerId); } catch (err) { /* ignore */ }
  };
  const spaceDownRef = useRef(false);
  const lastPointerXRef = useRef<number | null>(null);
  const lastPointerTimeRef = useRef<number | null>(null);
  const velocityRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const isRulingRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // left button only
    if (e.button !== 0) return;
    const active = drawingTools.activeTool;
    // If no drawing tool (or select), start panning. Also allow pan while holding Space.
    if ((!active || active === 'select') || spaceDownRef.current) {
      if (!chartRef.current || !chartContainerRef.current) return;
      isPanningRef.current = true;
      panStartXRef.current = e.clientX;
      lastPointerXRef.current = e.clientX;
      lastPointerTimeRef.current = performance.now();
      velocityRef.current = 0;
      try {
        const timeScale = chartRef.current.timeScale();
        const vis = timeScale.getVisibleRange() as unknown;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (vis && typeof (vis as unknown).from !== 'undefined' && typeof (vis as unknown).to !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          panStartRangeRef.current = { from: (vis as unknown).from as number, to: (vis as unknown).to as number };
        } else {
          panStartRangeRef.current = null;
        }
      } catch (err) {
        panStartRangeRef.current = null;
      }
      // prevent text selection/other
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e.currentTarget as Element).setPointerCapture?.((e as unknown as unknown).pointerId);
      } catch (err) {
        // ignore
      }
      return;
    }

    // otherwise delegate to drawing handlers
    // convert to React.MouseEvent-like for existing handlers
  // pass PointerEvent through to existing MouseEvent-based drawing handlers
  handleMouseDown(e as unknown as React.MouseEvent);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
  if (isPanningRef.current && chartRef.current && chartContainerRef.current && panStartRangeRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      const dx = e.clientX - panStartXRef.current;
      const width = rect.width || 1;
      const ratio = dx / width;
      const { from, to } = panStartRangeRef.current;
      const span = (to as number) - (from as number);
      const newFrom = (from as number) - ratio * span;
      const newTo = (to as number) - ratio * span;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chartRef.current.timeScale().setVisibleRange({ from: newFrom as unknown, to: newTo as unknown });
      } catch (err) {
        // ignore
      }
      // compute velocity for inertia
      try {
        const now = performance.now();
        const lastX = lastPointerXRef.current;
        const lastT = lastPointerTimeRef.current;
        if (lastX != null && lastT != null) {
          const dt = Math.max(1, now - lastT);
          const vx = (e.clientX - lastX) / dt; // px per ms
          // low-pass smoothing
          velocityRef.current = velocityRef.current * 0.8 + vx * 0.2;
        }
        lastPointerXRef.current = e.clientX;
        lastPointerTimeRef.current = now;
      } catch (err) {
        // ignore
      }
      return;
    }

  // overlay-level pointer handlers perform hit-testing for handles and delegate
  const overlayPointerDown = (e: React.PointerEvent) => {
    // compute local coords
    if (!chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // hit test handles for selected drawings
    const hitRadius = 8;
    for (const d of allDrawings) {
      if (!d.selected) continue;
      for (let i = 0; i < d.points.length; i++) {
        const p = d.points[i];
        const dist = Math.hypot((p.x || 0) - x, (p.y || 0) - y);
        if (dist <= hitRadius) {
          // start handle drag via store dragState
          setDragState({ isDragging: true, drawingId: d.id, handleIndex: i });
          return;
        }
      }
    }
    // If ruler tool is active, ensure ruler press-drag-release flow (no pan)
    if (drawingTools.activeTool === 'ruler') {
      isRulingRef.current = true;
      // forward to drawing handler (pointer-aware)
      drawPointerDown(e);
      try {
        // capture pointer to continue receiving move/up
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e.currentTarget as Element).setPointerCapture?.((e as unknown as unknown).pointerId);
      } catch (err) {
        // ignore
      }
      return;
    }

    // not a handle and not ruler: delegate to pointer pan/drawing logic
    handlePointerDown(e);
  };

  const overlayPointerMove = (e: React.PointerEvent) => {
    // if we're actively placing a ruler, forward events to drawing preview
    if (isRulingRef.current) {
        drawPointerMove(e);
        return;
      }

    // if store indicates handle dragging, update drawing point
    if (dragState.isDragging && dragState.drawingId && typeof dragState.handleIndex === 'number') {
      if (!chartRef.current || !seriesRef.current || !chartContainerRef.current) return;
      const rect = chartContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newPoint = coordinateToPoint(x, y, chartRef.current, seriesRef.current);
      // fetch drawing from storeDrawings and update the appropriate point
      const drawing = storeDrawings.find(s => s.id === dragState.drawingId);
      if (!drawing) return;
      const updatedPoints = drawing.points.map((pt, idx) => idx === dragState.handleIndex ? newPoint : pt);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateDrawing(dragState.drawingId, { points: updatedPoints } as unknown);
      return;
    }

    // else delegate to pointer move (pan or drawing preview)
    handlePointerMove(e);
  };

  const overlayPointerUp = (e: React.PointerEvent) => {
    if (isRulingRef.current) {
      // finalize ruler
      isRulingRef.current = false;
      // forward to drawing finalizer (pointer-aware)
      drawPointerUp(e);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e.currentTarget as Element).releasePointerCapture?.((e as unknown as unknown).pointerId);
      } catch (err) {
        // ignore
      }
      return;
    }

    if (dragState.isDragging && dragState.drawingId) {
      // finish handle drag
      setDragState({ isDragging: false, drawingId: null, handleIndex: null });
      return;
    }

    handlePointerUp(e);
  };

    // not panning -> delegate to drawing mouse move
  // pass PointerEvent through to existing MouseEvent-based drawing handlers
  handleMouseMove(e as unknown as React.MouseEvent);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRangeRef.current = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e.currentTarget as Element).releasePointerCapture?.((e as unknown as unknown).pointerId);
      } catch (err) {
        // ignore
      }
      // start inertia if velocity present
      const vx = velocityRef.current; // px per ms
      velocityRef.current = 0;
      lastPointerXRef.current = null;
      lastPointerTimeRef.current = null;
      if (Math.abs(vx) > 0.001 && chartRef.current && chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        const width = rect.width || 1;
        const timeScale = chartRef.current.timeScale();
        // convert px/ms to time delta per frame via span
        let currentVelocity = vx; // px/ms
        const friction = 0.92; // decay per frame
        const step = () => {
          if (!chartRef.current) return;
          // compute dt approx 16ms
          const dt = 16;
          const ratio = (currentVelocity * dt) / width; // fraction of span per frame
          try {
            const vis = timeScale.getVisibleRange() as unknown;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (vis && typeof (vis as unknown).from !== 'undefined' && typeof (vis as unknown).to !== 'undefined') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const from = (vis as unknown).from as number;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const to = (vis as unknown).to as number;
              const span = to - from;
              const newFrom = from - ratio * span;
              const newTo = to - ratio * span;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              chartRef.current.timeScale().setVisibleRange({ from: newFrom as unknown, to: newTo as unknown });
            }
          } catch (err) {
            // ignore
          }
          currentVelocity *= friction;
          if (Math.abs(currentVelocity) > 0.0005) {
            rafRef.current = requestAnimationFrame(step);
          } else {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        };
        rafRef.current = requestAnimationFrame(step);
      }
      return;
    }

    // delegate to drawing handlers
  // pass PointerEvent through to existing MouseEvent-based drawing handlers
  handleMouseUp(e as unknown as React.MouseEvent);
  };

  // Axis overlay drag: bottom (time) and right (price)
  const onBottomMouseDown = (e: React.MouseEvent) => {
    if (!chartContainerRef.current || !chartRef.current) return;
    e.preventDefault();
    const startX = e.clientX;
    const startBar = barSpacingRef.current ?? 8;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const next = Math.max(2, Math.min(60, Math.round(startBar + dx * 0.08)));
      chartRef.current?.applyOptions({ timeScale: { barSpacing: next } });
      barSpacingRef.current = next;
      try { setBarSpacing(next); } catch (err) { /* ignore */ }
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onRightMouseDown = (e: React.MouseEvent) => {
    if (!chartContainerRef.current || !chartRef.current) return;
    e.preventDefault();
    const startY = e.clientY;
    // read current scaleMargins from ref
    const startTop = priceScaleMarginsRef.current.top ?? 0.1;
    const startBottom = priceScaleMarginsRef.current.bottom ?? 0.1;
    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - startY;
      // move up -> increase top margin making chart taller
      const top = Math.max(0, Math.min(0.45, startTop - dy * 0.0015));
      const bottom = Math.max(0, Math.min(0.45, startBottom + dy * 0.0015));
      chartRef.current?.applyOptions({ rightPriceScale: { scaleMargins: { top, bottom } } });
      priceScaleMarginsRef.current = { top, bottom };
      try {
        // normalize average margin into verticalStretch [0..1] assuming max margin ~0.4
        const avg = (top + bottom) / 2;
        const v = Math.max(0, Math.min(1, avg / 0.4));
        setVerticalStretch(v);
      } catch (err) { /* ignore */ }
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Create chart instance and UI wiring
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        // use CSS variables so theme changes are reflected dynamically
        background: { type: ColorType.Solid, color: `hsl(var(--chart-bg))` },
        textColor: `hsl(var(--foreground))`,
      },
      grid: {
        vertLines: { color: `hsl(var(--border))` },
        horzLines: { color: `hsl(var(--border))` },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#363a45",
      },
      timeScale: {
        borderColor: "#363a45",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

  chartRef.current = chart;
    // create an overlay root attached to document.body and position it exactly
    // over the chart container. This avoids stacking-context issues caused by
    // chart internals adding their own layers. We collect cleanup functions so
    // they can be reliably invoked on unmount.
    try {
      const container = chartContainerRef.current;
      const overlayCleanupFns: Array<() => void> = [];
      if (container) {
          if (!overlayRootRef.current) {
          const div = document.createElement('div');
          div.style.position = 'absolute';
          div.style.pointerEvents = 'auto';
          // keep overlay above chart internals but below application modals/dialogs
          div.style.zIndex = '40';
          // ensure overlay has transparent background so it doesn't create a white strip
          div.style.background = 'transparent';
          document.body.appendChild(div);
          overlayRootRef.current = div;

          // keep overlay positioned over the chart container
          const updateOverlay = () => {
            try {
              const r = container.getBoundingClientRect();
              if (!overlayRootRef.current) return;
              overlayRootRef.current.style.left = `${Math.max(0, Math.floor(r.left))}px`;
              overlayRootRef.current.style.top = `${Math.max(0, Math.floor(r.top))}px`;
              overlayRootRef.current.style.width = `${Math.max(0, Math.floor(r.width))}px`;
              overlayRootRef.current.style.height = `${Math.max(0, Math.floor(r.height))}px`;
            } catch (err) { /* ignore */ }
          };

          

          // initial position
          updateOverlay();

          // debug: after a short delay check whether the overlay has a correct
          // size and parent. If it's collapsed/recortado, reattach it as the
          // last child of the chart container as a fallback.
          try {
            setTimeout(() => {
              try {
                const root = overlayRootRef.current;
                if (!root) return;
                const cr = container.getBoundingClientRect();
                const or = root.getBoundingClientRect();
                // log for diagnostics
                console.log('[overlay-debug] container rect', cr, 'overlay rect', or, 'overlay parent', root.parentElement && root.parentElement.tagName);

                // if overlay has zero or extremely small size compared to container,
                // reattach to container as last child. This helps when body-attached
                // overlay is being clipped by some stacking context in the page.
                const tooSmall = or.width === 0 || or.height === 0 || or.width < Math.max(1, cr.width * 0.2);
                if (tooSmall) {
                  // move overlay into the chart container
                  try {
                    container.appendChild(root);
                    // set styles to cover container
                    root.style.left = '0px';
                    root.style.top = '0px';
                    root.style.width = `${container.clientWidth}px`;
                    root.style.height = `${container.clientHeight}px`;
                    // record how we attached for debugging
                    root.dataset.attachedTo = 'container';
                    console.warn('[overlay-debug] overlay reattached to chart container as fallback');
                  } catch (e) {
                    // ignore
                  }
                } else {
                  // mark attached to body for diagnostics
                  root.dataset.attachedTo = 'body';
                }
                // if debug flag, add visible border to the overlay element
                try {
                  const dbg = localStorage.getItem('debugDrawings');
                  if (dbg === '1' && root) {
                    root.style.outline = '2px dashed magenta';
                    root.style.background = 'transparent';
                  }
                } catch (e) { /* ignore */ }
              } catch (err) { /* ignore */ }
            }, 40);
          } catch (err) { /* ignore */ }

          // update on resize/scroll
          window.addEventListener('resize', updateOverlay);
          overlayCleanupFns.push(() => window.removeEventListener('resize', updateOverlay));
          window.addEventListener('scroll', updateOverlay, true);
          overlayCleanupFns.push(() => window.removeEventListener('scroll', updateOverlay, true));

          // observe container size changes
          const ro = new ResizeObserver(updateOverlay);
          ro.observe(container);
          overlayCleanupFns.push(() => ro.disconnect());

          // keep a mutation observer on body to ensure the overlay stays attached
          const mo = new MutationObserver(() => {
            try {
              if (!overlayRootRef.current) return;
              if (overlayRootRef.current.parentElement !== document.body) {
                document.body.appendChild(overlayRootRef.current);
              }
            } catch (err) { /* ignore */ }
          });
          mo.observe(document.body, { childList: true });
          overlayCleanupFns.push(() => mo.disconnect());

          // store cleanup fns on the element so outer cleanup can run them
          // (attach as an internal prop on the HTMLElement)
          (overlayRootRef.current as unknown as { __cleanup?: Array<() => void> }).__cleanup = overlayCleanupFns;
        } else {
          // if already created, ensure it's positioned and attached to body
          try {
            if (overlayRootRef.current && overlayRootRef.current.parentElement !== document.body) {
              document.body.appendChild(overlayRootRef.current);
            }
            const r = container.getBoundingClientRect();
            if (overlayRootRef.current) {
              overlayRootRef.current.style.left = `${Math.max(0, Math.floor(r.left))}px`;
              overlayRootRef.current.style.top = `${Math.max(0, Math.floor(r.top))}px`;
              overlayRootRef.current.style.width = `${Math.max(0, Math.floor(r.width))}px`;
              overlayRootRef.current.style.height = `${Math.max(0, Math.floor(r.height))}px`;
            }
          } catch (err) { /* ignore */ }
        }
      }
    } catch (err) {
      // ignore
    }
    // initialize refs for interactive handlers
    try {
      const tsOpts = (chart.timeScale() as unknown as { options?: () => unknown }).options?.() ?? {};
      // if barSpacing available use it, otherwise keep default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      barSpacingRef.current = (tsOpts as unknown)?.barSpacing ?? barSpacingRef.current;
    } catch (err) {
      // ignore
    }
    try {
      const opts = (chart as unknown as { options?: () => unknown }).options?.() as unknown;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rps = (opts as unknown)?.rightPriceScale ?? {};
      priceScaleMarginsRef.current = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        top: (rps as unknown).scaleMargins?.top ?? priceScaleMarginsRef.current.top,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bottom: (rps as unknown).scaleMargins?.bottom ?? priceScaleMarginsRef.current.bottom,
      };
    } catch (err) {
      // ignore
    }

    // crosshair subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chart.subscribeCrosshairMove((param: unknown) => {
      if (!param || !param.point) {
        setCrosshair(null);
        return;
      }
      const pt = param.point;
      // price from seriesPrices or null
      const price = param.seriesPrices && Object.values(param.seriesPrices)[0] ? Number(Object.values(param.seriesPrices)[0]) : null;
      const time = param.time ?? null;
      setCrosshair({ x: pt.x, y: pt.y, time, price });
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      // map to CSS variables defined in :root (ChartSettingsDialog will set these)
      upColor: `hsl(var(--bullish))`,
      downColor: `hsl(var(--bearish))`,
      borderVisible: false,
      wickUpColor: `hsl(var(--bullish))`,
      wickDownColor: `hsl(var(--bearish))`,
    });

    seriesRef.current = candleSeries;


    // historical data and live updates are provided by useMarketData hook below

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const onDblClick = () => {
      if (chartRef.current) chartRef.current.timeScale().fitContent();
    };

    const containerEl = chartContainerRef.current;
    if (containerEl) containerEl.addEventListener('dblclick', onDblClick);

  window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // websockets are closed by useMarketData hook
      // crosshair subscription is cleaned up when chart.remove() is called
      chart.remove();
      if (containerEl) containerEl.removeEventListener('dblclick', onDblClick);

      // overlay cleanup: if we created a body-attached overlay root, run its
      // cleanup functions and remove the element from the DOM.
      try {
        const root = overlayRootRef.current as (HTMLElement & { __cleanup?: Array<() => void> }) | null;
        if (root) {
          const fns = root.__cleanup;
          if (Array.isArray(fns)) {
            for (const fn of fns) {
              try { fn(); } catch (e) { /* ignore */ }
            }
          }
          if (root.parentElement) root.parentElement.removeChild(root);
          overlayRootRef.current = null;
        }
      } catch (err) {
        // ignore
      }
    };
  }, [symbol]);

  // When timeframe changes, ensure chart view adjusts to new data and log for debugging.
  useEffect(() => {
    try {
      if (!chartRef.current) return;
      // small timeout to allow data to be applied by useMarketData -> setData effect
      const tid = setTimeout(() => {
        try {
          chartRef.current?.timeScale().fitContent();
          // debug
          console.debug('[TradingChart] timeframe changed to', timeframe, 'fitting content');
        } catch (e) { /* ignore */ }
      }, 80);
      return () => clearTimeout(tid);
    } catch (err) { /* ignore */ }
  }, [timeframe]);

  // --- Market data hook: fetch historical candles and live updates ---
  const marketData = useMarketData(symbol, timeframe, 500);
  const { fetchKlines } = marketData;
  const marketPriceData = marketData.priceData;
  const marketLoading = marketData.isLoading;
  const marketError = marketData.error;

  // Apply incoming market data to the chart series (setData and updates)
  useEffect(() => {
    if (!seriesRef.current) return;
    if (!marketPriceData || marketPriceData.length === 0) return;
    try {
      // setData will replace whole dataset (initial load). Later updates come from the hook updating state
      // we keep using setData to ensure series and internal timeScale are consistent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (seriesRef.current as unknown).setData(marketPriceData as unknown);
  setPriceData(marketPriceData as Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>);
      const last = marketPriceData[marketPriceData.length - 1];
      if (last) {
        setCurrentPrice(last.close);
        setPriceChange(((last.close - last.open) / Math.max(1, last.open)) * 100);
        setOhlcData({ open: last.open, high: last.high, low: last.low, close: last.close, volume: last.volume });
      }
      try { chartRef.current?.timeScale().fitContent(); } catch (e) { /* ignore */ }
    } catch (err) {
      // ignore
    }
  }, [marketPriceData]);

  // Load data with an AbortController to avoid leaks (safe forced fetch)
  useEffect(() => {
    if (!fetchKlines) return;
    const controller = new AbortController();
    // call fetchKlines once when function is available; depend only on the stable fetch function
    fetchKlines(controller.signal).catch((e) => {
      // ignore - fetchKlines now silences AbortError; other errors set marketData.error
    });
    return () => controller.abort();
  }, [fetchKlines]);

  // Cursor (cross / dot) behavior applied to the chart
  useEffect(() => {
    try {
      if (!chartRef.current) return;
      const activeTool = drawingTools.activeTool;
      if (activeTool === 'cursor-cross') {
        chartRef.current.applyOptions({
          crosshair: {
            mode: 1,
            vertLine: { color: '#758fbd', style: 2, width: 1 },
            horzLine: { color: '#758fbd', style: 2, width: 1 },
          },
        });
      } else if (activeTool === 'cursor-dot') {
        chartRef.current.applyOptions({ crosshair: { mode: 0 } });
        // optional: render a small marker via ChartDrawingLayer if needed
      } else {
        chartRef.current.applyOptions({ crosshair: { mode: 0 } });
      }
      console.log('[FIX] cursor applied:', drawingTools.activeTool);
    } catch (err) {
      // ignore
    }
  }, [drawingTools.activeTool]);

  // optional: surface a small loading indicator via state (rendered later)
  const isMarketLoading = marketLoading;

  // Bar spacing and vertical stretch effects

  


  return (
    <div className="flex-1 relative bg-chart-bg">
      {/* Chart Container */}
      <div ref={chartContainerRef} className="absolute inset-0" />
      
      {/* Drawing Layer: render inside chart container via portal so it sits above chart internals */}
      <div className="absolute inset-0" style={{ zIndex: 99999, pointerEvents: 'none', right: `${panelWidthPx}px` }}>
        <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
          <ChartDrawingLayer
            drawings={typeof allDrawings !== 'undefined' ? allDrawings : []}
            activeTool={drawingTools.activeTool}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDrawingClick={(id) => handleDrawingClick(id)}
            onUpdateDrawing={(id, updates) => updateDrawing(id, updates as unknown as Partial<IDrawing>)}
            previewDrawing={previewDrawing}
            crosshair={crosshair}
            containerRef={chartContainerRef}
            chartRef={chartRef}
            seriesRef={seriesRef}
            timeframe={timeframe}
            priceData={priceData}
          />
        </div>
      </div>

      {/* Bottom axis drag catcher (thin) */}
      <div
        className="absolute left-0 bottom-0 h-6 cursor-row-resize"
        onMouseDown={onBottomMouseDown}
        // ensure bottom drag catcher doesn't extend into the MarketPanel
        style={{ background: 'transparent', zIndex: 100000, right: `${panelWidthPx}px` }}
      />

      {/* Right axis drag catcher (thin) */}
      <div
        className="absolute top-0 bottom-0 w-10 cursor-col-resize"
        onMouseDown={onRightMouseDown}
        // ensure right drag catcher sits to the left of the MarketPanel
        style={{ background: 'transparent', zIndex: 100000, right: `${panelWidthPx}px` }}
      />

  {/* Price Scale handle (TradingView-like) */}
  <PriceScaleHandle chartRef={chartRef} priceScaleMarginsRef={priceScaleMarginsRef} onVerticalStretchChange={setVerticalStretch} rightOffsetPx={priceScaleRightOffsetPx} />

      

  {/* Drawing Properties Panel (flotante) */}
  <DrawingPropertiesPanel />

      {/* OHLC Data Display - Top Horizontal */}
      <div className="absolute top-4 left-4 bg-panel-bg/95 backdrop-blur-md rounded-lg px-4 py-2.5 border border-border/50 shadow-lg flex items-center gap-6 text-sm z-10">
        <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-medium">{symbol}</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-panel-bg/60 border border-border/30">{timeframe}</span>
            <span className={`font-bold text-base ${priceChange >= 0 ? "text-bullish" : "text-bearish"}`}>
              {currentPrice.toFixed(2)}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${priceChange >= 0 ? "bg-bullish/20 text-bullish" : "bg-bearish/20 text-bearish"}`}>
              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
            </span>
          </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">O: <span className={`font-semibold ${ohlcData.open <= ohlcData.close ? "text-bullish" : "text-bearish"}`}>{ohlcData.open.toFixed(2)}</span></span>
          <span className="text-muted-foreground">H: <span className="font-semibold text-bullish">{ohlcData.high.toFixed(2)}</span></span>
          <span className="text-muted-foreground">L: <span className="font-semibold text-bearish">{ohlcData.low.toFixed(2)}</span></span>
          <span className="text-muted-foreground">C: <span className={`font-semibold ${ohlcData.close >= ohlcData.open ? "text-bullish" : "text-bearish"}`}>{ohlcData.close.toFixed(2)}</span></span>
          <span className="text-muted-foreground">Vol: <span className="font-semibold text-primary">{ohlcData.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></span>
          {isMarketLoading && (
            <span className="ml-2 text-xs text-muted-foreground">Loading…</span>
          )}
        </div>
      </div>

      {/* Market status banner - top right small badge */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="bg-panel-bg/95 backdrop-blur-md px-3 py-1 rounded-md border border-border/50 text-xs flex items-center gap-3">
          <span className="font-medium">Data:</span>
          <span className="text-muted-foreground">{marketPriceData?.length ?? 0} klines</span>
          <span className={`px-2 py-0.5 rounded text-xs ${marketError ? 'bg-red-600/10 text-red-500' : marketData?.isWsConnected ? 'bg-green-600/10 text-green-400' : 'bg-yellow-600/10 text-yellow-400'}`}>
            {marketError ? 'Error' : marketData?.isWsConnected ? 'WS' : 'No WS'}
          </span>
          <button
            className="ml-2 text-xs text-primary underline"
            onClick={() => {
              try {
                const controller = new AbortController();
                marketData.fetchKlines(controller.signal).then(() => console.log('[FIX] manual fetch ok')).catch((e) => console.warn('[FIX] manual fetch failed', e));
              } catch (err) { console.warn(err); }
            }}
          >Forzar fetch</button>
        </div>
      </div>

      {/* AST Watermark - Bottom Right */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-30 pointer-events-none">
        <TrendingUp className="w-6 h-6 text-primary" />
        <span className="font-bold text-xl tracking-wider">AST</span>
      </div>
    </div>
  );
};

export default TradingChart;
