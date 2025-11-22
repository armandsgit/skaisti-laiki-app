import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function ProfessionalSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/professional')}
          className="mb-2 sm:mb-4"
          size="sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
          Atpakaļ
        </Button>

        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Konta iestatījumi</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Pārvaldat sava konta iestatījumus un datus
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

      <DeleteAccountModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirmDelete={handleDeleteAccount}
      />
    </div>
  );
}
