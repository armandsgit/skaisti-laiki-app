import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, Briefcase, Calendar, CheckCircle, Sparkles, XCircle, MapPin, Trash2, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PlanBadge from '@/components/PlanBadge';
import DeleteProfessionalModal from '@/components/DeleteProfessionalModal';
import DeleteClientModal from '@/components/DeleteClientModal';
import SuspendUserModal from '@/components/SuspendUserModal';
import RestoreUserModal from '@/components/RestoreUserModal';
import StatusBadge from '@/components/StatusBadge';

const AdminDashboard = () => {
  const t = useTranslation('lv');
  const { signOut } = useAuth();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProfessionals: 0,
    totalBookings: 0,
    starterPlan: 0,
    proPlan: 0,
    premiumPlan: 0,
    activeSubscriptions: 0,
  });
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [deleteClientModalOpen, setDeleteClientModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserType, setSelectedUserType] = useState<'professional' | 'client'>('professional');
  const [selectedClient, setSelectedClient] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [usersData, profsData, clientsData, bookingsData] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact' }),
      supabase.from('professional_profiles').select(`
        *,
        profiles!professional_profiles_user_id_fkey(name, phone, status)
      `),
      supabase.from('profiles').select('*').eq('role', 'CLIENT'),
      supabase.from('bookings').select(`
        *,
        services(name),
        profiles!bookings_client_id_fkey(name),
        professional_profiles(
          profiles!professional_profiles_user_id_fkey(name)
        )
      `).order('created_at', { ascending: false })
    ]);

    const subscriptionStats = {
      starter: profsData.data?.filter(p => p.plan === 'starter').length || 0,
      pro: profsData.data?.filter(p => p.plan === 'pro').length || 0,
      premium: profsData.data?.filter(p => p.plan === 'premium').length || 0,
      active: profsData.data?.filter(p => p.subscription_status === 'active').length || 0,
    };

    setStats({
      totalUsers: usersData.count || 0,
      totalProfessionals: profsData.data?.length || 0,
      totalBookings: bookingsData.data?.length || 0,
      starterPlan: subscriptionStats.starter,
      proPlan: subscriptionStats.pro,
      premiumPlan: subscriptionStats.premium,
      activeSubscriptions: subscriptionStats.active,
    });

    setProfessionals(profsData.data || []);
    setClients(clientsData.data || []);
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

  const handleUpdatePlan = async (id: string, newPlan: string) => {
    const { error } = await supabase
      .from('professional_profiles')
      .update({ 
        plan: newPlan,
        subscription_status: 'active'
      })
      .eq('id', id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success(`Plāns nomainīts uz ${newPlan}`);
      loadData();
    }
  };

  const handleToggleSubscriptionStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('professional_profiles')
      .update({ subscription_status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success(`Abonements ${newStatus === 'active' ? 'aktivizēts' : 'deaktivizēts'}`);
      loadData();
    }
  };

  const handleOpenDeleteModal = (professional: any) => {
    setSelectedProfessional(professional);
    setDeleteModalOpen(true);
  };

  const handleDeleteProfessional = async () => {
    if (!selectedProfessional) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: selectedProfessional.user_id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      toast.success('Profils veiksmīgi izdzēsts.');
      loadData();
    } catch (error) {
      console.error('Error deleting professional:', error);
      toast.error('Neizdevās izdzēst profilu. Lūdzu, mēģiniet vēlreiz.');
    }
  };

  const handleOpenSuspendModal = (user: any, type: 'professional' | 'client') => {
    setSelectedUser(user);
    setSelectedUserType(type);
    setSuspendModalOpen(true);
  };

  const handleOpenRestoreModal = (user: any, type: 'professional' | 'client') => {
    setSelectedUser(user);
    setSelectedUserType(type);
    setRestoreModalOpen(true);
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'suspended' })
      .eq('id', selectedUser.id);

    if (error) {
      toast.error('Kļūda apturot lietotāju');
      return;
    }

    toast.success('Lietotājs apturēts');
    setSuspendModalOpen(false);
    setSelectedUser(null);
    loadData();
  };

  const handleRestoreUser = async () => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', selectedUser.id);

    if (error) {
      toast.error('Kļūda atjaunojot lietotāju');
      return;
    }

    toast.success('Lietotājs atjaunots');
    setRestoreModalOpen(false);
    setSelectedUser(null);
    loadData();
  };

  const handleOpenDeleteClientModal = (client: any) => {
    setSelectedClient(client);
    setDeleteClientModalOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) {
      console.log('No selected client');
      return;
    }

    const clientId = selectedClient.id;
    const clientName = selectedClient.name;
    
    console.log('Starting delete for client:', clientId, clientName);
    const loadingToast = toast.loading('Dzēš klienta profilu...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        toast.dismiss(loadingToast);
        toast.error('Nav autentifikācijas');
        return;
      }

      console.log('Calling delete-user edge function...');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: clientId }),
        }
      );

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      console.log('Deletion successful, updating UI');
      // Immediately remove from local state
      setClients(prev => prev.filter(c => c.id !== clientId));
      
      toast.dismiss(loadingToast);
      toast.success(`Klienta profils "${clientName}" dzēsts`);
      
      // Close modal and clear selected client
      setDeleteClientModalOpen(false);
      setSelectedClient(null);
      
      // Reload data in background to ensure consistency
      setTimeout(() => {
        console.log('Reloading data...');
        loadData();
      }, 500);
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.dismiss(loadingToast);
      toast.error(`Neizdevās izdzēst profilu: ${error.message}`);
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
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-soft flex-shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
                  BeautyOn Admin
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Administratora panelis</p>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={signOut} className="flex-shrink-0">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t.logout}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
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

          <Card className="shadow-card border-0 bg-gradient-to-br from-green-500/10 to-green-600/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktīvie abonēšanas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-3xl font-bold">{stats.activeSubscriptions}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Starter plāns</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{stats.starterPlan}</span>
              <p className="text-xs text-muted-foreground mt-1">meistari</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pro plāns</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{stats.proPlan}</span>
              <p className="text-xs text-muted-foreground mt-1">meistari</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Premium plāns</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{stats.premiumPlan}</span>
              <p className="text-xs text-muted-foreground mt-1">meistari</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full overflow-x-hidden">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4 sm:mb-6 bg-card/80 backdrop-blur-sm gap-1">
            <TabsTrigger value="pending">
              <CheckCircle className="w-4 h-4 mr-2" />
              Gaida apstiprināšanu
            </TabsTrigger>
            <TabsTrigger value="professionals">
              <Briefcase className="w-4 h-4 mr-2" />
              {t.manageProfessionals}
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Users className="w-4 h-4 mr-2" />
              Klienti
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
                    <Card 
                      key={prof.id} 
                      className={prof.is_blocked 
                        ? "border-2 border-destructive bg-destructive/5" 
                        : "border"}
                    >
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
                                <PlanBadge 
                                  plan={prof.plan || 'free'} 
                                  isVerified={prof.is_verified || false}
                                />
                                {prof.is_blocked && (
                                  <Badge variant="destructive">Bloķēts</Badge>
                                )}
                                {!prof.approved && (
                                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                                    Gaida apstiprinājumu
                                  </Badge>
                                )}
                                {prof.subscription_status === 'inactive' && (
                                  <Badge variant="outline" className="border-red-500 text-red-600">
                                    Neaktīvs abonements
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

                          <div className="space-y-3 border-t pt-3">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium min-w-[100px]">Plāns:</label>
                              <Select
                                value={prof.plan || 'starter'}
                                onValueChange={(value) => handleUpdatePlan(prof.id, value)}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="starter">Starter (€0)</SelectItem>
                                  <SelectItem value="pro">Pro (€14.99)</SelectItem>
                                  <SelectItem value="premium">Premium (€24.99)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                              <Button
                                variant={prof.subscription_status === 'active' ? 'outline' : 'default'}
                                size="sm"
                                onClick={() => handleToggleSubscriptionStatus(prof.id, prof.subscription_status || 'inactive')}
                              >
                                {prof.subscription_status === 'active' ? 'Deaktivizēt' : 'Aktivizēt'}
                              </Button>
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
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleOpenDeleteModal(prof)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Klienti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clients.map((client) => (
                    <Card 
                      key={client.id}
                      className={client.status === 'suspended' 
                        ? "border-2 border-destructive bg-destructive/5" 
                        : "border"}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{client.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {client.phone || 'Nav telefona'}
                              </p>
                              <div className="flex gap-2 mt-2">
                              <StatusBadge status={client.status} />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap border-t pt-3">
                          {client.status === 'suspended' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenRestoreModal(client, 'client')}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Atjaunot
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSuspendModal(client, 'client')}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Apturēt
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleOpenDeleteClientModal(client)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Dzēst profilu
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

      <DeleteProfessionalModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        professionalName={selectedProfessional?.profiles?.name || ''}
        onConfirmDelete={handleDeleteProfessional}
      />

      <DeleteClientModal
        open={deleteClientModalOpen}
        onOpenChange={setDeleteClientModalOpen}
        clientName={selectedClient?.name || ''}
        onConfirmDelete={handleDeleteClient}
      />

      <SuspendUserModal
        open={suspendModalOpen}
        onOpenChange={setSuspendModalOpen}
        userName={selectedUser?.name || ''}
        onConfirmSuspend={handleSuspendUser}
      />

      <RestoreUserModal
        open={restoreModalOpen}
        onOpenChange={setRestoreModalOpen}
        userName={selectedUser?.name || ''}
        onConfirmRestore={handleRestoreUser}
      />
    </div>
  );
};

export default AdminDashboard;