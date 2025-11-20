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

interface SuspendUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirmSuspend: () => void;
}

export default function SuspendUserModal({
  open,
  onOpenChange,
  userName,
  onConfirmSuspend,
}: SuspendUserModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apturēt kontu?</AlertDialogTitle>
          <AlertDialogDescription className="text-body">
            Lietotājs <strong>{userName}</strong> nevarēs izmantot aplikāciju, kamēr konts būs apturēts.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Atcelt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmSuspend}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            Apturēt
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
