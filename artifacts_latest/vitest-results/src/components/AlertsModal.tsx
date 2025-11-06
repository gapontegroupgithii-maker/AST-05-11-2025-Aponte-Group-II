import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

interface AlertsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const AlertsModal = ({ isOpen, onOpenChange }: AlertsModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alerts</DialogTitle>
          <DialogDescription>
            Crea y gestiona alertas de precio. (Placeholder simple)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Price Alert</div>
              <div className="text-xs text-muted-foreground">ETHUSD crosses 2500</div>
            </div>
            <Button size="sm" variant="ghost">Edit</Button>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AlertsModal;
