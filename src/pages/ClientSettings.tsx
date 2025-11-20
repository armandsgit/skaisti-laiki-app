import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trash2 } from 'lucide-react';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import { toast } from 'sonner';

export default function ClientSettings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleting(true);
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
          body: JSON.stringify({ userId: user.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      toast.success('Tavs profils ir veiksmīgi dzēsts.');
      
      // Sign out and redirect
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Neizdevās izdzēst profilu. Lūdzu, mēģiniet vēlreiz.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary">
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atpakaļ
          </Button>
          <h1 className="text-2xl font-bold">Profila iestatījumi</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle>Dzēst kontu</CardTitle>
              <CardDescription>
                Šī darbība ir neatgriezeniska un izdzēsīs visus tavus datus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ja dzēsīsi savu kontu, tiks neatgriezeniski izdzēsti:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Tavs profils un personīgā informācija</li>
                  <li>Visas rezervācijas un to vēsture</li>
                  <li>Visas atsauksmes, ko esi rakstījis</li>
                  <li>Visi ziņojumi un sarunas</li>
                </ul>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteModalOpen(true)}
                  disabled={deleting}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Dzēst manu kontu
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
