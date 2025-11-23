import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionStatus {
  isActive: boolean;
  plan: string;
  endDate: string | null;
  daysRemaining: number | null;
}

export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
  try {
    const { data: profile, error } = await supabase
      .from('professional_profiles')
      .select('subscription_status, plan, subscription_end_date')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      return null;
    }

    const isActive = profile.subscription_status === 'active';
    const endDate = profile.subscription_end_date;
    
    let daysRemaining = null;
    if (endDate) {
      const end = new Date(endDate);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      isActive,
      plan: profile.plan || 'free',
      endDate,
      daysRemaining
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return null;
  }
}

export function requireActiveSubscription(
  status: SubscriptionStatus | null,
  onInactive: () => void
): boolean {
  if (!status || !status.isActive) {
    onInactive();
    return false;
  }
  return true;
}

export const planLimits = {
  free: {
    maxServices: 1,
    maxStaffMembers: 1,
    maxPhotos: 3,
    emailCreditsIncluded: 0,
    priority: 3
  },
  starter: {
    maxServices: 5,
    maxStaffMembers: 1,
    maxPhotos: 10,
    emailCreditsIncluded: 50,
    priority: 2
  },
  pro: {
    maxServices: 20,
    maxStaffMembers: 5,
    maxPhotos: 50,
    emailCreditsIncluded: 200,
    priority: 1
  },
  premium: {
    maxServices: -1, // unlimited
    maxStaffMembers: -1, // unlimited
    maxPhotos: -1, // unlimited
    emailCreditsIncluded: 500,
    priority: 0
  }
};

export function canAddService(plan: string, currentCount: number): boolean {
  const limit = planLimits[plan as keyof typeof planLimits]?.maxServices || 1;
  return limit === -1 || currentCount < limit;
}

export function canAddStaffMember(plan: string, currentCount: number): boolean {
  const limit = planLimits[plan as keyof typeof planLimits]?.maxStaffMembers || 1;
  return limit === -1 || currentCount < limit;
}

export function canUploadPhoto(plan: string, currentCount: number): boolean {
  const limit = planLimits[plan as keyof typeof planLimits]?.maxPhotos || 3;
  return limit === -1 || currentCount < limit;
}
