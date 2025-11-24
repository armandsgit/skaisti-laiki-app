import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function MaksaIzdevusies() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  useEffect(() => {
    const verifyAndActivate = async () => {
      console.log('=== PAYMENT SUCCESS PAGE ===');
      console.log('URL:', window.location.href);
      console.log('Params:', Object.fromEntries(searchParams.entries()));

      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        console.log('❌ No session_id found');
        setVerifying(false);
        return;
      }

      try {
        console.log('🔄 Verifying subscription...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('❌ No user');
          setVerifying(false);
          return;
        }

        const { data: profile } = await supabase
          .from('professional_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) {
          console.log('❌ No profile');
          setVerifying(false);
          return;
        }

        console.log('✅ Calling verify-subscription...');
        const { data, error } = await supabase.functions.invoke('verify-subscription', {
          body: { sessionId, professionalId: profile.id }
        });

        console.log('Response:', { data, error });

        if (error) {
          console.error('❌ Verification error:', error);
          toast({
            title: 'Brīdinājums',
            description: 'Maksājums veiksmīgs, bet abonements tiek apstrādāts. Lūdzu pagaidi 1-2 minūtes.',
            variant: 'default',
          });
          setVerifying(false);
          setVerificationSuccess(true);
        } else if (data?.success) {
          console.log('✅ Verification successful!');
          setVerificationSuccess(true);
          setVerifying(false);
          toast({
            title: 'Veiksmīgi aktivizēts!',
            description: `${data.plan} plāns ar ${data.credits} kredītiem.`,
          });
        }
      } catch (error) {
        console.error('❌ Error:', error);
        setVerifying(false);
        setVerificationSuccess(true);
      }
    };

    verifyAndActivate();
  }, [searchParams, toast]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="flex justify-center mb-6">
              <Loader2 className="w-20 h-20 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-4">
              Aktivizē abonementu...
            </h1>
            <p className="text-muted-foreground">
              Lūdzu uzgaidi, kamēr apstiprinām tavu maksājumu.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-12 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle2 className="w-20 h-20 text-primary animate-in zoom-in duration-500" />
          </div>
          
          <h1 className="text-3xl font-bold mb-4">
            Maksājums veiksmīgs!
          </h1>
          
          <p className="text-muted-foreground mb-8">
            Paldies par maksājumu. Tavs abonements ir aktivizēts un e-pasta kredīti ir pieejami.
            Tagad vari pilnvērtīgi izmantot visas platformas iespējas.
          </p>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/professional')}
              className="w-full"
            >
              Atpakaļ uz profilu
            </Button>
            
            <Button 
              onClick={() => navigate('/billing')}
              variant="outline"
              className="w-full"
            >
              Skatīt rēķinus
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}