import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

export function CloseWarningDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Listen for the close warning event from main process
    const handleShowCloseWarning = () => {
      setIsOpen(true);
    };

    window.electronAPI.on('show-close-warning', handleShowCloseWarning);

    return () => {
      window.electronAPI.removeAllListeners('show-close-warning');
    };
  }, []);

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleConfirm = async () => {
    setIsOpen(false);
    // Confirm the close action to the main process
    await window.electronAPI.confirmCloseApp();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <AlertDialogTitle>Active Render Warning</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            A Blender render is currently active. Closing the application will interrupt the active render and may result in incomplete output.
            <br /><br />
            Are you sure you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Close Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}