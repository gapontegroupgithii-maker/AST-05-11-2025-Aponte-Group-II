import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

interface Indicator {
  id: string;
  name: string;
  params: Record<string, unknown>;
}

interface IndicatorsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenStarScriptEditor?: (id: string, content: string) => void;
}

const STORAGE_KEY = 'star_script_indicators';

function loadIndicators(): Indicator[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIndicators(list: Indicator[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const IndicatorsModal = ({ isOpen, onOpenChange, onOpenStarScriptEditor }: IndicatorsModalProps) => {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [newName, setNewName] = useState('');
  const [newParams, setNewParams] = useState('');

  useEffect(() => {
    if (isOpen) setIndicators(loadIndicators());
  }, [isOpen]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newIndicator: Indicator = {
      id: Date.now().toString(),
      name: newName,
      params: newParams ? { params: newParams } : {},
    };
    const updated = [...indicators, newIndicator];
    setIndicators(updated);
    saveIndicators(updated);
    setNewName('');
    setNewParams('');
  };

  const handleDelete = (id: string) => {
    const updated = indicators.filter(i => i.id !== id);
    setIndicators(updated);
    saveIndicators(updated);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    const ind = indicators.find(i => i.id === id);
    setNewName(ind?.name || '');
    setNewParams(ind?.params?.params || '');
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const updated = indicators.map(i =>
      i.id === editingId ? { ...i, name: newName, params: { params: newParams } } : i
    );
    setIndicators(updated);
    saveIndicators(updated);
    setEditingId(null);
    setNewName('');
    setNewParams('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Indicators & Strategies</DialogTitle>
            <DialogDescription>
              Añade, edita o elimina indicadores y estrategias guardadas en Star Script.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {indicators.length === 0 && (
              <div className="text-xs text-muted-foreground">No hay indicadores guardados.</div>
            )}
            {indicators.map(ind => (
              <div key={ind.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{ind.name}</div>
                  <div className="text-xs text-muted-foreground">{ind.params?.params || ''}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(ind.id)}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(ind.id)}>Eliminar</Button>
                  <Button size="sm" variant="outline" title="Editar en Star Script" onClick={() => { onOpenStarScriptEditor?.(ind.id, ind.params?.params || ''); onOpenChange(false); }}>
                    {'{ }'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="font-semibold text-sm mb-2">Agregar nuevo indicador/estrategia</div>
            <input
              className="border rounded px-2 py-1 w-full mb-2 text-black bg-white"
              placeholder="Nombre"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              disabled={!!editingId}
            />
            <input
              className="border rounded px-2 py-1 w-full mb-2 text-black bg-white"
              placeholder="Parámetros (ej: Length: 20)"
              value={newParams}
              onChange={e => setNewParams(e.target.value)}
              disabled={!!editingId}
            />
            {!editingId ? (
              <Button size="sm" onClick={handleAdd}>Agregar</Button>
            ) : (
              <Button size="sm" onClick={handleSaveEdit}>Guardar cambios</Button>
            )}
            {editingId && (
              <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setNewName(''); setNewParams(''); }}>Cancelar</Button>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
};

export default IndicatorsModal;
