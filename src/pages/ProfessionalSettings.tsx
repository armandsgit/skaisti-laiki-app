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
import { ArrowLeft, Edit, XCircle, Sparkles, LogOut } from 'lucide-react';

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
    <div className="min-h-screen bg-background pb-24">
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
          
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5 stroke-[1.5]" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          {/* User Profile Card */}
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lietotāja profils</CardTitle>
              <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Labot
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-sm:flex max-sm:flex-col max-sm:h-screen">
                  {/* Header - Fixed on mobile */}
                  <div className="max-sm:flex-none max-sm:px-6 max-sm:pt-6 max-sm:pb-4">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Rediģēt profilu</DialogTitle>
                    </DialogHeader>
                  </div>
                  
                  {/* Scrollable Content */}
                  <div className="max-sm:flex-1 max-sm:overflow-y-auto max-sm:px-6 sm:max-h-[60vh] sm:overflow-y-auto">
                    <div className="space-y-6 py-4">
                      <div>
                        <Label htmlFor="name">Vārds</Label>
                        <Input
                          id="name"
                          value={editedProfile.name}
                          onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Telefons</Label>
                        <Input
                          id="phone"
                          value={editedProfile.phone}
                          onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="avatar">Profila attēls</Label>
                        <Input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="mt-2"
                        />
                        {editedProfile.avatar && (
                          <div className="mt-4">
                            <img src={editedProfile.avatar} alt="Avatar preview" className="w-24 h-24 rounded-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer - Fixed on mobile */}
                  <div className="max-sm:flex-none max-sm:px-6 max-sm:pb-6 max-sm:pt-4 max-sm:border-t sm:mt-6">
                    <Button onClick={handleUpdateProfile} className="w-full h-12" disabled={uploadingImage}>
                      {uploadingImage ? 'Augšupielādē...' : 'Saglabāt izmaiņas'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                    {userProfile?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{userProfile?.name}</p>
                  <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
                  <p className="text-sm text-muted-foreground">{userProfile?.phone || 'Nav telefona'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Info Card */}
          {profile && (
            <Card className="border-0 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Profesionālā informācija</CardTitle>
                <Dialog open={editProfessionalInfoOpen} onOpenChange={setEditProfessionalInfoOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Labot
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[800px] max-sm:flex max-sm:flex-col max-sm:h-screen">
                    {/* Header - Fixed on mobile */}
                    <div className="max-sm:flex-none max-sm:px-6 max-sm:pt-6 max-sm:pb-4">
                      <DialogHeader>
                        <DialogTitle className="text-xl">Labot profesionālo informāciju</DialogTitle>
                      </DialogHeader>
                    </div>
                    
                    {/* Scrollable Content */}
                    <div className="max-sm:flex-1 max-sm:overflow-y-auto max-sm:px-6 sm:max-h-[60vh] sm:overflow-y-auto">
                      <div className="space-y-6 py-4">
                        <div>
                          <Label htmlFor="category">Kategorija</Label>
                          <Select
                            value={editedProfInfo.category}
                            onValueChange={(value) => setEditedProfInfo({ ...editedProfInfo, category: value })}
                          >
                            <SelectTrigger className="mt-2">
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
                          <Label htmlFor="city">Pilsēta</Label>
                          <div className="mt-2">
                            <CityAutocomplete
                              value={editedProfInfo.city}
                              onChange={(value) => setEditedProfInfo({ ...editedProfInfo, city: value })}
                              placeholder="Sāciet rakstīt pilsētas nosaukumu..."
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="address">Pilna adrese</Label>
                          <Input
                            id="address"
                            value={editedProfInfo.address}
                            onChange={(e) => setEditedProfInfo({ ...editedProfInfo, address: e.target.value })}
                            placeholder="Piemēram: Latgales iela 245"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea
                            id="bio"
                            value={editedProfInfo.bio}
                            onChange={(e) => setEditedProfInfo({ ...editedProfInfo, bio: e.target.value })}
                            rows={4}
                            className="mt-2"
                          />
                        </div>
                        
                        {/* Map Container - Fully Contained and Responsive */}
                        <div>
                          <Label>Atzīmējiet atrašanās vietu kartē</Label>
                          <div className="w-full h-[300px] sm:h-[400px] mt-2 rounded-2xl overflow-hidden border border-input">
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
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Noklikšķiniet uz kartes, lai atzīmētu savu atrašanās vietu
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer - Fixed on mobile */}
                    <div className="max-sm:flex-none max-sm:px-6 max-sm:pb-6 max-sm:pt-4 max-sm:border-t sm:mt-6">
                      <Button onClick={handleUpdateProfessionalInfo} className="w-full h-12">
                        Saglabāt izmaiņas
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kategorija</p>
                  <p className="font-semibold">{profile.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pilsēta</p>
                  <p className="font-semibold">{profile.city}</p>
                </div>
                {profile.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Adrese</p>
                    <p className="font-semibold">{profile.address}</p>
                  </div>
                )}
                {profile.bio && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bio</p>
                    <p className="text-sm">{profile.bio}</p>
                  </div>
                )}
                {profile.latitude && profile.longitude && (
                  <div className="w-full">
                    <p className="text-sm text-muted-foreground mb-2">Atrašanās vieta</p>
                    <div className="w-full max-w-full">
                      <LocationMap 
                        latitude={profile.latitude} 
                        longitude={profile.longitude}
                        professionalName={userProfile?.name}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Gallery Card */}
          {profile && (
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>Foto galerija</CardTitle>
                <CardDescription>Pievienojiet bildes savai galerijai</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {profile.gallery?.map((imageUrl: string, index: number) => (
                    <div key={index} className="relative aspect-square group">
                      <img
                        src={imageUrl}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
                />
                {uploadingImage && <p className="text-sm text-muted-foreground mt-2">Augšupielādē...</p>}
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
