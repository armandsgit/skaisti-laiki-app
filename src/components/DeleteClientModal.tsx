import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeleteClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  onConfirmDelete: () => void;
}

export default function DeleteClientModal({
  open,
  onOpenChange,
  clientName,
  onConfirmDelete,
}: DeleteClientModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleFinalDelete = () => {
    if (confirmText === 'DZĒST') {
      onConfirmDelete();
      // Don't close immediately - let parent handle closing after deletion
    }
  };

  const handleClose = () => {
    setStep(1);
    setConfirmText('');
    onOpenChange(false);
  };

  const isDeleteEnabled = confirmText === 'DZĒST';

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Vai tiešām vēlies dzēst šo klientu?</AlertDialogTitle>
              <AlertDialogDescription className="text-body">
                Šī darbība neatgriezeniski izdzēsīs visu informāciju par klientu <strong>{clientName}</strong>. To nevar atsaukt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose}>Atcelt</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFirstConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Turpināt dzēst
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Apstiprini galīgo dzēšanu</AlertDialogTitle>
              <AlertDialogDescription className="text-body">
                Lai neatgriezeniski izdzēstu klienta profilu, ieraksti vārdu: <strong>DZĒST</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="confirm-text" className="text-sm font-medium">
                Apstiprinājuma teksts
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Ieraksti: DZĒST"
                className="mt-2"
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose}>Atcelt</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFinalDelete}
                disabled={!isDeleteEnabled}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Dzēst klientu galīgi
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
