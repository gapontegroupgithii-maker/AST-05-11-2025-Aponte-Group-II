import React from 'react';

interface Props {
  barSpacing: number;
  onBarSpacingChange: (v: number) => void;
  verticalStretch: number;
  onVerticalStretchChange: (v: number) => void;
  onAddHLine: () => void;
  onRemoveSelected: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  crosshairOn: boolean;
  onToggleCrosshair: () => void;
  gridOn: boolean;
  onToggleGrid: () => void;
  onSnapshot: () => void;
}

const ChartControls: React.FC<Props> = ({ barSpacing, onBarSpacingChange, verticalStretch, onVerticalStretchChange, onAddHLine, onRemoveSelected, onZoomIn, onZoomOut, onResetZoom, crosshairOn, onToggleCrosshair, gridOn, onToggleGrid, onSnapshot }) => {
  const changeTimeframe = (tf: string) => {
    try { window.dispatchEvent(new CustomEvent('timeframeChange', { detail: tf })); } catch (e) { /* ignore */ }
  };

  return (
    <div className="absolute left-4 top-20 z-50 bg-panel-bg/95 backdrop-blur-md rounded-lg p-3 border border-border/60 shadow-md w-44">
      <div className="text-sm font-semibold mb-2">Controles</div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button className="flex-1 btn" onClick={onZoomIn}>+</button>
          <button className="flex-1 btn" onClick={onZoomOut}>−</button>
          <button className="flex-1 btn" onClick={onResetZoom}>Reset</button>
        </div>
        <div className="flex gap-2">
          <button className={`flex-1 btn ${crosshairOn ? 'bg-primary text-white' : ''}`} onClick={onToggleCrosshair}>Crosshair</button>
          <button className={`flex-1 btn ${gridOn ? 'bg-primary text-white' : ''}`} onClick={onToggleGrid}>Grid</button>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 btn" onClick={onSnapshot}>Snapshot</button>
          <button className="flex-1 btn" onClick={onAddHLine}>H-Line</button>
        </div>

        <div className="pt-2">
          <div className="text-xs text-muted-foreground mb-1">Timeframe</div>
          <div className="flex gap-1">
            <button className="px-2 py-1 bg-secondary rounded text-xs" onClick={() => changeTimeframe('1m')}>1m</button>
            <button className="px-2 py-1 bg-secondary rounded text-xs" onClick={() => changeTimeframe('5m')}>5m</button>
            <button className="px-2 py-1 bg-secondary rounded text-xs" onClick={() => changeTimeframe('15m')}>15m</button>
            <button className="px-2 py-1 bg-secondary rounded text-xs" onClick={() => changeTimeframe('1h')}>1h</button>
            <button className="px-2 py-1 bg-secondary rounded text-xs" onClick={() => changeTimeframe('1d')}>1d</button>
          </div>
        </div>

        <div className="pt-2">
          <div className="text-xs text-muted-foreground">Ancho (bar spacing): {barSpacing.toFixed(0)}</div>
          <input type="range" min={2} max={50} value={barSpacing} onChange={(e) => onBarSpacingChange(Number(e.target.value))} className="w-full" />
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Estiramiento vertical: {verticalStretch.toFixed(2)}</div>
          <input type="range" min={0} max={1} step={0.01} value={verticalStretch} onChange={(e) => onVerticalStretchChange(Number(e.target.value))} className="w-full" />
        </div>

        <div className="flex gap-2">
          <button className="flex-1 bg-rose-600 text-white rounded py-1" onClick={onRemoveSelected}>Eliminar</button>
        </div>
      </div>
    </div>
  );
};

export default ChartControls;
