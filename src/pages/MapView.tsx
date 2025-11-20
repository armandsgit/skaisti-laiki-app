import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AllMastersMap from '@/components/AllMastersMap';

const MapView = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary flex flex-col">
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Atpakaļ
            </Button>
            <h1 className="text-2xl font-bold">Meistari kartē</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="w-full h-full min-h-[calc(100vh-200px)]">
          <AllMastersMap />
        </div>
      </main>
    </div>
  );
};

export default MapView;
