import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, Briefcase, Calendar, CheckCircle, Sparkles, XCircle, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const t = useTranslation('lv');
  const { signOut } = useAuth();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProfessionals: 0,
    totalBookings: 0
  });
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [usersData, profsData, bookingsData] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact' }),
      supabase.from('professional_profiles').select(`
        *,
        profiles!professional_profiles_user_id_fkey(name, phone)
      `),
      supabase.from('bookings').select(`
        *,
        services(name),
        profiles!bookings_client_id_fkey(name),
        professional_profiles(
          profiles!professional_profiles_user_id_fkey(name)
        )
      `).order('created_at', { ascending: false })
    ]);

    setStats({
      totalUsers: usersData.count || 0,
      totalProfessionals: profsData.data?.length || 0,
      totalBookings: bookingsData.data?.length || 0
    });

    setProfessionals(profsData.data || []);
    setBookings(bookingsData.data || []);
    setLoading(false);
  };

  const handleVerifyProfessional = async (id: string, isVerified: boolean) => {
    const { error } = await supabase
      .from('professional_profiles')
      .update({ is_verified: !isVerified })
      .eq('id', id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success(isVerified ? 'Verificēšana atcelta' : 'Verificēts veiksmīgi!');
      loadData();
    }
  };

  const handleBlockProfessional = async (id: string, isBlocked: boolean) => {
    const { error } = await supabase
      .from('professional_profiles')
      .update({ is_blocked: !isBlocked })
      .eq('id', id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success(isBlocked ? 'Meistars atbloķēts' : 'Meistars bloķēts');
      loadData();
    }
  };

  const handleApproveProfessional = async (id: string) => {
    const { error } = await supabase
      .from('professional_profiles')
      .update({ approved: true })
      .eq('id', id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success('Meistars apstiprināts!');
      loadData();
    }
  };

  const handleRejectProfessional = async (id: string) => {
    const { error } = await supabase
      .from('professional_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success('Meistars noraidīts');
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary">
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-soft">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                BeautyOn Admin
              </h1>
              <p className="text-xs text-muted-foreground">Administratora panelis</p>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            {t.logout}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="shadow-card border-0 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.totalUsers}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold">{stats.totalUsers}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.totalProfessionals}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold">{stats.totalProfessionals}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.totalBookings}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold">{stats.totalBookings}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-card/80 backdrop-blur-sm">
            <TabsTrigger value="pending">
              <CheckCircle className="w-4 h-4 mr-2" />
              Gaida apstiprināšanu
            </TabsTrigger>
            <TabsTrigger value="professionals">
              <Briefcase className="w-4 h-4 mr-2" />
              {t.manageProfessionals}
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="w-4 h-4 mr-2" />
              {t.manageBookings}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Meistari, kas gaida apstiprināšanu</CardTitle>
              </CardHeader>
              <CardContent>
                {professionals.filter(p => !p.approved).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nav meistaru, kas gaida apstiprināšanu
                  </p>
                ) : (
                  <div className="space-y-4">
                    {professionals.filter(p => !p.approved).map((prof) => (
                      <Card key={prof.id} className="border border-amber-200 bg-amber-50/50">
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg">{prof.profiles?.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {prof.profiles?.phone || 'Nav telefona'}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="secondary">{prof.category}</Badge>
                                  <Badge variant="outline">{prof.city}</Badge>
                                </div>
                              </div>
                            </div>
                            
                            {prof.address && (
                              <div className="border-t pt-3">
                                <div className="flex items-start gap-2 text-sm">
                                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">Adrese:</p>
                                    <p className="text-muted-foreground">{prof.address}</p>
                                    {prof.latitude && prof.longitude && (
                                      <a
                                        href={`https://www.google.com/maps?q=${prof.latitude},${prof.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline text-xs mt-1 inline-block"
                                      >
                                        Skatīt kartē →
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {prof.bio && (
                              <div className="border-t pt-3">
                                <p className="text-sm"><strong>Bio:</strong> {prof.bio}</p>
                              </div>
                            )}

                            {prof.profiles?.phone && (
                              <div className="border-t pt-3">
                                <p className="text-sm"><strong>Telefons:</strong> {prof.profiles.phone}</p>
                              </div>
                            )}
                            
                            <div className="flex gap-2 border-t pt-3">
                              <Button
                                size="sm"
                                onClick={() => handleApproveProfessional(prof.id)}
                                className="flex-1"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Apstiprināt
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectProfessional(prof.id)}
                                className="flex-1"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Noraidīt
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professionals" className="space-y-4">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>{t.manageProfessionals}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {professionals.map((prof) => (
                    <Card key={prof.id} className="border">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{prof.profiles?.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {prof.profiles?.phone || 'Nav telefona'}
                              </p>
                              <div className="flex gap-2 mt-2 flex-wrap">
                                <Badge variant="secondary">{prof.category}</Badge>
                                <Badge variant="outline">{prof.city}</Badge>
                                {prof.is_verified && (
                                  <Badge variant="default">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {t.verified}
                                  </Badge>
                                )}
                                {prof.is_blocked && (
                                  <Badge variant="destructive">Bloķēts</Badge>
                                )}
                                {!prof.approved && (
                                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                                    Gaida apstiprinājumu
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {prof.address && (
                            <div className="border-t pt-3">
                              <div className="flex items-start gap-2 text-sm">
                                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">Adrese:</p>
                                  <p className="text-muted-foreground">{prof.address}</p>
                                  {prof.latitude && prof.longitude && (
                                    <a
                                      href={`https://www.google.com/maps?q=${prof.latitude},${prof.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline text-xs mt-1 inline-block"
                                    >
                                      Skatīt kartē →
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {prof.bio && (
                            <div className="border-t pt-3">
                              <p className="text-sm"><strong>Bio:</strong> {prof.bio}</p>
                            </div>
                          )}

                          <div className="flex gap-2 border-t pt-3 flex-wrap">
                            <Button
                              variant={prof.is_verified ? 'outline' : 'default'}
                              size="sm"
                              onClick={() => handleVerifyProfessional(prof.id, prof.is_verified)}
                            >
                              {prof.is_verified ? 'Atcelt verificēšanu' : t.verifyProfessional}
                            </Button>
                            <Button
                              variant={prof.is_blocked ? 'default' : 'destructive'}
                              size="sm"
                              onClick={() => handleBlockProfessional(prof.id, prof.is_blocked)}
                            >
                              {prof.is_blocked ? 'Atbloķēt' : 'Bloķēt'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>{t.manageBookings}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <Card key={booking.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">
                              {booking.profiles?.name} → {booking.professional_profiles?.profiles?.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {booking.services?.name}
                            </p>
                            <p className="text-sm mt-2">
                              {new Date(booking.booking_date).toLocaleDateString('lv-LV')} • {booking.booking_time}
                            </p>
                          </div>
                          
                          <Badge 
                            variant={
                              booking.status === 'confirmed' ? 'default' :
                              booking.status === 'completed' ? 'secondary' :
                              booking.status === 'canceled' ? 'destructive' : 'outline'
                            }
                          >
                            {t[booking.status as keyof typeof t] || booking.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;