import { calculateDistance } from './distance-utils';

export interface Master {
  id: string;
  plan: string; // 'pro' | 'basic' | 'free'
  latitude: number | null;
  longitude: number | null;
  approved: boolean;
  active: boolean;
  rating: number | null;
  total_reviews: number | null;
  last_active: string;
  city: string;
  category: string;
  bio: string | null;
  address: string | null;
  is_verified: boolean | null;
  profiles?: {
    name: string;
    avatar?: string;
  };
}

export interface SortedMaster extends Master {
  distance: number;
  planPriority: number;
}

/**
 * Kārto meistarus pēc prioritātes sistēmas:
 * 1. Plāna prioritāte (pro > basic > free)
 * 2. Attālums (mazāks ir labāk)
 * 3. Reitings (augstāks ir labāk)
 * 4. Aktivitāte (neaktīvi >60 dienām iet uz apakšu)
 */
export function getSortedMasters(
  masters: Master[],
  userLat: number,
  userLon: number
): SortedMaster[] {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  
  // Filtrē tikai apstiprinātos, aktīvos meistarus ar aktīvu subscription
  const validMasters = masters.filter(
    (master) => 
      master.approved === true && 
      master.active === true &&
      (master as any).subscription_status === 'active'
  );
  
  // Pievieno papildu info katram meistaram
  const mastersWithInfo: SortedMaster[] = validMasters.map((master) => {
    // Aprēķina attālumu
    const distance =
      master.latitude && master.longitude
        ? calculateDistance(userLat, userLon, master.latitude, master.longitude)
        : 9999; // Ja nav koordinātes, liek pašā beigās
    
    // Plāna prioritāte (premium > pro > basic/starter > free)
    const planPriority =
      master.plan === 'premium' ? 0 :
      master.plan === 'pro' ? 1 : 
      (master.plan === 'basic' || master.plan === 'starter') ? 2 : 3;
    
    return {
      ...master,
      distance,
      planPriority,
    };
  });
  
  // Šķiro pēc prioritātes
  return mastersWithInfo.sort((a, b) => {
    // 1. Premium plāns vienmēr pirmajā vietā
    const aIsPremium = a.plan === 'premium';
    const bIsPremium = b.plan === 'premium';
    if (aIsPremium !== bIsPremium) {
      return aIsPremium ? -1 : 1;
    }
    
    // 2. Pēc plāna prioritātes (pro > basic/starter > free)
    if (a.planPriority !== b.planPriority) {
      return a.planPriority - b.planPriority;
    }
    
    // 3. Aktivitāte - ja >60 dienām, iet uz apakšu
    const aLastActive = new Date(a.last_active);
    const bLastActive = new Date(b.last_active);
    const aIsInactive = aLastActive < sixtyDaysAgo;
    const bIsInactive = bLastActive < sixtyDaysAgo;
    
    if (aIsInactive !== bIsInactive) {
      return aIsInactive ? 1 : -1;
    }
    
    // 4. Pēc attāluma
    if (Math.abs(a.distance - b.distance) > 0.1) {
      return a.distance - b.distance;
    }
    
    // 5. Pēc reitinga
    const aRating = a.rating || 0;
    const bRating = b.rating || 0;
    if (aRating !== bRating) {
      return bRating - aRating;
    }
    
    // 6. Pēc aktivitātes (jaunākie pirmie)
    return bLastActive.getTime() - aLastActive.getTime();
  });
}
