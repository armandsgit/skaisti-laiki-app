import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { lv } from 'date-fns/locale';

interface UpcomingBookingCardProps {
  booking: {
    id: string;
    booking_date: string;
    booking_time: string;
    status: 'pending' | 'confirmed' | 'completed' | 'canceled';
    services: { name: string; price: number };
    profiles: { name: string; phone: string; email?: string };
    completed_by?: string | null;
    auto_completed_at?: string | null;
  };
  onClick: () => void;
}

export const UpcomingBookingCard = ({ booking, onClick }: UpcomingBookingCardProps) => {
  const statusColors = {
    pending: 'bg-warning/10 text-warning border-warning/20',
    confirmed: 'bg-foreground/5 text-foreground border-foreground/10',
    completed: 'bg-success/10 text-success border-success/20',
    canceled: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const statusLabels = {
    pending: 'Gaida',
    confirmed: 'Apstiprināts',
    completed: 'Pabeigts',
    canceled: 'Atcelts',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="border-border/50 shadow-card cursor-pointer overflow-hidden tap-feedback"
        onClick={onClick}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-foreground">
                <Calendar className="w-4 h-4 text-background stroke-[2]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-foreground">
                  {format(new Date(booking.booking_date), 'dd MMM', { locale: lv })}
                </p>
                <p className="text-[13px] text-muted-foreground">{booking.booking_time}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={`${statusColors[booking.status]} border`}>
                {statusLabels[booking.status]}
              </Badge>
              {booking.status === 'completed' && booking.completed_by === 'auto' && (
                <span className="text-[10px] text-muted-foreground">automātiski</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[14px]">
              <User className="w-4 h-4 text-muted-foreground stroke-[1.5]" />
              <span className="text-foreground font-medium">{booking.profiles.name}</span>
            </div>
            {booking.profiles.email && (
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-muted-foreground">📧 {booking.profiles.email}</span>
              </div>
            )}
            {booking.profiles.phone && (
              <div className="flex items-center gap-2 text-[13px]">
                <Phone className="w-4 h-4 text-muted-foreground stroke-[1.5]" />
                <span className="text-muted-foreground">{booking.profiles.phone}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">{booking.services.name}</span>
            <span className="text-[18px] font-bold text-foreground">
              €{booking.services.price}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
