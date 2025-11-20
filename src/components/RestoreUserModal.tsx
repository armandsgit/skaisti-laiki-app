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

interface RestoreUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirmRestore: () => void;
}

export default function RestoreUserModal({
  open,
  onOpenChange,
  userName,
  onConfirmRestore,
}: RestoreUserModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Atjaunot kontu?</AlertDialogTitle>
          <AlertDialogDescription className="text-body">
            Konts <strong>{userName}</strong> tiks pilnībā aktivizēts un būs redzams meklēšanā.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Atcelt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmRestore}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Atjaunot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
