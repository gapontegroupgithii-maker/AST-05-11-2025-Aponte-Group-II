import React from 'react';
import { useDrawingStore } from '@/store/drawingStore';

const DrawingPropertiesPanel: React.FC = () => {
  const selectedId = useDrawingStore(state => state.selectedDrawingId);
  const drawings = useDrawingStore(state => state.drawings);
  const updateDrawing = useDrawingStore(state => state.updateDrawing);
  const removeDrawing = useDrawingStore(state => state.removeDrawing);
  const selectDrawing = useDrawingStore(state => state.selectDrawing);
  const resetClickCount = useDrawingStore(state => state.resetClickCount);
  const deselectDrawing = useDrawingStore(state => state.deselectDrawing);

  const drawing = drawings.find(d => d.id === selectedId);
  if (!drawing) return null;

  const onChangeColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateDrawing(drawing.id, { options: { ...drawing.options, color: e.target.value } as unknown });
  };
  const onChangeWidth = (e: React.ChangeEvent<HTMLInputElement>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateDrawing(drawing.id, { options: { ...drawing.options, lineWidth: Number(e.target.value) } as unknown });
  };
  const onChangeOpacity = (e: React.ChangeEvent<HTMLInputElement>) => {
    // store opacity in fillColor alpha or as new option; we'll add an opacity field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateDrawing(drawing.id, { options: { ...drawing.options, opacity: Number(e.target.value) } as unknown });
  };

  const onChangeBoxX = (e: React.ChangeEvent<HTMLInputElement>) => {
    const x = Number(e.target.value);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateDrawing(drawing.id, { options: { ...(drawing.options as unknown), boxPosition: { x, y: (drawing.options as unknown).boxPosition?.y ?? 0 } } as unknown });
  };

  const onChangeBoxY = (e: React.ChangeEvent<HTMLInputElement>) => {
    const y = Number(e.target.value);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateDrawing(drawing.id, { options: { ...(drawing.options as unknown), boxPosition: { x: (drawing.options as unknown).boxPosition?.x ?? 0, y } } as unknown });
  };

  const onResetBox = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts = { ...(drawing.options as unknown) };
    // remove boxPosition if present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((opts as unknown).boxPosition) delete (opts as unknown).boxPosition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateDrawing(drawing.id, { options: opts as unknown });
  };

  const onDelete = () => {
    removeDrawing(drawing.id);
    resetClickCount(drawing.id);
    deselectDrawing();
  };

  return (
    <div className="absolute top-20 right-6 z-50 bg-panel-bg/95 backdrop-blur-md rounded-lg px-4 py-3 border border-border/60 shadow-lg w-56">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Propiedades</div>
  <button className="text-xs text-muted-foreground" onClick={() => deselectDrawing()}>Cerrar</button>
      </div>
      <div className="text-xs text-muted-foreground mb-1">Color</div>
      <input type="color" value={drawing.options.color} onChange={onChangeColor} className="w-full h-8 mb-3 p-0" />
      <div className="text-xs text-muted-foreground mb-1">Grosor</div>
      <input type="range" min={1} max={8} value={drawing.options.lineWidth} onChange={onChangeWidth} className="w-full mb-3" />
      <div className="text-xs text-muted-foreground mb-1">Opacidad</div>
  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
  <input type="range" min={0.1} max={1} step={0.05} value={(drawing.options as unknown).opacity ?? 1} onChange={onChangeOpacity} className="w-full mb-3" />
      {drawing.type === 'ruler' && (
        <>
          <div className="text-xs text-muted-foreground mb-1">Posición caja X</div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <input type="number" value={(drawing.options as unknown).boxPosition?.x ?? ''} onChange={onChangeBoxX} className="w-full mb-2 p-1 text-sm" />
          <div className="text-xs text-muted-foreground mb-1">Posición caja Y</div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <input type="number" value={(drawing.options as unknown).boxPosition?.y ?? ''} onChange={onChangeBoxY} className="w-full mb-2 p-1 text-sm" />
          <button className="w-full bg-slate-600 hover:bg-slate-500 text-white rounded py-1 mb-3 text-sm" onClick={onResetBox}>Restablecer posición caja</button>
        </>
      )}
      <button className="w-full bg-rose-600 hover:bg-rose-500 text-white rounded py-2" onClick={onDelete}>Eliminar</button>
    </div>
  );
};

export default DrawingPropertiesPanel;
