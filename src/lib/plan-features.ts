// Plan feature restrictions
export const PLAN_FEATURES = {
  free: {
    name: 'Bezmaksas',
    emailCredits: 0,
    maxServices: 3,
    canUseEmailAutomation: false,
    canViewStatistics: true,
    canUseAdvancedBooking: false,
    showInMap: false,
    verified: false,
    priorityInSearch: false,
  },
  starteris: {
    name: 'Starteris',
    emailCredits: 200,
    maxServices: 10,
    canUseEmailAutomation: true,
    canViewStatistics: true,
    canUseAdvancedBooking: false,
    showInMap: true,
    verified: false,
    priorityInSearch: false,
  },
  pro: {
    name: 'Pro',
    emailCredits: 1000,
    maxServices: -1, // unlimited
    canUseEmailAutomation: true,
    canViewStatistics: true,
    canUseAdvancedBooking: true,
    showInMap: true,
    verified: true,
    priorityInSearch: true,
  },
  bizness: {
    name: 'Bizness',
    emailCredits: 5000,
    maxServices: -1, // unlimited
    canUseEmailAutomation: true,
    canViewStatistics: true,
    canUseAdvancedBooking: true,
    showInMap: true,
    verified: true,
    priorityInSearch: true,
  },
};

export type PlanType = keyof typeof PLAN_FEATURES;

export const getPlanFeatures = (plan: string | null) => {
  const planKey = (plan?.toLowerCase() || 'free') as PlanType;
  return PLAN_FEATURES[planKey] || PLAN_FEATURES.free;
};

export const canAccessFeature = (plan: string | null, feature: keyof typeof PLAN_FEATURES.free) => {
  const planFeatures = getPlanFeatures(plan);
  return planFeatures[feature];
};

export const isFreePlan = (plan: string | null) => {
  return !plan || plan.toLowerCase() === 'free';
};
