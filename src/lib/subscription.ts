import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionStatus {
  isActive: boolean;
  plan: string;
  endDate: string | null;
  daysRemaining: number | null;
}

export interface SubscriptionData {
  plan: string;
  subscription_status: string;
  subscription_end_date: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
}

// Price ID to Plan mapping
export const PRICE_ID_TO_PLAN: Record<string, string> = {
  'price_1SWmMTRtOhWJgeVeCxB9RCxm': 'starteris',
  'price_1SWmMtRtOhWJgeVeiKK0m0YL': 'pro',
  'price_1SWmNCRtOhWJgeVekHZDvwzP': 'bizness',
};

// Plan to Credits mapping
export const PLAN_CREDITS: Record<string, number> = {
  'free': 0,
  'starteris': 200,
  'pro': 1000,
  'bizness': 5000,
};

/**
 * Get user's current subscription data
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionData | null> {
  try {
    const { data: profile, error } = await supabase
      .from('professional_profiles')
      .select('plan, subscription_status, subscription_end_date, stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      return null;
    }

    return profile as SubscriptionData;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return null;
  }
}

/**
 * Update user's subscription in database
 */
export async function updateUserSubscription(
  professionalId: string,
  data: {
    plan: string;
    subscription_status: string;
    subscription_end_date: string | null;
    stripe_subscription_id?: string | null;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('professional_profiles')
      .update({
        plan: data.plan,
        subscription_status: data.subscription_status,
        subscription_end_date: data.subscription_end_date,
        ...(data.stripe_subscription_id !== undefined && {
          stripe_subscription_id: data.stripe_subscription_id
        }),
        subscription_last_changed: new Date().toISOString(),
      })
      .eq('id', professionalId);

    if (error) {
      console.error('Error updating subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating subscription:', error);
    return false;
  }
}

/**
 * Add email credits to user
 */
export async function addEmailCredits(professionalId: string, credits: number): Promise<boolean> {
  try {
    // Check if email_credits record exists
    const { data: existing } = await supabase
      .from('email_credits')
      .select('credits')
      .eq('master_id', professionalId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('email_credits')
        .update({
          credits: existing.credits + credits,
          updated_at: new Date().toISOString()
        })
        .eq('master_id', professionalId);

      if (error) {
        console.error('Error updating email credits:', error);
        return false;
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from('email_credits')
        .insert({
          master_id: professionalId,
          credits: credits,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating email credits:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error adding email credits:', error);
    return false;
  }
}

/**
 * Set email credits to specific amount (replaces existing)
 */
export async function setEmailCredits(professionalId: string, credits: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('email_credits')
      .upsert({
        master_id: professionalId,
        credits: credits,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error setting email credits:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error setting email credits:', error);
    return false;
  }
}

/**
 * Downgrade user to FREE plan and deactivate excess staff members
 */
export async function downgradeToFree(professionalId: string): Promise<boolean> {
  try {
    // Update profile to FREE
    const updated = await updateUserSubscription(professionalId, {
      plan: 'free',
      subscription_status: 'inactive',
      subscription_end_date: null,
      stripe_subscription_id: null,
    });

    if (!updated) return false;

    // Reset email credits to 0
    await setEmailCredits(professionalId, 0);

    // Deactivate excess staff members (keep only first 1 for FREE plan)
    await deactivateExcessStaffMembers(professionalId, 'free');

    return true;
  } catch (error) {
    console.error('Error downgrading to free:', error);
    return false;
  }
}

/**
 * Deactivate staff members that exceed plan limit
 */
export async function deactivateExcessStaffMembers(professionalId: string, newPlan: string): Promise<void> {
  try {
    const limit = getStaffMemberLimit(newPlan);
    
    // If unlimited, no need to deactivate
    if (limit === -1 || limit === 999) return;

    // Get all active staff members ordered by creation date
    const { data: staffMembers, error } = await supabase
      .from('staff_members')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error || !staffMembers) {
      console.error('Error fetching staff members:', error);
      return;
    }

    // If within limit, nothing to do
    if (staffMembers.length <= limit) return;

    // Deactivate staff members beyond the limit
    const toDeactivate = staffMembers.slice(limit).map(s => s.id);
    
    if (toDeactivate.length > 0) {
      const { error: deactivateError } = await supabase
        .from('staff_members')
        .update({ is_active: false })
        .in('id', toDeactivate);

      if (deactivateError) {
        console.error('Error deactivating staff members:', deactivateError);
      }
    }
  } catch (error) {
    console.error('Error deactivating excess staff members:', error);
  }
}

/**
 * Check if subscription is expired
 */
export function isSubscriptionExpired(endDate: string | null): boolean {
  if (!endDate) return true;
  const now = new Date();
  const end = new Date(endDate);
  return end < now;
}

/**
 * Check subscription status with expiration logic
 */
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

    const isActive = profile.subscription_status === 'active' && !isSubscriptionExpired(profile.subscription_end_date);
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
  starteris: {
    maxServices: 5,
    maxStaffMembers: 3,
    maxPhotos: 10,
    emailCreditsIncluded: 200,
    priority: 2
  },
  pro: {
    maxServices: 20,
    maxStaffMembers: 10,
    maxPhotos: 50,
    emailCreditsIncluded: 1000,
    priority: 1
  },
  bizness: {
    maxServices: -1, // unlimited
    maxStaffMembers: 999, // unlimited
    maxPhotos: -1, // unlimited
    emailCreditsIncluded: 5000,
    priority: 0
  }
};

export function canAddService(plan: string, currentCount: number): boolean {
  const limit = planLimits[plan as keyof typeof planLimits]?.maxServices || 1;
  return limit === -1 || currentCount < limit;
}

export function canAddStaffMember(plan: string, currentCount: number): boolean {
  const limit = planLimits[plan as keyof typeof planLimits]?.maxStaffMembers || 1;
  return limit === -1 || limit === 999 || currentCount < limit;
}

// Alias for consistency
export const canAddStaffMemberByPlan = canAddStaffMember;

export function getStaffMemberLimit(plan: string): number {
  return planLimits[plan as keyof typeof planLimits]?.maxStaffMembers || 1;
}

export function canUploadPhoto(plan: string, currentCount: number): boolean {
  const limit = planLimits[plan as keyof typeof planLimits]?.maxPhotos || 3;
  return limit === -1 || currentCount < limit;
}
