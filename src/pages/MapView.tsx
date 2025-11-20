import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AllMastersMap from '@/components/AllMastersMap';

const MapView = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary flex flex-col overflow-hidden">
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-10 flex-shrink-0">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="flex-shrink-0 px-2">
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline text-xs sm:text-sm">Atpakaļ</span>
            </Button>
            <h1 className="text-sm sm:text-base md:text-xl font-bold truncate">Meistari kartē</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full overflow-hidden p-2 sm:p-3">
        <div 
          className="w-full rounded-2xl overflow-hidden shadow-lg border"
          style={{
            height: 'calc(100vh - 80px)',
            maxHeight: '100%',
            maxWidth: '100%'
          }}
        >
          <AllMastersMap />
        </div>
      </main>
    </div>
  );
};

export default MapView;
