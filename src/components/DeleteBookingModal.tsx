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

interface DeleteBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingDetails: string;
  onConfirmDelete: () => Promise<boolean | void>;
}

export default function DeleteBookingModal({
  open,
  onOpenChange,
  bookingDetails,
  onConfirmDelete,
}: DeleteBookingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFirstConfirm = () => {
    console.log("=== BOOKING DELETE STEP 1: Moving to confirmation ===");
    setStep(2);
  };

  const handleFinalDelete = async () => {
    console.log("=== BOOKING DELETE STEP 2: Final delete button clicked ===");
    console.log("Confirm text:", confirmText);
    
    if (confirmText === 'DZĒST' && !isDeleting) {
      console.log("=== Calling onConfirmDelete ===");
      setIsDeleting(true);
      
      try {
        const result = await onConfirmDelete();
        console.log("Delete result:", result);
        setIsDeleting(false);
        
        if (result !== false) {
          handleClose();
        }
      } catch (error) {
        console.error("Delete failed in modal:", error);
        setIsDeleting(false);
      }
    }
  };

  const handleClose = () => {
    console.log("=== Closing booking delete modal ===");
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
              <AlertDialogTitle>Vai tiešām vēlies dzēst šo rezervāciju?</AlertDialogTitle>
              <AlertDialogDescription className="text-body">
                Šī darbība izdzēsīs rezervāciju: <strong>{bookingDetails}</strong>. To nevarēs atsaukt. Vai esi pārliecināts?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose}>Atcelt</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleFirstConfirm();
                }}
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
                Lai apstiprinātu šīs rezervācijas neatgriezenisku dzēšanu, ieraksti vārdu: <strong>DZĒST</strong>
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
                onClick={(e) => {
                  e.preventDefault();
                  handleFinalDelete();
                }}
                disabled={!isDeleteEnabled}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Dzēš..." : "Dzēst rezervāciju galīgi"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
