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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/professional/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atpakaļ
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Konta iestatījumi</CardTitle>
            <CardDescription>
              Pārvaldat sava konta iestatījumus un datus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-destructive mb-2">Dzēst profilu</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Pēc profila dzēšanas visi jūsu dati tiks neatgriezeniski izdzēsti.
              </p>
              <Button
                variant="destructive"
                onClick={() => setDeleteModalOpen(true)}
                disabled={isDeleting}
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
