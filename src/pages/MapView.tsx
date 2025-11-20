import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AllMastersMap from '@/components/AllMastersMap';

const MapView = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary flex flex-col overflow-x-hidden">
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="flex-shrink-0">
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline text-sm">Atpakaļ</span>
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold truncate">Meistari kartē</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-0 sm:px-4 py-2 sm:py-6 overflow-hidden">
        <div className="w-full h-[calc(100vh-80px)] sm:h-[calc(100vh-140px)]">
          <AllMastersMap />
        </div>
      </main>
    </div>
  );
};

export default MapView;
