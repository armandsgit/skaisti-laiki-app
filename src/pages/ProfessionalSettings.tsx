import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import LocationMap from '@/components/LocationMap';
import EditableLocationMap from '@/components/EditableLocationMap';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import LoadingAnimation from '@/components/LoadingAnimation';
import { toast } from 'sonner';
import { ArrowLeft, Edit, XCircle, Sparkles } from 'lucide-react';

export default function ProfessionalSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editProfessionalInfoOpen, setEditProfessionalInfoOpen] = useState(false);
  
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

  useEffect(() => {
    if (user) {
      loadProfile();
      loadCategories();
    }
  }, [user]);

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
    
    const { data } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
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
      
      const { error } = await supabase
        .from('professional_profiles')
        .update({ gallery: updatedGallery })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast.success('Bilde dzēsta!');
      loadProfile();
    } catch (error: any) {
      toast.error('Kļūda dzēšot bildi: ' + error.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id },
      });

      if (error) throw error;

      toast.success('Profils veiksmīgi dzēsts');
      await signOut();
      navigate('/auth');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Kļūda dzēšot profilu: ' + error.message);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingAnimation size={100} text="Ielāde" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header - matching bookings page style */}
      <header className="bg-white border-b border-border/30 sticky top-0 z-10 shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/professional')}
              size="icon"
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 stroke-[1.5]" />
            </Button>
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
              <span className="text-white text-lg font-bold tracking-tight">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Iestatījumi
              </h1>
              <p className="text-xs text-muted-foreground">Pārvaldi savu profilu</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">{/* ... keep existing code */}
        <div className="space-y-4 sm:space-y-6">
          {/* User Profile Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base sm:text-lg">Lietotāja profils</CardTitle>
              <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>{/* ... keep existing code */}
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="shrink-0">
                    <Edit className="w-4 h-4 mr-2" />
                    Labot
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] p-0 gap-0">
                  <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b shrink-0">
                    <DialogTitle className="text-lg sm:text-xl">Labot profilu</DialogTitle>
                  </DialogHeader>
                  <div className="overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">Vārds</Label>
                      <Input
                        id="name"
                        value={editedProfile.name}
                        onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium">Telefons</Label>
                      <Input
                        id="phone"
                        value={editedProfile.phone}
                        onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="avatar" className="text-sm font-medium">Profila attēls</Label>
                      <Input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="mt-1.5"
                      />
                      {editedProfile.avatar && (
                        <div className="mt-3 flex justify-center">
                          <img src={editedProfile.avatar} alt="Avatar preview" className="w-24 h-24 rounded-full object-cover ring-2 ring-border" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="px-4 sm:px-6 py-4 border-t shrink-0 bg-muted/30">
                    <Button onClick={handleUpdateProfile} className="w-full h-12 text-base font-semibold" disabled={uploadingImage}>
                      {uploadingImage ? 'Augšupielādē...' : 'Saglabāt izmaiņas'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="w-14 h-14 sm:w-16 sm:h-16 shrink-0">
                  <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                  <AvatarFallback className="bg-black text-white text-lg">
                    {userProfile?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base sm:text-lg truncate">{userProfile?.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{userProfile?.email}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{userProfile?.phone || 'Nav telefona'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Info Card */}
          {profile && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-base sm:text-lg">Profesionālā informācija</CardTitle>
                <Dialog open={editProfessionalInfoOpen} onOpenChange={setEditProfessionalInfoOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="shrink-0">
                      <Edit className="w-4 h-4 mr-2" />
                      Labot
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] p-0 gap-0">
                    <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b shrink-0">
                      <DialogTitle className="text-lg sm:text-xl">Labot profesionālo informāciju</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                      <div>
                        <Label htmlFor="category" className="text-sm font-medium">Kategorija</Label>
                        <Select
                          value={editedProfInfo.category}
                          onValueChange={(value) => setEditedProfInfo({ ...editedProfInfo, category: value })}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.name}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="city" className="text-sm font-medium">Pilsēta</Label>
                        <div className="mt-1.5">
                          <CityAutocomplete
                            value={editedProfInfo.city}
                            onChange={(value) => setEditedProfInfo({ ...editedProfInfo, city: value })}
                            placeholder="Sāciet rakstīt pilsētas nosaukumu..."
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="address" className="text-sm font-medium">Pilna adrese</Label>
                        <Input
                          id="address"
                          value={editedProfInfo.address}
                          onChange={(e) => setEditedProfInfo({ ...editedProfInfo, address: e.target.value })}
                          placeholder="Piemēram: Latgales iela 245"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                        <Textarea
                          id="bio"
                          value={editedProfInfo.bio}
                          onChange={(e) => setEditedProfInfo({ ...editedProfInfo, bio: e.target.value })}
                          rows={4}
                          className="mt-1.5 resize-none"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Atzīmējiet atrašanās vietu kartē</Label>
                        <EditableLocationMap
                          latitude={editedProfInfo.latitude}
                          longitude={editedProfInfo.longitude}
                          onLocationChange={(lat, lng, address, city) => {
                            setEditedProfInfo({
                              ...editedProfInfo,
                              latitude: lat,
                              longitude: lng,
                              address: address,
                              city: city
                            });
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="px-4 sm:px-6 py-4 border-t shrink-0 bg-muted/30">
                      <Button onClick={handleUpdateProfessionalInfo} className="w-full h-12 text-base font-semibold">
                        Saglabāt izmaiņas
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="pt-3 space-y-3 sm:space-y-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Kategorija</p>
                  <p className="font-semibold text-sm sm:text-base">{profile.category}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Pilsēta</p>
                  <p className="font-semibold text-sm sm:text-base">{profile.city}</p>
                </div>
                {profile.address && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Adrese</p>
                    <p className="font-semibold text-sm sm:text-base break-words">{profile.address}</p>
                  </div>
                )}
                {profile.bio && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Bio</p>
                    <p className="text-xs sm:text-sm break-words">{profile.bio}</p>
                  </div>
                )}
                {profile.latitude && profile.longitude && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">Atrašanās vieta</p>
                    <LocationMap latitude={profile.latitude} longitude={profile.longitude} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Gallery Card */}
          {profile && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Foto galerija</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Pievienojiet bildes savai galerijai</CardDescription>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
                  {profile.gallery?.map((imageUrl: string, index: number) => (
                    <div key={index} className="relative aspect-square group">
                      <img
                        src={imageUrl}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-full object-cover rounded-xl"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1.5 right-1.5 h-7 w-7 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteImage(imageUrl)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="text-sm"
                />
                {uploadingImage && <p className="text-xs sm:text-sm text-muted-foreground mt-2">Augšupielādē...</p>}
              </CardContent>
            </Card>
          )}

          {/* Delete Account Card */}
          <Card className="overflow-hidden border-destructive/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Konta iestatījumi</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Pārvaldiet sava konta iestatījumus un datus
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="border-t pt-3 sm:pt-4">
                <h3 className="text-sm sm:text-base font-semibold text-destructive mb-2">Dzēst profilu</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  Pēc profila dzēšanas visi jūsu dati tiks neatgriezeniski izdzēsti.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteModalOpen(true)}
                  disabled={isDeleting}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Dzēst profilu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <DeleteAccountModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirmDelete={handleDeleteAccount}
      />
    </div>
  );
}
