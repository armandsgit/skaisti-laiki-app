import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

const ClientBookings = () => {
  const t = useTranslation('lv');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services(name, price),
        professional_profiles(
          profiles!professional_profiles_user_id_fkey(name, avatar)
        )
      `)
      .eq('client_id', user?.id)
      .order('booking_date', { ascending: false });
    
    if (!error && data) {
      setBookings(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-card border-b sticky top-0 z-10 backdrop-blur-sm bg-card/80">
        <div className="max-w-screen-sm mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Manas rezervācijas</h1>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-6">
        {bookings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground text-lg">Jums vēl nav nevienas rezervācijas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Card 
                key={booking.id} 
                className="border-border/50 overflow-hidden tap-feedback cursor-pointer"
                onClick={() => navigate(`/professional/${booking.professional_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base">
                          {booking.professional_profiles?.profiles?.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {booking.services?.name}
                        </p>
                      </div>
                      
                      <Badge 
                        variant={
                          booking.status === 'confirmed' ? 'default' :
                          booking.status === 'completed' ? 'secondary' :
                          booking.status === 'canceled' ? 'destructive' : 'outline'
                        }
                        className="text-xs px-2.5 py-1 whitespace-nowrap flex-shrink-0"
                      >
                        {t[booking.status as keyof typeof t] || booking.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(booking.booking_date).toLocaleDateString('lv-LV')} • {booking.booking_time}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientBookings;
