import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AllMastersMap from '@/components/AllMastersMap';

const MapView = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary flex flex-col overflow-x-hidden">
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="flex-shrink-0 px-2">
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline text-xs sm:text-sm">Atpakaļ</span>
            </Button>
            <h1 className="text-base sm:text-xl md:text-2xl font-bold truncate">Meistari kartē</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full overflow-hidden">
        <div className="w-full h-[calc(100vh-60px)] sm:h-[calc(100vh-80px)]">
          <AllMastersMap />
        </div>
      </main>
    </div>
  );
};

export default MapView;
