import React, { useState, useRef, useEffect } from 'react';
import { IChartApi } from 'lightweight-charts';

interface Props {
  chartRef: React.RefObject<IChartApi | null>;
  priceScaleMarginsRef: React.MutableRefObject<{ top: number; bottom: number }>;
  onVerticalStretchChange?: (v: number) => void;
  rightOffsetPx?: number;
}

const PriceScaleHandle: React.FC<Props> = ({ chartRef, priceScaleMarginsRef, onVerticalStretchChange, rightOffsetPx }) => {
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startMarginsRef = useRef<{ top: number; bottom: number }>({ top: 0.1, bottom: 0.1 });
  const [tooltip, setTooltip] = useState<string | null>(null);

  useEffect(() => {
    const onUp = () => {
      if (dragging) setDragging(false);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  const pointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    startYRef.current = e.clientY;
    startMarginsRef.current = { ...priceScaleMarginsRef.current };
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    setTooltip('');
  };

  const pointerMove = (e: React.PointerEvent) => {
    if (!dragging || !chartRef.current) return;
    const dy = e.clientY - startYRef.current;
    const delta = -dy * 0.0015; // sensitivity: negative because up expands
    const start = startMarginsRef.current;
    const top = Math.max(0, Math.min(0.45, start.top + delta));
    const bottom = Math.max(0, Math.min(0.45, start.bottom - delta));
    try {
      chartRef.current.applyOptions({ rightPriceScale: { scaleMargins: { top, bottom } } });
      priceScaleMarginsRef.current = { top, bottom };
      const avg = (top + bottom) / 2;
      const v = Math.max(0, Math.min(1, avg / 0.4));
      onVerticalStretchChange?.(v);
      setTooltip(`${Math.round(v * 100)}%`);
    } catch (err) {
      // ignore
    }
  };

  const pointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    setTimeout(() => setTooltip(null), 600);
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  };

  const dbl = (e: React.MouseEvent) => {
    // reset to defaults
    try {
      const top = 0.1; const bottom = 0.1;
      chartRef.current?.applyOptions({ rightPriceScale: { scaleMargins: { top, bottom } } });
      priceScaleMarginsRef.current = { top, bottom };
      onVerticalStretchChange?.((top + bottom) / 2 / 0.4);
      setTooltip('reset');
      setTimeout(() => setTooltip(null), 800);
    } catch (err) { /* ignore */ }
  };

  return (
    <div
      role="separator"
      aria-label="Price scale handle"
      className={`absolute top-1/2 -translate-y-1/2 w-10 h-12 rounded-l-md bg-transparent border-l border-border/20 flex items-center justify-center cursor-col-resize ${dragging ? 'opacity-100' : 'opacity-90'}`}
      style={{ zIndex: 100001, pointerEvents: 'auto', right: rightOffsetPx ?? 0 }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onDoubleClick={dbl}
    >
      <div className="relative w-4 h-6 flex flex-col justify-center items-center gap-1 pointer-events-none">
        <div className="w-3 h-0.5 bg-border rounded" />
        <div className="w-3 h-0.5 bg-border rounded" />
        <div className="w-3 h-0.5 bg-border rounded" />
      </div>
      {tooltip && (
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 bg-panel-bg/95 px-2 py-1 rounded text-xs border border-border/40 pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
};

export default PriceScaleHandle;
