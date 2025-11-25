import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Upload, UserCircle2 } from 'lucide-react';

const OnboardingProfilePhoto = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Lūdzu izvēlieties .jpg, .jpeg vai .png attēlu');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Attēla izmērs nedrīkst pārsniegt 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      // Upload to gallery bucket
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}-profile-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Profila attēls saglabāts');
      navigate('/onboarding');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Neizdevās augšupielādēt attēlu');
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Profila attēls</h1>
          <p className="text-sm text-muted-foreground">
            Profila attēls palīdz klientiem izvēlēties jūs ātrāk
          </p>
        </div>

        <div className="flex flex-col items-center space-y-6">
          {/* Photo Preview Circle */}
          <div className="relative">
            <div className="w-40 h-40 rounded-full bg-secondary border-2 border-border overflow-hidden flex items-center justify-center">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCircle2 className="w-24 h-24 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="w-full space-y-3">
            <input
              type="file"
              id="photo-upload"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label htmlFor="photo-upload">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={uploading}
                asChild
              >
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Augšupielādēt attēlu
                </span>
              </Button>
            </label>

            {selectedFile && (
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? 'Saglabā...' : 'Saglabāt un turpināt'}
              </Button>
            )}
          </div>

          {/* Validation Note */}
          <p className="text-xs text-muted-foreground text-center">
            Atļautie formāti: .jpg, .jpeg, .png (maks. 5MB)
          </p>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            disabled={uploading}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Izlaist
          </button>
        </div>
      </Card>
    </div>
  );
};

export default OnboardingProfilePhoto;
