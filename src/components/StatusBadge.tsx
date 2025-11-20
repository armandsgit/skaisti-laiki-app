import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string | null;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
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

  return (
    <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
      Aktīvs
    </Badge>
  );
}
