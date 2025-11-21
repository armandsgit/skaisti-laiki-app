import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/translations";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  Users,
  Briefcase,
  Calendar,
  CheckCircle,
  Sparkles,
  XCircle,
  MapPin,
  Trash2,
  Ban,
  Power,
  ShieldCheck,
  ShieldOff,
  Lock,
  Unlock,
  Tags,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LocationMap from "@/components/LocationMap";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlanBadge from "@/components/PlanBadge";
import DeleteProfessionalModal from "@/components/DeleteProfessionalModal";
import DeleteClientModal from "@/components/DeleteClientModal";
import SuspendUserModal from "@/components/SuspendUserModal";
import RestoreUserModal from "@/components/RestoreUserModal";
import StatusBadge from "@/components/StatusBadge";
import CategoryManager from "@/components/CategoryManager";

const AdminDashboard = () => {
  const t = useTranslation("lv");
  const { signOut, user } = useAuth();
  const location = useLocation();

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
  const [selectedUserType, setSelectedUserType] = useState<"professional" | "client">("professional");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<"pending" | "professionals" | "clients" | "bookings" | "categories">(
    "pending",
  );

  // Sync selectedTab with URL parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab && ["pending", "professionals", "clients", "bookings", "categories"].includes(tab)) {
      setSelectedTab(tab as any);
    }
  }, [location.search]);

  // Scroll to section when tab changes
  useEffect(() => {
    const sectionId = `section-${selectedTab}`;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedTab]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [usersData, profsData, clientsData, bookingsData] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact" }),
      supabase.from("professional_profiles").select(`
        *,
        profiles!professional_profiles_user_id_fkey(name, phone, status)
      `),
      supabase.from("profiles").select("*").eq("role", "CLIENT"),
      supabase
        .from("bookings")
        .select(
          `
        *,
        services(name),
        profiles!bookings_client_id_fkey(name),
        professional_profiles(
          profiles!professional_profiles_user_id_fkey(name)
        )
      `,
        )
        .order("created_at", { ascending: false }),
    ]);

    const subscriptionStats = {
      starter: profsData.data?.filter((p) => p.plan === "starter").length || 0,
      pro: profsData.data?.filter((p) => p.plan === "pro").length || 0,
      premium: profsData.data?.filter((p) => p.plan === "premium").length || 0,
      active: profsData.data?.filter((p) => p.subscription_status === "active").length || 0,
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
    const { error } = await supabase.from("professional_profiles").update({ is_verified: !isVerified }).eq("id", id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success(isVerified ? "Verificēšana atcelta" : "Verificēts veiksmīgi!");
      loadData();
    }
  };

  const handleBlockProfessional = async (id: string, isBlocked: boolean) => {
    const { error } = await supabase.from("professional_profiles").update({ is_blocked: !isBlocked }).eq("id", id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success(isBlocked ? "Meistars atbloķēts" : "Meistars bloķēts");
      loadData();
    }
  };

  const handleApproveProfessional = async (id: string) => {
    const { error } = await supabase.from("professional_profiles").update({ approved: true }).eq("id", id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success("Meistars apstiprināts!");
      loadData();
    }
  };

  const handleRejectProfessional = async (id: string) => {
    const { error } = await supabase.from("professional_profiles").delete().eq("id", id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success("Meistars noraidīts");
      loadData();
    }
  };

  const handleUpdatePlan = async (id: string, newPlan: string) => {
    const { error } = await supabase
      .from("professional_profiles")
      .update({
        plan: newPlan,
        subscription_status: "active",
      })
      .eq("id", id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success(`Plāns nomainīts uz ${newPlan}`);
      loadData();
    }
  };

  const handleToggleSubscriptionStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("professional_profiles")
      .update({ subscription_status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success(`Abonements ${newStatus === "active" ? "aktivizēts" : "deaktivizēts"}`);
      loadData();
    }
  };

  const handleOpenDeleteModal = (professional: any) => {
    // Prevent admin from deleting their own profile
    if (professional.user_id === user?.id) {
      toast.error("Nevar izdzēst savu profilu!");
      return;
    }
    setSelectedProfessional(professional);
    setDeleteModalOpen(true);
  };

  const handleDeleteProfessional = async () => {
    if (!selectedProfessional) return;

    // Double-check to prevent self-deletion
    if (selectedProfessional.user_id === user?.id) {
      toast.error("Nevar izdzēst savu profilu!");
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: selectedProfessional.user_id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      toast.success("Profils veiksmīgi izdzēsts.");
      loadData();
    } catch (error) {
      console.error("Error deleting professional:", error);
      toast.error("Neizdevās izdzēst profilu. Lūdzu, mēģiniet vēlreiz.");
    }
  };

  const handleOpenSuspendModal = (user: any, type: "professional" | "client") => {
    // Prevent admin from suspending their own profile
    if (user.id === user?.id || (type === "professional" && user.user_id === user?.id)) {
      toast.error("Nevar apturēt savu profilu!");
      return;
    }
    setSelectedUser(user);
    setSelectedUserType(type);
    setSuspendModalOpen(true);
  };

  const handleOpenRestoreModal = (user: any, type: "professional" | "client") => {
    setSelectedUser(user);
    setSelectedUserType(type);
    setRestoreModalOpen(true);
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;

    // Double-check to prevent self-suspension
    if (selectedUser.id === user?.id || selectedUser.user_id === user?.id) {
      toast.error("Nevar apturēt savu profilu!");
      setSuspendModalOpen(false);
      return;
    }

    const { error } = await supabase.from("profiles").update({ status: "suspended" }).eq("id", selectedUser.id);

    if (error) {
      toast.error("Kļūda apturot lietotāju");
      return;
    }

    toast.success("Lietotājs apturēts");
    setSuspendModalOpen(false);
    setSelectedUser(null);
    loadData();
  };

  const handleRestoreUser = async () => {
    if (!selectedUser) return;

    const { error } = await supabase.from("profiles").update({ status: "active" }).eq("id", selectedUser.id);

    if (error) {
      toast.error("Kļūda atjaunojot lietotāju");
      return;
    }

    toast.success("Lietotājs atjaunots");
    setRestoreModalOpen(false);
    setSelectedUser(null);
    loadData();
  };

  const handleOpenDeleteClientModal = (client: any) => {
    // Prevent admin from deleting their own profile
    if (client.id === user?.id) {
      toast.error("Nevar izdzēst savu profilu!");
      return;
    }
    setSelectedClient(client);
    setDeleteClientModalOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) {
      console.log("No selected client");
      return;
    }

    // Double-check to prevent self-deletion
    if (selectedClient.id === user?.id) {
      toast.error("Nevar izdzēst savu profilu!");
      setDeleteClientModalOpen(false);
      return;
    }

    const clientId = selectedClient.id;
    const clientName = selectedClient.name;

    console.log("Starting delete for client:", clientId, clientName);
    const loadingToast = toast.loading("Dzēš klienta profilu...");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session found");
        toast.dismiss(loadingToast);
        toast.error("Nav autentifikācijas");
        return;
      }

      console.log("Calling delete-user edge function...");
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: clientId }),
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response result:", result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      console.log("Deletion successful, updating UI");
      // Immediately remove from local state
      setClients((prev) => prev.filter((c) => c.id !== clientId));

      toast.dismiss(loadingToast);
      toast.success(`Klienta profils "${clientName}" dzēsts`);

      // Close modal and clear selected client
      setDeleteClientModalOpen(false);
      setSelectedClient(null);

      // Reload data in background to ensure consistency
      setTimeout(() => {
        console.log("Reloading data...");
        loadData();
      }, 500);
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.dismiss(loadingToast);
      toast.error(`Neizdevās izdzēst profilu: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/95 backdrop-blur-sm border-b shadow-soft sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-elegant flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold">
                  BeautyOn Admin
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">Administratora panelis</p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={signOut} className="flex-shrink-0">
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t.logout}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 overflow-x-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-card border bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.totalUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                <span className="text-3xl font-bold">{stats.totalUsers}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.totalProfessionals}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-primary" />
                <span className="text-3xl font-bold">{stats.totalProfessionals}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.totalBookings}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />
                <span className="text-3xl font-bold">{stats.totalBookings}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aktīvie abonēšanas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="text-3xl font-bold text-green-600">{stats.activeSubscriptions}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="shadow-card border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Starter plāns</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{stats.starterPlan}</span>
              <p className="text-sm text-muted-foreground mt-1">meistari</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pro plāns</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{stats.proPlan}</span>
              <p className="text-sm text-muted-foreground mt-1">meistari</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Premium plāns</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{stats.premiumPlan}</span>
              <p className="text-sm text-muted-foreground mt-1">meistari</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <button
            onClick={() => setSelectedTab("pending")}
            className={`p-5 rounded-2xl border-2 transition-all tap-feedback ${
              selectedTab === "pending"
                ? "border-primary bg-primary/10 shadow-card"
                : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
            }`}
          >
            <CheckCircle
              className={`w-8 h-8 mx-auto mb-2 ${selectedTab === "pending" ? "text-primary" : "text-muted-foreground"}`}
            />
            <p
              className={`text-sm font-semibold text-center ${selectedTab === "pending" ? "text-primary" : "text-foreground"}`}
            >
              Gaida
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">apstiprināšanu</p>
          </button>

          <button
            onClick={() => setSelectedTab("professionals")}
            className={`p-5 rounded-2xl border-2 transition-all tap-feedback ${
              selectedTab === "professionals"
                ? "border-primary bg-primary/10 shadow-card"
                : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
            }`}
          >
            <Briefcase
              className={`w-8 h-8 mx-auto mb-2 ${selectedTab === "professionals" ? "text-primary" : "text-muted-foreground"}`}
            />
            <p
              className={`text-sm font-semibold text-center ${selectedTab === "professionals" ? "text-primary" : "text-foreground"}`}
            >
              Meistari
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">pārvaldīt</p>
          </button>

          <button
            onClick={() => setSelectedTab("clients")}
            className={`p-5 rounded-2xl border-2 transition-all tap-feedback ${
              selectedTab === "clients"
                ? "border-primary bg-primary/10 shadow-card"
                : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
            }`}
          >
            <Users
              className={`w-8 h-8 mx-auto mb-2 ${selectedTab === "clients" ? "text-primary" : "text-muted-foreground"}`}
            />
            <p
              className={`text-sm font-semibold text-center ${selectedTab === "clients" ? "text-primary" : "text-foreground"}`}
            >
              Klienti
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">pārvaldīt</p>
          </button>

          <button
            onClick={() => setSelectedTab("bookings")}
            className={`p-5 rounded-2xl border-2 transition-all tap-feedback ${
              selectedTab === "bookings"
                ? "border-primary bg-primary/10 shadow-card"
                : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
            }`}
          >
            <Calendar
              className={`w-8 h-8 mx-auto mb-2 ${selectedTab === "bookings" ? "text-primary" : "text-muted-foreground"}`}
            />
            <p
              className={`text-sm font-semibold text-center ${selectedTab === "bookings" ? "text-primary" : "text-foreground"}`}
            >
              Rezervācijas
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">pārvaldīt</p>
          </button>

          <button
            onClick={() => setSelectedTab("categories")}
            className={`p-5 rounded-2xl border-2 transition-all tap-feedback ${
              selectedTab === "categories"
                ? "border-primary bg-primary/10 shadow-card"
                : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
            }`}
          >
            <Tags
              className={`w-8 h-8 mx-auto mb-2 ${selectedTab === "categories" ? "text-primary" : "text-muted-foreground"}`}
            />
            <p
              className={`text-sm font-semibold text-center ${selectedTab === "categories" ? "text-primary" : "text-foreground"}`}
            >
              Kategorijas
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">pārvaldīt</p>
          </button>
        </div>

        {selectedTab === "pending" && (
          <div id="section-pending">
          <Card className="shadow-card border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg">Meistari, kas gaida apstiprināšanu</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {professionals.filter((p) => !p.approved).length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-base">Nav meistaru, kas gaida apstiprināšanu</p>
              ) : (
                <div className="space-y-4">
                  {professionals
                    .filter((p) => !p.approved)
                    .map((prof) => (
                      <Card key={prof.id} className="border-2 border-amber-300 bg-amber-50 overflow-hidden shadow-soft">
                        <CardContent className="p-4 sm:p-5">
                          <div className="space-y-2.5">
                            <div className="flex items-start gap-2">
                              <Avatar className="h-16 w-16 flex-shrink-0">
                                <AvatarImage src={prof.profiles?.avatar || ""} />
                                <AvatarFallback className="text-lg">{prof.profiles?.name?.[0] || "M"}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <h4 className="font-semibold text-sm sm:text-base truncate">{prof.profiles?.name}</h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  {prof.profiles?.phone || "Nav telefona"}
                                </p>
                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                                    {prof.category}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0">
                                    {prof.city}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="border-amber-500 text-amber-600 text-[10px] sm:text-xs px-1.5 py-0"
                                  >
                                    Gaida apstiprināšanu
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* KARTE */}
                            {prof.latitude && prof.longitude && (
                              <div
                                className="w-full rounded-2xl overflow-hidden border mb-2"
                                style={{ maxHeight: "200px", height: "180px" }}
                              >
                                <LocationMap
                                  latitude={prof.latitude}
                                  longitude={prof.longitude}
                                  showOpenButton={false}
                                />
                              </div>
                            )}

                            {prof.address && (
                              <div className="border-t pt-2">
                                <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                                  <p
                                    className="text-xs text-muted-foreground break-words max-w-full"
                                    style={{ whiteSpace: "normal", lineHeight: "1.4", overflowWrap: "break-word" }}
                                  >
                                    {prof.address}
                                  </p>
                                  {prof.latitude && prof.longitude && (
                                    <a
                                      href={`https://www.google.com/maps?q=${prof.latitude},${prof.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary tap-feedback text-xs sm:text-sm whitespace-nowrap flex-shrink-0 flex items-center gap-1"
                                    >
                                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                                      Skatīt kartē →
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {prof.bio && (
                              <div className="border-t pt-2">
                                <p className="text-[10px] sm:text-xs line-clamp-2 break-words">
                                  <strong>Bio:</strong> {prof.bio}
                                </p>
                              </div>
                            )}

                            <div className="flex gap-2 border-t pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveProfessional(prof.id)}
                                className="flex-1 text-[10px] sm:text-sm h-7 sm:h-9 px-2"
                              >
                                <CheckCircle className="w-2.5 h-2.5 sm:w-4 sm:h-4 mr-1" />
                                <span className="truncate">Apstiprināt</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectProfessional(prof.id)}
                                className="flex-1 text-[10px] sm:text-sm h-7 sm:h-9 px-2"
                              >
                                <XCircle className="w-2.5 h-2.5 sm:w-4 sm:h-4 mr-1" />
                                <span className="truncate">Noraidīt</span>
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
          </div>
        )}

        {selectedTab === "professionals" && (
          <div id="section-professionals">
          <Card className="shadow-card border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg">{t.manageProfessionals}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {professionals.map((prof) => (
                  <Card
                    key={prof.id}
                    className={
                      prof.is_blocked
                        ? "border-2 border-destructive bg-red-50 shadow-soft"
                        : "border shadow-card hover:shadow-elegant transition-shadow"
                    }
                  >
                    <CardContent className="p-5">
                      {/* Avatar + Vārds + Mobilais nr */}
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
                          <AvatarImage src={prof.profiles?.avatar || ""} />
                          <AvatarFallback className="text-base sm:text-lg">
                            {prof.profiles?.name?.[0] || "M"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg truncate">{prof.profiles?.name}</h3>
                          {prof.profiles?.phone && (
                            <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                              {prof.profiles?.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Tagu rinda: kategorija | pilsēta | statuss */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <Badge variant="outline" className="text-[10px] sm:text-xs h-6">
                          {prof.category}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] sm:text-xs h-6">
                          {prof.city}
                        </Badge>
                        <PlanBadge plan={prof.plan || "free"} isVerified={prof.is_verified || false} />
                        {prof.is_blocked && (
                          <Badge variant="destructive" className="text-[10px] sm:text-xs h-6">
                            Bloķēts
                          </Badge>
                        )}
                        {!prof.approved && (
                          <Badge
                            variant="outline"
                            className="border-amber-500 text-amber-600 text-[10px] sm:text-xs h-6"
                          >
                            Gaida
                          </Badge>
                        )}
                        {prof.subscription_status === "inactive" && (
                          <Badge variant="outline" className="border-red-500 text-red-600 text-[10px] sm:text-xs h-6">
                            Neaktīvs
                          </Badge>
                        )}
                        <StatusBadge status={prof.profiles?.status || "active"} />
                      </div>

                      {/* Karte (kompakta) */}
                      {prof.latitude && prof.longitude && (
                        <div
                          className="w-full rounded-2xl overflow-hidden border shadow-sm mb-3"
                          style={{ maxHeight: "200px", height: "180px" }}
                        >
                          <LocationMap latitude={prof.latitude} longitude={prof.longitude} showOpenButton={false} />
                        </div>
                      )}

                      {/* Adrese */}
                      {prof.address && (
                        <div className="mb-3">
                          <p
                            className="text-xs sm:text-sm text-muted-foreground line-clamp-2"
                            style={{ whiteSpace: "normal", lineHeight: "1.4" }}
                          >
                            {prof.address}
                          </p>
                        </div>
                      )}

                      {/* Poga "Skatīt kartē →" */}
                      {prof.latitude && prof.longitude && (
                        <div className="mb-3 flex justify-end">
                          <a
                            href={`https://www.google.com/maps?q=${prof.latitude},${prof.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary tap-feedback text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                            Skatīt kartē →
                          </a>
                        </div>
                      )}

                      {/* Bio (ja ir) */}
                      {prof.bio && (
                        <div className="mb-4 pt-3 border-t">
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            <span className="font-medium">Bio:</span> {prof.bio}
                          </p>
                        </div>
                      )}

                      {/* Plāns (dropdown) */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 pt-3 border-t">
                        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Pašreizējais plāns:</span>
                        <Select
                          value={prof.plan || "starter"}
                          onValueChange={(value) => handleUpdatePlan(prof.id, value)}
                        >
                          <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="starter">Starter (€0)</SelectItem>
                            <SelectItem value="pro">Pro (€14.99)</SelectItem>
                            <SelectItem value="premium">Premium (€24.99)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Paziņojumu pogas: Deaktivizēt | Atcelt verifikāciju */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <Button
                          variant={prof.subscription_status === "active" ? "outline" : "default"}
                          size="sm"
                          onClick={() =>
                            handleToggleSubscriptionStatus(prof.id, prof.subscription_status || "inactive")
                          }
                          className="w-full text-xs h-9 rounded-xl"
                        >
                          <Power className="mr-1.5 h-4 w-4" />
                          <span className="truncate">
                            {prof.subscription_status === "active" ? "Deaktivizēt" : "Aktivizēt"}
                          </span>
                        </Button>
                        <Button
                          variant={prof.is_verified ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleVerifyProfessional(prof.id, prof.is_verified)}
                          className="w-full text-xs h-9 rounded-xl"
                        >
                          {prof.is_verified ? (
                            <>
                              <ShieldOff className="mr-1.5 h-4 w-4" />
                              <span className="truncate">Atcelt verif.</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="mr-1.5 h-4 w-4" />
                              <span className="truncate">Verificēt</span>
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Apakšā: Blokēt un Dzēst */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={prof.is_blocked ? "default" : "destructive"}
                          size="sm"
                          onClick={() => handleBlockProfessional(prof.id, prof.is_blocked)}
                          className="w-full text-xs h-9 rounded-xl"
                        >
                          {prof.is_blocked ? (
                            <>
                              <Unlock className="mr-1.5 h-4 w-4" />
                              <span className="truncate">Atbloķēt</span>
                            </>
                          ) : (
                            <>
                              <Lock className="mr-1.5 h-4 w-4" />
                              <span className="truncate">Bloķēt</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOpenDeleteModal(prof)}
                          className="w-full text-xs h-9 rounded-xl"
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          <span className="truncate">Dzēst</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {selectedTab === "clients" && (
          <div id="section-clients">
          <Card className="shadow-card border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg">Klienti</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {clients.map((client) => (
                  <Card
                    key={client.id}
                    className={
                      client.status === "suspended" 
                        ? "border-2 border-destructive bg-red-50 shadow-soft" 
                        : "border shadow-card hover:shadow-elegant transition-shadow"
                    }
                  >
                    <CardContent className="p-5">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{client.name}</h4>
                            <p className="text-sm text-muted-foreground">{client.phone || "Nav telefona"}</p>
                            <div className="flex gap-2 mt-2">
                              <StatusBadge status={client.status} />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap border-t pt-3">
                          {client.status === "suspended" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenRestoreModal(client, "client")}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Atjaunot
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSuspendModal(client, "client")}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Apturēt
                            </Button>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => handleOpenDeleteClientModal(client)}>
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
          </div>
        )}

        {selectedTab === "bookings" && (
          <div id="section-bookings">
          <Card className="shadow-card border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg">{t.manageBookings}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="border shadow-card hover:shadow-elegant transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">
                            {booking.profiles?.name} → {booking.professional_profiles?.profiles?.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">{booking.services?.name}</p>
                          <p className="text-sm mt-2">
                            {new Date(booking.booking_date).toLocaleDateString("lv-LV")} • {booking.booking_time}
                          </p>
                        </div>

                        <Badge
                          variant={
                            booking.status === "confirmed"
                              ? "default"
                              : booking.status === "completed"
                                ? "secondary"
                                : booking.status === "canceled"
                                  ? "destructive"
                                  : "outline"
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
          </div>
        )}

        {selectedTab === "categories" && (
          <div id="section-categories">
            <CategoryManager />
          </div>
        )}
      </main>

      <DeleteProfessionalModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        professionalName={selectedProfessional?.profiles?.name || ""}
        onConfirmDelete={handleDeleteProfessional}
      />

      <DeleteClientModal
        open={deleteClientModalOpen}
        onOpenChange={setDeleteClientModalOpen}
        clientName={selectedClient?.name || ""}
        onConfirmDelete={handleDeleteClient}
      />

      <SuspendUserModal
        open={suspendModalOpen}
        onOpenChange={setSuspendModalOpen}
        userName={selectedUser?.name || ""}
        onConfirmSuspend={handleSuspendUser}
      />

      <RestoreUserModal
        open={restoreModalOpen}
        onOpenChange={setRestoreModalOpen}
        userName={selectedUser?.name || ""}
        onConfirmRestore={handleRestoreUser}
      />
    </div>
  );
};

export default AdminDashboard;
