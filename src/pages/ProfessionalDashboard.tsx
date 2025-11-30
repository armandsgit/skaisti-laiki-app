import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, LogOut, Plus, Euro, Clock, CheckCircle, XCircle, Sparkles, Edit, User, MapPin, Settings, LayoutDashboard, CalendarDays, TrendingUp, Bell, Trash2, ChevronDown, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import LoadingAnimation from '@/components/LoadingAnimation';
import EmptyStateAnimation from '@/components/EmptyStateAnimation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationMap from '@/components/LocationMap';
import EditableLocationMap from '@/components/EditableLocationMap';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { toast } from 'sonner';
import { serviceSchema } from '@/lib/validation';
import SubscriptionStatusIndicator from '@/components/SubscriptionStatusIndicator';
import WorkScheduleManager from '@/components/WorkScheduleManager';
import { ScheduleExceptionsManager } from '@/components/ScheduleExceptionsManager';
import StaffMemberManager from '@/components/StaffMemberManager';
import { DashboardStats } from '@/components/DashboardStats';
import { UpcomingBookingCard } from '@/components/UpcomingBookingCard';
import { ServiceCard } from '@/components/ServiceCard';
import { QuickActionButton } from '@/components/QuickActionButton';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { EmailStatsCard } from '@/components/EmailStatsCard';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, startOfMonth, endOfMonth, addDays, startOfWeek } from 'date-fns';
import { lv } from 'date-fns/locale';
import { getPlanFeatures, isFreePlan } from '@/lib/plan-features';

const ProfessionalDashboard = () => {
  const t = useTranslation('lv');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedStaffMember, setSelectedStaffMember] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    totalEarnings: 0, 
    completedBookings: 0,
    todayEarnings: 0,
    todayBookings: 0,
    monthlyEarnings: 0
  });
  const [emailCredits, setEmailCredits] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [emailStats, setEmailStats] = useState({
    sentToday: 0,
    sentThisMonth: 0,
    sent30Days: 0
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editProfessionalInfoOpen, setEditProfessionalInfoOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration: '60',
    description: ''
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    phone: '',
    avatar: ''
  });
  const [editedProfInfo, setEditedProfInfo] = useState({
    bio: '',
    category: '',
    city: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null
  });
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadCategories();
    }
  }, [user]);

  // Handle successful subscription purchase or update
  useEffect(() => {
    const sessionSuccess = searchParams.get('session_success');
    const subscriptionUpdated = searchParams.get('subscription_updated');
    
    if ((sessionSuccess === 'true' || subscriptionUpdated === 'true') && user) {
      console.log('Subscription changed, refreshing profile...');
      
      // Show appropriate success message
      if (subscriptionUpdated === 'true') {
        toast.success('Abonēšanas plāns veiksmīgi mainīts!');
      } else {
        toast.success('Abonēšanas plāns veiksmīgi aktivizēts!');
      }
      
      // Force immediate reload
      const reloadData = async () => {
        // Force immediate reload
        await loadProfile();
        
        // Retry after 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        await loadProfile();
        
        // Final retry after 4 seconds to catch delayed webhooks
        await new Promise(resolve => setTimeout(resolve, 2000));
        await loadProfile();
        
        // Force reload subscription status from Stripe
        await loadSubscriptionStatus();
        
        // Force reload email credits
        if (profile?.id) {
          const { data: credits } = await supabase
            .from('email_credits')
            .select('credits')
            .eq('master_id', profile.id)
            .maybeSingle();
          
          setEmailCredits(credits?.credits || 0);
        }
      };
      
      reloadData();
      
      // Remove query parameters
      navigate('/professional', { replace: true });
    }
  }, [searchParams, user?.id]);

  // Real-time subscription to professional_profiles changes
  useEffect(() => {
    if (!profile?.id) return;

    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel('dashboard-subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'professional_profiles',
          filter: `id=eq.${profile.id}`
        },
        (payload: any) => {
          // Only react to significant changes
          const oldData = payload.old || {};
          const newData = payload.new || {};
          
          const significantChange = 
            oldData.plan !== newData.plan ||
            oldData.subscription_status !== newData.subscription_status ||
            oldData.subscription_will_renew !== newData.subscription_will_renew;

          if (significantChange) {
            console.log('Dashboard: Significant subscription change detected');
            
            // Debounce reload (500ms)
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              loadProfile();
              loadEmailCredits();
              loadSubscriptionStatus();
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Handle tab query parameter and refresh data when returning to dashboard
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['dashboard', 'bookings', 'services', 'schedule'].includes(tabParam)) {
      setSelectedTab(tabParam);
      // Refresh email credits when switching to dashboard tab
      if (tabParam === 'dashboard' && profile) {
        loadEmailCredits();
      }
    } else {
      // Reset to dashboard when no tab parameter
      setSelectedTab('dashboard');
      // Refresh email credits when navigating back to dashboard
      if (profile) {
        loadEmailCredits();
      }
    }
  }, [searchParams, profile?.id]);

  useEffect(() => {
    if (profile) {
      loadServices();
      loadBookings();
      loadStaffMembers();
      loadEmailCredits();
      loadSubscriptionStatus();
    }
  }, [profile]);

  // Real-time booking notifications
  useEffect(() => {
    if (!profile?.id) return;

    let debounceTimer: NodeJS.Timeout;

    // Subscribe to new bookings
    const channel = supabase
      .channel('booking-notifications-dashboard')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `professional_id=eq.${profile.id}`
        },
        async (payload: any) => {
          console.log('New booking received:', payload);
          
          // Fetch client info for notification
          const { data: clientData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', payload.new.client_id)
            .single();
          
          // Show toast notification
          toast.success(`Jauna rezervācija no ${clientData?.name || 'klienta'}!`, {
            description: 'Apstipriniet to rezervāciju sadaļā.',
            duration: 5000,
          });
          
          // Debounce reload (300ms)
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            loadBookings();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Update pending bookings count whenever bookings change
  useEffect(() => {
    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    setPendingBookingsCount(pendingCount);
  }, [bookings]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('display_order');
    
    if (data) {
      setCategories(data);
    }
  };

  const loadProfile = async () => {
    if (!user?.id) return;
    
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setUserProfile(userData);
    setEditedProfile({
      name: userData?.name || '',
      phone: userData?.phone || '',
      avatar: userData?.avatar || ''
    });
    
    // Force fresh fetch without cache
    const { data, error } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('Dashboard: Fetched fresh profile data:', data);
    
    if (!data && !error) {
      const { data: newProfile } = await supabase
        .from('professional_profiles')
        .insert({
          user_id: user.id,
          category: 'Manikīrs',
          city: 'Rīga',
          bio: ''
        })
        .select()
        .single();
      
      if (newProfile) {
        setProfile(newProfile);
        setEditedProfInfo({
          bio: '',
          category: 'Manikīrs',
          city: 'Rīga',
          address: '',
          latitude: null,
          longitude: null
        });
        toast.success('Profesionālais profils izveidots!');
      }
    } else {
      setProfile(data);
      setEditedProfInfo({
        bio: data?.bio || '',
        category: data?.category || '',
        city: data?.city || '',
        address: data?.address || '',
        latitude: data?.latitude || null,
        longitude: data?.longitude || null
      });
    }
    
    setLoading(false);
  };

  const loadServices = async () => {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('professional_id', profile.id);
    
    setServices(data || []);
  };

  const loadEmailCredits = async () => {
    if (!profile?.id) return;
    
    // Fetch email credits from email_credits table
    const { data: credits } = await supabase
      .from('email_credits')
      .select('credits')
      .eq('master_id', profile.id)
      .maybeSingle();
    
    setEmailCredits(credits?.credits || 0);

    // Fetch email logs for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: emailLogs } = await supabase
      .from('email_logs')
      .select('*')
      .eq('professional_id', profile.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (emailLogs) {
      // Calculate statistics using Europe/Riga timezone
      const now = new Date();
      
      // Today: same date string comparison (handles timezone automatically)
      const sentToday = emailLogs.filter(e => 
        new Date(e.created_at).toDateString() === now.toDateString()
      ).length;

      // This month: same month and year
      const sentThisMonth = emailLogs.filter(e => {
        const emailDate = new Date(e.created_at);
        return emailDate.getMonth() === now.getMonth() && 
               emailDate.getFullYear() === now.getFullYear();
      }).length;

      // Last 30 days: already filtered by query
      const sent30Days = emailLogs.length;

      setEmailStats({ sentToday, sentThisMonth, sent30Days });
    } else {
      setEmailStats({ sentToday: 0, sentThisMonth: 0, sent30Days: 0 });
    }
  };

  const loadSubscriptionStatus = async () => {
    // Step 1: Compute optimistic state from Supabase profile (instant render)
    const computeOptimisticStatus = () => {
      if (!profile?.stripe_subscription_id) {
        return {
          planMode: 'expired' as const,
          currentPlan: 'free',
          subscriptionStatus: 'inactive',
          subscriptionEndDate: null,
          subscriptionWillRenew: false,
          daysRemaining: 0,
        };
      }

      const now = new Date();
      const endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
      const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      let planMode: 'renewing' | 'active_until_period_end' | 'expired';
      let currentPlan = profile.plan || 'free';
      let willRenew = profile.subscription_will_renew ?? false;

      if (profile.subscription_status === 'active') {
        planMode = willRenew ? 'renewing' : 'active_until_period_end';
      } else if (profile.subscription_status === 'canceled') {
        if (endDate && now < endDate) {
          planMode = 'active_until_period_end';
        } else {
          planMode = 'expired';
          currentPlan = 'free';
        }
      } else {
        planMode = 'expired';
        currentPlan = 'free';
      }

      return {
        planMode,
        currentPlan,
        subscriptionStatus: profile.subscription_status || 'inactive',
        subscriptionEndDate: profile.subscription_end_date,
        subscriptionWillRenew: willRenew,
        daysRemaining,
      };
    };

    // Render optimistic state immediately
    const optimisticStatus = computeOptimisticStatus();
    setSubscriptionStatus(optimisticStatus);

    // Step 2: Fetch real data from Stripe in background
    if (!profile?.stripe_subscription_id) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-subscription-status', {
        body: { stripeSubscriptionId: profile.stripe_subscription_id }
      });

      if (error) throw error;

      console.log('Loaded subscription status from Stripe:', data);
      
      // Step 3: Update UI with Stripe data (silent update)
      setSubscriptionStatus(data);

      // Step 4: Sync back to Supabase if data differs
      const needsUpdate = 
        data.currentPlan !== profile.plan ||
        data.subscriptionStatus !== profile.subscription_status ||
        data.subscriptionWillRenew !== profile.subscription_will_renew ||
        data.subscriptionEndDate !== profile.subscription_end_date;

      if (needsUpdate) {
        console.log('Syncing Stripe data to Supabase...');
        const { error: updateError } = await supabase
          .from('professional_profiles')
          .update({
            plan: data.currentPlan,
            subscription_status: data.subscriptionStatus,
            subscription_will_renew: data.subscriptionWillRenew,
            subscription_end_date: data.subscriptionEndDate,
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error('Error syncing subscription to Supabase:', updateError);
        } else {
          console.log('Subscription synced to Supabase successfully');
        }
      }
    } catch (error) {
      console.error('Error loading subscription status from Stripe:', error);
      // Keep optimistic state on error
    }
  };

  const loadStaffMembers = async () => {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('staff_members')
      .select('*')
      .eq('professional_id', profile.id)
      .eq('is_active', true)
      .order('name');
    
    setStaffMembers(data || []);
  };

  const loadBookings = async () => {
    if (!profile?.id) return;
    
    // Get date 30 days ago for completed bookings filter
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        services(name, price),
        profiles!bookings_client_id_fkey(name, phone, email),
        staff_members(name, avatar)
      `)
      .eq('professional_id', profile.id)
      .or(`status.neq.completed,and(status.eq.completed,booking_date.gte.${thirtyDaysAgoStr})`)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });
    
    if (data) {
      setBookings(data);
      
      const completed = data.filter(b => b.status === 'completed');
      const earnings = completed.reduce((sum, b) => sum + (b.services?.price || 0), 0);
      
      const today = new Date().toISOString().split('T')[0];
      // Count only active bookings scheduled for today (pending or confirmed)
      const todayBookings = data.filter(b => 
        b.booking_date === today && 
        (b.status === 'pending' || b.status === 'confirmed')
      );
      const todayCompleted = data.filter(b => 
        b.booking_date === today && 
        b.status === 'completed'
      );
      const todayEarnings = todayCompleted.reduce((sum, b) => sum + (b.services?.price || 0), 0);
      
      const monthStart = startOfMonth(new Date()).toISOString().split('T')[0];
      const monthEnd = endOfMonth(new Date()).toISOString().split('T')[0];
      const monthlyBookings = data.filter(b => b.booking_date >= monthStart && b.booking_date <= monthEnd);
      const monthlyCompleted = monthlyBookings.filter(b => b.status === 'completed');
      const monthlyEarnings = monthlyCompleted.reduce((sum, b) => sum + (b.services?.price || 0), 0);
      
      setStats({
        totalEarnings: earnings,
        completedBookings: completed.length,
        todayEarnings,
        todayBookings: todayBookings.length,
        monthlyEarnings
      });
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) return;

    // Check service limit based on plan
    const planFeatures = getPlanFeatures(profile.plan);
    if (!editingService) {
      // -1 means unlimited
      if (planFeatures.maxServices !== -1 && services.length >= planFeatures.maxServices) {
        toast.error(`Jūsu plāns atļauj tikai ${planFeatures.maxServices} pakalpojumus. Lūdzu, izvēlieties augstāka līmeņa plānu.`, {
          action: {
            label: 'Skatīt plānus',
            onClick: () => navigate('/abonesana')
          }
        });
        return;
      }
    }

    try {
      const validatedData = serviceSchema.parse({
        name: newService.name,
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration),
        description: newService.description || undefined
      });

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update({
            name: validatedData.name,
            price: validatedData.price,
            duration: validatedData.duration,
            description: validatedData.description
          })
          .eq('id', editingService.id);

        if (!error) {
          toast.success('Pakalpojums atjaunināts!');
          setServiceDialogOpen(false);
          setEditingService(null);
          setNewService({ name: '', price: '', duration: '60', description: '' });
          loadServices();
        } else {
          toast.error(t.error);
        }
      } else {
        // First, create the service
        const { data: newServiceData, error: insertError } = await supabase
          .from('services')
          .insert({
            professional_id: profile.id,
            name: validatedData.name,
            price: validatedData.price,
            duration: validatedData.duration,
            description: validatedData.description
          })
          .select()
          .single();
        
        if (insertError) {
          toast.error(t.error);
          return;
        }

        // Get the owner's staff member record
        const { data: ownerStaff, error: staffError } = await supabase
          .from('staff_members')
          .select('id')
          .eq('professional_id', profile.id)
          .eq('position', 'Īpašnieks')
          .maybeSingle();

        if (staffError) {
          console.error('Error finding owner staff:', staffError);
        }

        // If owner staff member exists, assign this service to them
        if (ownerStaff) {
          const { error: masterServiceError } = await supabase
            .from('master_services')
            .insert({
              staff_member_id: ownerStaff.id,
              service_id: newServiceData.id
            });

          if (masterServiceError) {
            console.error('Error assigning service to owner:', masterServiceError);
          }
        }
        
        toast.success(t.serviceAdded);
        setServiceDialogOpen(false);
        setNewService({ name: '', price: '', duration: '60', description: '' });
        loadServices();
      }
    } catch (error: any) {
      if (error.errors) {
        toast.error(error.errors[0]?.message || 'Validācijas kļūda');
      } else {
        toast.error(t.error);
      }
    }
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    setNewService({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration.toString(),
      description: service.description || ''
    });
    setServiceDialogOpen(true);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Vai tiešām vēlaties dzēst šo pakalpojumu?')) return;
    
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (!error) {
      toast.success('Pakalpojums dzēsts!');
      loadServices();
    } else {
      toast.error(t.error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Attēls ir par lielu. Maksimālais izmērs: 5MB');
      return;
    }

    setUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${Date.now()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      setEditedProfile({ ...editedProfile, avatar: data.publicUrl });
      toast.success('Attēls augšupielādēts!');
    } catch (error: any) {
      toast.error('Kļūda augšupielādējot attēlu: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        name: editedProfile.name,
        phone: editedProfile.phone,
        avatar: editedProfile.avatar
      })
      .eq('id', user.id);

    if (!error) {
      toast.success('Profils atjaunināts!');
      setEditProfileDialogOpen(false);
      loadProfile();
    } else {
      toast.error('Kļūda atjauninot profilu');
    }
  };

  const handleUpdateProfessionalInfo = async () => {
    if (!profile?.id) return;

    const fullAddress = editedProfInfo.address.trim();

    if (!fullAddress || !editedProfInfo.city) {
      toast.error('Lūdzu, aizpildiet pilsētu un adresi');
      return;
    }

    if (!editedProfInfo.latitude || !editedProfInfo.longitude) {
      toast.error('Lūdzu, atzīmējiet atrašanās vietu kartē');
      return;
    }

    const { error } = await supabase
      .from('professional_profiles')
      .update({
        bio: editedProfInfo.bio,
        category: editedProfInfo.category as any,
        city: editedProfInfo.city,
        address: fullAddress,
        latitude: editedProfInfo.latitude,
        longitude: editedProfInfo.longitude
      })
      .eq('id', profile.id);

    if (!error) {
      toast.success('Informācija atjaunināta!');
      setEditProfessionalInfoOpen(false);
      await loadProfile();
    } else {
      toast.error(`Kļūda atjauninot informāciju: ${error.message}`);
    }
  };

  const handleBookingAction = async (bookingId: string, status: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'cancelled_by_master' | 'cancelled_by_client' | 'cancelled_system') => {
    // Get booking details for email
    const booking = bookings.find(b => b.id === bookingId);
    
    const updateData: any = { status };
    
    // Add cancellation tracking for cancellation statuses
    if (status === 'cancelled_by_master' || status === 'cancelled_by_client' || status === 'cancelled_system') {
      updateData.cancelled_by = user?.id;
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancellation_reason = status === 'cancelled_by_master' ? 'Atcelta meistara dēļ' : 
                                       status === 'cancelled_by_client' ? 'Atcelta klienta dēļ' : 
                                       'Atcelta automātiski';
    }
    
    const { error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId);
    
    if (!error) {
      toast.success(
        status === 'confirmed' ? t.bookingConfirmed :
        status === 'completed' ? t.bookingCompleted :
        t.bookingCanceled
      );

      // Send confirmation email when booking is confirmed
      if (status === 'confirmed' && booking && emailCredits >= 1) {
        await sendBookingEmail(booking, 'confirmation');
      }

      loadBookings();
    } else {
      toast.error(t.error);
    }
  };

  const sendBookingEmail = async (booking: any, type: 'confirmation' | 'reminder' | 'test') => {
    if (!profile?.id || !userProfile) return;

    // Check if email automation is allowed for this plan
    const planFeatures = getPlanFeatures(profile.plan);
    if (!planFeatures.canUseEmailAutomation) {
      toast.error('E-pasta automātiskā sūtīšana nav pieejama bezmaksas plānā. Lūdzu, aktivizējiet augstāka līmeņa plānu.');
      return;
    }

    if (emailCredits < 1) {
      toast.error('Nav pietiekami e-pasta kredīti');
      return;
    }

    setSendingEmail(true);

    try {
      const clientEmail = booking.profiles?.email;
      if (!clientEmail) {
        throw new Error('Klienta e-pasta adrese nav atrasta');
      }

      const serviceName = booking.services?.name || 'Pakalpojums';
      const bookingDate = new Date(booking.booking_date).toLocaleDateString('lv-LV');
      const bookingTime = booking.booking_time.substring(0, 5);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
            .details { background: #fff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #000; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>BeautyOn</h1>
            </div>
            <div class="content">
              <h2>${type === 'test' ? 'Testa e-pasts' : 'Rezervācija apstiprināta!'}</h2>
              <p>Sveiki, ${booking.profiles?.name || 'Klients'}!</p>
              ${type === 'test' ? '<p>Šis ir testa e-pasts. Jūsu e-pasta sistēma darbojas pareizi!</p>' : '<p>Jūsu rezervācija ir veiksmīgi apstiprināta.</p>'}
              
              <div class="details">
                <h3>Rezervācijas detaļas</h3>
                <p><strong>Meistars:</strong> ${userProfile.name}</p>
                <p><strong>Pakalpojums:</strong> ${serviceName}</p>
                <p><strong>Datums:</strong> ${bookingDate}</p>
                <p><strong>Laiks:</strong> ${bookingTime}</p>
              </div>
              
              ${type !== 'test' ? '<p>Ja nepieciešams atcelt vai mainīt rezervāciju, lūdzu, sazinieties ar meistaru savlaicīgi.</p>' : ''}
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} BeautyOn. Skaistumkopšanas pakalpojumu platforma.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          professionalId: profile.id,
          to: clientEmail,
          subject: type === 'test' ? 'BeautyOn - Testa e-pasts' : 'BeautyOn - Rezervācija apstiprināta',
          htmlContent,
          emailType: type === 'test' ? 'system' : 'booking_confirmation'
        }
      });

      if (error) throw error;

      toast.success(`E-pasts nosūtīts! Atlikušie kredīti: ${data.creditsRemaining || emailCredits - 1}`);
      
      // Reload credits and stats
      await loadEmailCredits();
    } catch (error: any) {
      console.error('Email sending error:', error);
      toast.error(error.message || 'Neizdevās nosūtīt e-pastu');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!userProfile?.email) {
      toast.error('Nav atrasta jūsu e-pasta adrese');
      return;
    }

    // Create a dummy booking for test email
    const testBooking = {
      profiles: {
        name: userProfile.name,
        email: userProfile.email
      },
      services: {
        name: 'Testa pakalpojums'
      },
      booking_date: new Date().toISOString(),
      booking_time: '10:00:00'
    };

    await sendBookingEmail(testBooking, 'test');
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Vai tiešām vēlaties dzēst šo rezervāciju?')) return;
    
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);
    
    if (!error) {
      toast.success('Rezervācija dzēsta!');
      loadBookings();
    } else {
      toast.error('Kļūda dzēšot rezervāciju');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user?.id) return;
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    setUploadingImage(true);
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName);
      
      const currentGallery = profile?.gallery || [];
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .update({ gallery: [...currentGallery, publicUrl] })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      toast.success('Bilde pievienota!');
      loadProfile();
    } catch (error: any) {
      toast.error('Kļūda augšupielādējot bildi: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!confirm('Vai tiešām vēlaties dzēst šo bildi?') || !user?.id) return;
    
    try {
      const currentGallery = profile?.gallery || [];
      const updatedGallery = currentGallery.filter((url: string) => url !== imageUrl);
      
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .update({ gallery: updatedGallery })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      if (imageUrl.includes('gallery')) {
        const path = imageUrl.split('/gallery/').pop();
        if (path) {
          await supabase.storage.from('gallery').remove([path]);
        }
      }
      
      toast.success('Bilde dzēsta!');
      loadProfile();
    } catch (error: any) {
      toast.error('Kļūda dzēšot bildi: ' + error.message);
    }
  };

  const getUpcomingBookings = () => {
    return bookings
      .filter(b => {
        const bookingDate = new Date(b.booking_date);
        return bookingDate >= new Date() && (b.status === 'pending' || b.status === 'confirmed');
      })
      .sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
      .slice(0, 3);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingAnimation size={100} text={t.loading} />
      </div>
    );
  }

  // Allow access for users with active subscription OR free plan
  if (profile && profile.subscription_status !== 'active' && profile.plan !== 'free') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-card border-border/50">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-background stroke-[2]" />
            </div>
            <CardTitle className="text-3xl mb-2">
              Lai turpinātu un kļūtu redzams klientiem
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Izvēlies sev piemērotu abonēšanas plānu
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/abonesana'}
              className="w-full max-w-md mx-auto"
            >
              Izvēlēties plānu
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Bez aktīva abonēšanas plāna tavs profils nav redzams klientiem
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const upcomingBookings = getUpcomingBookings();

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="bg-white border-b border-border/30 sticky top-0 z-10 shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
              <span className="text-white text-lg font-bold tracking-tight">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                BeautyOn
              </h1>
              <p className="text-xs text-muted-foreground">Meistara panelis</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {pendingBookingsCount > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setSelectedTab('bookings')}
              >
                <Bell className="w-5 h-5 stroke-[1.5]" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {pendingBookingsCount}
                </span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5 stroke-[1.5]" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Approval Status */}
        {!profile.approved && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="mb-6 border-warning/20 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-warning/10">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold">Profils gaida apstiprināšanu</p>
                    <p className="text-sm text-muted-foreground">
                      Pēc apstiprināšanas būsi redzams klientiem
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Tabs value={selectedTab} onValueChange={(value) => {
          setSelectedTab(value);
          // Update URL when tab changes
          if (value === 'dashboard') {
            navigate('/professional', { replace: true });
          } else {
            navigate(`/professional?tab=${value}`, { replace: true });
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4 stroke-[1.5]" />
              <span className="hidden sm:inline">Galvenā</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2 relative">
              <Calendar className="w-4 h-4 stroke-[1.5]" />
              <span className="hidden sm:inline">Rezervācijas</span>
              {pendingBookingsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {pendingBookingsCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Sparkles className="w-4 h-4 stroke-[1.5]" />
              <span className="hidden sm:inline">Pakalpojumi</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <CalendarDays className="w-4 h-4 stroke-[1.5]" />
              <span className="hidden sm:inline">Grafiks</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* FREE Plan Warning Banner */}
            {isFreePlan(profile.plan) && (
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-warning/10">
                      <AlertCircle className="w-5 h-5 text-warning stroke-[2]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        Bezmaksas plāns - ierobežotas iespējas
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Jūsu abonements ir beidzies vai nav aktivizēts. Pieejamas tikai pamata funkcijas.
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                        <li>• Nav e-pasta automātiskās sūtīšanas</li>
                        <li>• Nav statistikas</li>
                        <li>• Maksimums 3 pakalpojumi</li>
                        <li>• Nav redzams kartē</li>
                      </ul>
                      <Button 
                        onClick={() => navigate('/abonesana')}
                        size="sm"
                        className="gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Aktivizēt plānu
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subscription Status Banner */}
            {subscriptionStatus && (
              <SubscriptionBanner
                planMode={subscriptionStatus.planMode}
                currentPlan={subscriptionStatus.currentPlan}
                subscriptionStatus={subscriptionStatus.subscriptionStatus}
                subscriptionEndDate={subscriptionStatus.subscriptionEndDate}
                subscriptionWillRenew={subscriptionStatus.subscriptionWillRenew}
                daysRemaining={subscriptionStatus.daysRemaining}
                emailCredits={emailCredits}
              />
            )}

            {/* KPI Stats - Show for all plans */}
            <DashboardStats
              todayEarnings={stats.todayEarnings}
              monthlyEarnings={stats.monthlyEarnings}
              todayBookings={stats.todayBookings}
              completedServices={stats.completedBookings}
            />

            {/* Email Stats Card - Show for all plans */}
            <EmailStatsCard
              emailCredits={emailCredits}
              emailStats={emailStats}
              onSendTest={handleSendTestEmail}
              onNavigateToBilling={() => navigate('/billing')}
              sendingEmail={sendingEmail}
            />

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <QuickActionButton
                icon={Plus}
                label="Pievienot pakalpojumu"
                onClick={() => {
                  setEditingService(null);
                  setNewService({ name: '', price: '', duration: '', description: '' });
                  setServiceDialogOpen(true);
                }}
              />
              <QuickActionButton
                icon={CalendarDays}
                label="Rediģēt grafiku"
                onClick={() => setSelectedTab('schedule')}
                variant="secondary"
              />
              <QuickActionButton
                icon={Calendar}
                label="Rezervācijas"
                onClick={() => setSelectedTab('bookings')}
                variant="secondary"
                badge={pendingBookingsCount > 0 ? pendingBookingsCount : undefined}
              />
            </div>

            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Tuvākās rezervācijas</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTab('bookings')}>
                    Skatīt visas
                  </Button>
                </div>
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <UpcomingBookingCard
                      key={booking.id}
                      booking={booking}
                      onClick={() => setSelectedTab('bookings')}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Rezervācijas</h2>
              <Badge variant="outline">
                {bookings.length} kopā
              </Badge>
            </div>

            {bookings.length === 0 ? (
              <Card className="border-0 shadow-card">
                <CardContent className="p-12">
                  <EmptyStateAnimation size={120} />
                  <p className="text-center text-muted-foreground mt-4">Nav rezervāciju</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Active Bookings Section */}
                <div className="space-y-6">
                  {/* Pending Bookings - Highlighted at Top */}
                  {bookings.filter(b => b.status === 'pending').length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">Gaida apstiprinājumu</h3>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                          {bookings.filter(b => b.status === 'pending').length}
                        </Badge>
                      </div>
                      {bookings.filter(b => b.status === 'pending').map((booking) => (
                        <Card 
                          key={booking.id}
                          className="hover:shadow-lg transition-all duration-300 border-l-4 bg-amber-50 border-amber-400 shadow-lg ring-2 ring-amber-200"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-lg">{booking.profiles.name}</p>
                                </div>
                                <div className="space-y-1 mt-1">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-mono bg-white px-2 py-1 rounded-md text-muted-foreground break-all">
                                      {booking.profiles.email || 'Nav e-pasta'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    📱 {booking.profiles.phone || 'Nav telefona'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                                Gaida
                              </Badge>
                            </div>

                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{format(new Date(booking.booking_date), 'dd.MM.yyyy', { locale: lv })}</span>
                                <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                                <span>{booking.booking_time}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Sparkles className="w-4 h-4 text-muted-foreground" />
                                <span>{booking.services.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>Meistars: {booking.staff_members?.name || 'Nav norādīts'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Euro className="w-4 h-4 text-primary" />
                                <span className="font-bold text-primary">€{booking.services.price}</span>
                              </div>
                            </div>

                            <div className="mb-4 p-3 bg-white rounded-lg">
                              <p className="text-sm text-muted-foreground">
                                <strong>Piezīme:</strong> {booking.notes || 'Nav piezīmju'}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleBookingAction(booking.id, 'confirmed')}
                                className="flex-1"
                              >
                                <CheckCircle className="w-4 h-4 mr-1 stroke-[2]" />
                                Apstiprināt
                              </Button>
                              <Button
                                size="sm"
                                 variant="outline"
                                 onClick={() => handleBookingAction(booking.id, 'cancelled_by_master')}
                                 className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="w-4 h-4 mr-1 stroke-[2]" />
                                Atcelt
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Confirmed Bookings */}
                  {bookings.filter(b => b.status === 'confirmed').length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Apstiprinātas rezervācijas</h3>
                      {bookings.filter(b => b.status === 'confirmed').map((booking) => (
                        <Card 
                          key={booking.id}
                          className="hover:shadow-lg transition-all duration-300 border-l-4 bg-white border-border/50 shadow-card"
                          style={{ borderLeftColor: '#10b981' }}
                        >
                        <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-lg">{booking.profiles.name}</p>
                          </div>
                          <div className="space-y-1 mt-1">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-mono bg-muted px-2 py-1 rounded-md text-muted-foreground break-all">
                                {booking.profiles.email || 'Nav e-pasta'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              📱 {booking.profiles.phone || 'Nav telefona'}
                            </p>
                          </div>
                        </div>
                          <Badge variant="default">
                            Apstiprināts
                          </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{format(new Date(booking.booking_date), 'dd.MM.yyyy', { locale: lv })}</span>
                          <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                          <span>{booking.booking_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Sparkles className="w-4 h-4 text-muted-foreground" />
                          <span>{booking.services.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>Meistars: {booking.staff_members?.name || 'Nav norādīts'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Euro className="w-4 h-4 text-primary" />
                          <span className="font-bold text-primary">€{booking.services.price}</span>
                        </div>
                      </div>

                      <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Piezīme:</strong> {booking.notes || 'Nav piezīmju'}
                        </p>
                      </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleBookingAction(booking.id, 'completed')}
                              className="flex-1"
                            >
                              <CheckCircle className="w-4 h-4 mr-1 stroke-[2]" />
                              Atzīmēt kā pabeigtu
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBookingAction(booking.id, 'cancelled_by_master')}
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="w-4 h-4 mr-1 stroke-[2]" />
                              Atcelt
                            </Button>
                          </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length === 0 && (
                    <Card className="p-8 border-0 shadow-card">
                      <p className="text-center text-muted-foreground">
                        Nav aktīvo rezervāciju
                      </p>
                    </Card>
                  )}
                </div>

                {/* Completed Bookings Section - Collapsible */}
                {bookings.filter(b => b.status === 'completed').length > 0 && (
                  <div className="space-y-4 mt-6">
                    <Button
                      variant="ghost"
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-muted-foreground">
                          Pabeigtās rezervācijas
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {bookings.filter(b => b.status === 'completed').length}
                        </Badge>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                          showCompleted ? 'rotate-180' : ''
                        }`}
                      />
                    </Button>

                    {showCompleted && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        {bookings.filter(b => b.status === 'completed').map((booking) => (
                          <Card 
                            key={booking.id}
                            className="opacity-60 hover:opacity-80 transition-all duration-200 border-l-4 bg-muted/30 border-0 shadow-card"
                            style={{ borderLeftColor: '#6b7280' }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-lg text-muted-foreground">
                                      {booking.profiles.name}
                                    </p>
                                  </div>
                                  <div className="space-y-1 mt-1">
                                    <div className="flex items-start gap-2">
                                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded-md text-muted-foreground break-all">
                                        {booking.profiles.email || 'Nav e-pasta'}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      📱 {booking.profiles.phone || 'Nav telefona'}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  Pabeigts
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <p className="text-sm">
                                  <span className="font-medium">Pakalpojums:</span>{' '}
                                  {booking.services?.name}
                                </p>
                                
                                {booking.staff_members && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Meistars:</span>
                                    <div className="flex items-center gap-2">
                                      {booking.staff_members.avatar && (
                                        <img 
                                          src={booking.staff_members.avatar} 
                                          alt={booking.staff_members.name}
                                          className="w-6 h-6 rounded-full object-cover"
                                        />
                                      )}
                                      <span className="text-sm text-muted-foreground">
                                        {booking.staff_members.name}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <p className="text-sm">
                                  <span className="font-medium">Datums:</span>{' '}
                                  {format(new Date(booking.booking_date), 'dd.MM.yyyy', { locale: lv })}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Laiks:</span>{' '}
                                  {booking.booking_time.slice(0, 5)} - {booking.booking_end_time?.slice(0, 5)}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Cena:</span> €{booking.services?.price}
                                </p>
                                {booking.notes && (
                                  <p className="text-sm">
                                    <span className="font-medium">Piezīmes:</span> {booking.notes}
                                  </p>
                                )}
                              </div>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="w-full mt-4"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Dzēst rezervāciju
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Canceled Bookings Section - Collapsible */}
                {bookings.filter(b => b.status === 'canceled').length > 0 && (
                  <div className="space-y-4 mt-6">
                    <Button
                      variant="ghost"
                      onClick={() => setShowCanceled(!showCanceled)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-muted-foreground">
                          Atceltās rezervācijas
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {bookings.filter(b => b.status === 'canceled').length}
                        </Badge>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                          showCanceled ? 'rotate-180' : ''
                        }`}
                      />
                    </Button>

                    {showCanceled && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        {bookings.filter(b => b.status === 'canceled').map((booking) => (
                          <Card 
                            key={booking.id}
                            className="opacity-60 hover:opacity-80 transition-all duration-200 border-l-4 bg-muted/30 border-0 shadow-card"
                            style={{ borderLeftColor: '#ef4444' }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-lg text-muted-foreground">
                                      {booking.profiles.name}
                                    </p>
                                  </div>
                                  <div className="space-y-1 mt-1">
                                    <div className="flex items-start gap-2">
                                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded-md text-muted-foreground break-all">
                                        {booking.profiles.email || 'Nav e-pasta'}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      📱 {booking.profiles.phone || 'Nav telefona'}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="destructive" className="opacity-70">
                                  Atcelts
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <p className="text-sm">
                                  <span className="font-medium">Pakalpojums:</span>{' '}
                                  {booking.services?.name}
                                </p>
                                
                                {booking.staff_members && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Meistars:</span>
                                    <div className="flex items-center gap-2">
                                      {booking.staff_members.avatar && (
                                        <img 
                                          src={booking.staff_members.avatar} 
                                          alt={booking.staff_members.name}
                                          className="w-6 h-6 rounded-full object-cover"
                                        />
                                      )}
                                      <span className="text-sm">{booking.staff_members.name}</span>
                                    </div>
                                  </div>
                                )}

                                <p className="text-sm">
                                  <span className="font-medium">Datums:</span>{' '}
                                  {format(new Date(booking.booking_date), 'dd.MM.yyyy', { locale: lv })}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Laiks:</span>{' '}
                                  {booking.booking_time.slice(0, 5)} - {booking.booking_end_time?.slice(0, 5)}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Cena:</span> €{booking.services?.price}
                                </p>
                                {booking.notes && (
                                  <p className="text-sm">
                                    <span className="font-medium">Piezīmes:</span> {booking.notes}
                                  </p>
                                )}
                              </div>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="w-full mt-4"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Dzēst rezervāciju
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Mani pakalpojumi</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {services.length} {getPlanFeatures(profile.plan).maxServices > 0 
                    ? `/ ${getPlanFeatures(profile.plan).maxServices}` 
                    : '/ ∞'} pakalpojumi
                </p>
              </div>
              <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
      setEditingService(null);
      setNewService({ name: '', price: '', duration: '60', description: '' });
    }}
                    className="bg-black text-white border-0"
                    disabled={!editingService && getPlanFeatures(profile.plan).maxServices > 0 && services.length >= getPlanFeatures(profile.plan).maxServices}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Pievienot pakalpojumu
                  </Button>
                </DialogTrigger>
                <DialogContent className="flex flex-col max-sm:p-0">
                  {/* Header - Fixed on mobile */}
                  <DialogHeader className="max-sm:sticky max-sm:top-0 max-sm:z-10 max-sm:bg-background max-sm:p-6 max-sm:pb-4 max-sm:border-b">
                    <DialogTitle className="text-xl">
                      {editingService ? 'Labot pakalpojumu' : 'Pievienot pakalpojumu'}
                    </DialogTitle>
                  </DialogHeader>
                  
                  {/* Scrollable Content */}
                  <form onSubmit={handleAddService} className="flex flex-col flex-1 max-sm:h-full">
                    <div className="flex-1 overflow-y-auto max-sm:px-6 max-sm:py-4 space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="name">Pakalpojuma nosaukums</Label>
                        <Input
                          id="name"
                          value={newService.name}
                          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                          placeholder="Piemēram: Manikīrs"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price">Cena (€)</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={newService.price}
                            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                            placeholder="25.00"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration">Ilgums (min)</Label>
                          <Select
                            value={newService.duration}
                            onValueChange={(value) => setNewService({ ...newService, duration: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Izvēlieties ilgumu" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="20">20 min</SelectItem>
                              <SelectItem value="30">30 min</SelectItem>
                              <SelectItem value="40">40 min</SelectItem>
                              <SelectItem value="50">50 min</SelectItem>
                              <SelectItem value="60">60 min</SelectItem>
                              <SelectItem value="90">90 min</SelectItem>
                              <SelectItem value="120">120 min</SelectItem>
                              <SelectItem value="150">150 min</SelectItem>
                              <SelectItem value="180">180 min</SelectItem>
                              <SelectItem value="240">240 min (4h)</SelectItem>
                              <SelectItem value="300">300 min (5h)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Apraksts</Label>
                        <Textarea
                          id="description"
                          value={newService.description}
                          onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                          placeholder="Pakalpojuma apraksts..."
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                    </div>
                    
                    {/* Submit Button - Sticky on mobile */}
                    <div className="max-sm:sticky max-sm:bottom-0 max-sm:bg-background max-sm:p-6 max-sm:pt-4 max-sm:border-t sm:mt-6">
                      <Button type="submit" className="w-full bg-black text-white border-0 h-12">
                        {editingService ? 'Saglabāt izmaiņas' : 'Pievienot pakalpojumu'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Service Limit Warning */}
            {getPlanFeatures(profile.plan).maxServices > 0 && 
              services.length >= getPlanFeatures(profile.plan).maxServices && (
              <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900">
                        Pakalpojumu limits sasniegts
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Jūsu pašreizējais plāns atļauj tikai {getPlanFeatures(profile.plan).maxServices} pakalpojumus. 
                        Lai pievienotu vairāk pakalpojumu, lūdzu izvēlieties augstāka līmeņa plānu.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 border-amber-600 text-amber-700 hover:bg-amber-100"
                        onClick={() => navigate('/abonesana')}
                      >
                        Skatīt plānus
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {services.length === 0 ? (
              <Card className="border-0 shadow-card">
                <CardContent className="p-12">
                  <EmptyStateAnimation size={120} />
                  <p className="text-center text-muted-foreground mt-4">Nav pakalpojumu</p>
                  <p className="text-center text-muted-foreground text-sm">
                    Pievienojiet savus pakalpojumus, lai klienti varētu rezervēt laiku
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {services.map((service, index) => {
                  const planFeatures = getPlanFeatures(profile?.plan);
                  const isWithinLimit = planFeatures.maxServices === -1 || index < planFeatures.maxServices;
                  
                  return (
                    <div key={service.id} className={!isWithinLimit ? 'opacity-40' : ''}>
                      {!isWithinLimit && (
                        <div className="mb-2 px-3 py-1.5 bg-muted rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground font-medium">
                            Nepieejams pašreizējā plānā
                          </p>
                        </div>
                      )}
                      <ServiceCard
                        service={service}
                        onEdit={isWithinLimit ? handleEditService : undefined}
                        onDelete={isWithinLimit ? handleDeleteService : undefined}
                        disabled={!isWithinLimit}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-2">Darba grafiks</h2>
              <p className="text-sm text-muted-foreground">
                Pārvaldiet savus meistarus un viņu darba grafikus
              </p>
            </div>
            
            <StaffMemberManager
              professionalId={profile.id}
              selectedStaffMemberId={selectedStaffMember}
              onSelectStaffMember={(staffId) => {
                setSelectedStaffMember(staffId);
              }}
            />

            {selectedStaffMember && (
              <div className="mt-6 space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedStaffMember(null)}
                  className="mb-4"
                >
                  ← Atpakaļ
                </Button>
                <WorkScheduleManager
                  professionalId={profile.id}
                  staffMemberId={selectedStaffMember}
                />
                <ScheduleExceptionsManager
                  professionalId={profile.id}
                  staffMemberId={selectedStaffMember}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfessionalDashboard;
