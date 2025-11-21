import { useSearchParams } from 'react-router-dom';
import AllMastersMap from '@/components/AllMastersMap';

const MapView = () => {
  const [searchParams] = useSearchParams();
  const selectedMasterId = searchParams.get('masterId');

  return (
    <div className="fixed inset-0 w-full h-full bg-background">
      <AllMastersMap selectedMasterId={selectedMasterId || undefined} />
    </div>
  );
};

export default MapView;
