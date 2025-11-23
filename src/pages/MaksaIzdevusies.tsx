import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function MaksaIzdevusies() {
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: Refresh subscription status
    const timer = setTimeout(() => {
      // This allows time for webhook to process
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

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