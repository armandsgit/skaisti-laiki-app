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

interface DeleteProfessionalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalName: string;
  onConfirmDelete: () => Promise<boolean | void>;
}

export default function DeleteProfessionalModal({
  open,
  onOpenChange,
  professionalName,
  onConfirmDelete,
}: DeleteProfessionalModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleFinalDelete = async () => {
    if (confirmText === 'DZĒST' && !isDeleting) {
      setIsDeleting(true);
      const result = await onConfirmDelete();
      setIsDeleting(false);
      if (result !== false) {
        handleClose();
      }
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setStep(1);
      setConfirmText('');
      onOpenChange(false);
    }
  };

  const isDeleteEnabled = confirmText === 'DZĒST' && !isDeleting;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Vai tiešām vēlies dzēst šo profilu?</AlertDialogTitle>
              <AlertDialogDescription className="text-body">
                Šī darbība izdzēsīs meistara <strong>{professionalName}</strong> kontu, rezervācijas, pakalpojumus un visus saistītos datus. To nevarēs atsaukt. Vai esi pārliecināts?
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
                Lai apstiprinātu šī profila neatgriezenisku dzēšanu, ieraksti vārdu: <strong>DZĒST</strong>
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
                {isDeleting ? "Dzēš..." : "Dzēst profilu galīgi"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
