import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string | null;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  // User status badges (for profiles)
  if (status === 'suspended') {
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
        Apturēts
      </Badge>
    );
  }

  if (status === 'deleted') {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">
        Dzēsts
      </Badge>
    );
  }

  // Booking status badges
  if (status === 'confirmed') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-300">
        Apstiprināta
      </Badge>
    );
  }

  if (status === 'pending') {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-300">
        Gaida apstiprinājumu
      </Badge>
    );
  }

  if (status === 'completed') {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-300">
        Pabeigta
      </Badge>
    );
  }

  if (status === 'cancelled_by_master' || status === 'canceled_by_master') {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300">
        Atcelta meistara dēļ
      </Badge>
    );
  }

  if (status === 'cancelled_by_client' || status === 'canceled_by_client') {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300">
        Atcelta klienta dēļ
      </Badge>
    );
  }

  if (status === 'cancelled_system' || status === 'canceled_system' || status === 'canceled') {
    return (
      <Badge className="bg-gray-100 text-gray-800 border-gray-300">
        Atcelta automātiski
      </Badge>
    );
  }

  // Default active status (for profiles)
  return (
    <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
      Aktīvs
    </Badge>
  );
}
