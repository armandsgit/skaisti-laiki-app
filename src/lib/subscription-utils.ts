/**
 * Calculate remaining days until subscription expires
 * @param periodEnd Unix timestamp in seconds or ISO date string
 * @returns Number of days remaining (0 if expired)
 */
export function daysLeft(periodEnd: number | string | null): number {
  if (!periodEnd) return 0;
  
  try {
    // Handle both Unix timestamp (seconds) and ISO date string
    const endDate = typeof periodEnd === 'number' 
      ? new Date(periodEnd * 1000) 
      : new Date(periodEnd);
    
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

/**
 * Format subscription end date
 */
export function formatSubscriptionDate(date: string | null): string {
  if (!date) return 'Nav noteikts';
  try {
    return new Date(date).toLocaleDateString('lv-LV', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'Nav pieejams';
  }
}

/**
 * Get plan display name in Latvian
 */
export function getPlanDisplayName(planCode: string | null): string {
  if (!planCode) return 'Nav plāna';
  const planMap: { [key: string]: string } = {
    starteris: 'Starteris',
    pro: 'Pro',
    bizness: 'Bizness',
    free: 'Bezmaksas'
  };
  return planMap[planCode.toLowerCase()] || planCode.toUpperCase();
}

/**
 * Check if subscription is in cancelled state but still active
 * Uses subscription_will_renew flag for accurate detection
 */
export function isActiveCancelled(status: string | null, willRenew: boolean | null): boolean {
  return (status === 'active' || status === 'canceled') && willRenew === false;
}

/**
 * Check if subscription is past due (payment failed)
 */
export function isPastDue(status: string | null): boolean {
  return status === 'past_due';
}

/**
 * Check if subscription is fully active (not cancelled, not past due)
 * Uses subscription_will_renew flag for accurate detection
 */
export function isFullyActive(status: string | null, willRenew: boolean | null): boolean {
  return status === 'active' && willRenew === true;
}
