import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WaitingApproval = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;

    const checkApprovalStatus = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('approved')
        .eq('id', user.id)
        .single();

      if (profile?.approved) {
        // Force full page reload to ensure all components refresh
        window.location.href = '/';
      } else {
        setChecking(false);
      }
    };

    checkApprovalStatus();

    // Set up real-time listener for approval status
    const channel = supabase
      .channel('waiting-approval-listener')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload: any) => {
          if (payload.new.approved === true) {
            // Force full page reload to ensure all components refresh properly
            window.location.href = '/';
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Pārbauda statusu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-elegant">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Gaida apstiprināšanu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Tavs konts tiek pārskatīts. Administrators drīzumā apstiprinās tavu reģistrāciju.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                Parasti tas aizņem <strong>līdz 24 stundām</strong>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                Saņemsi paziņojumu uz e-pastu, kad konts būs apstiprināts
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Vari izkāpt un pieslēgties vēlāk
          </p>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={signOut}
          >
            Iziet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WaitingApproval;