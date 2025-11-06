import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

interface ReplayModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReplayModal = ({ isOpen, onOpenChange }: ReplayModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replay</DialogTitle>
          <DialogDescription>
            Reproduce histórico de mercado (placeholder).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <div className="text-sm">Seleccione rango y presiona Play para reproducir.</div>
          <div className="flex gap-2 mt-3">
            <Button size="sm">Play</Button>
            <Button size="sm" variant="ghost">Pause</Button>
            <Button size="sm" variant="ghost">Stop</Button>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReplayModal;
