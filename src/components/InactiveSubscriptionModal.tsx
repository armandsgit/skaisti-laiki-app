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
import { useNavigate } from 'react-router-dom';

interface InactiveSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InactiveSubscriptionModal({ open, onOpenChange }: InactiveSubscriptionModalProps) {
  const navigate = useNavigate();

  const handleActivate = () => {
    navigate('/subscription-plans');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Abonements nav aktīvs</AlertDialogTitle>
          <AlertDialogDescription>
            Tavs abonements nav aktīvs. Aktivizē plānu, lai turpinātu izmantot visus platformas pakalpojumus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Atcelt</AlertDialogCancel>
          <AlertDialogAction onClick={handleActivate}>Izvēlēties plānu</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
