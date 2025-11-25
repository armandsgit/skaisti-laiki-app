// Plan feature restrictions
export const PLAN_FEATURES = {
  free: {
    name: 'Bezmaksas',
    emailCredits: 0,
    maxServices: 3,
    maxStaffMembers: 1,
    maxGalleryPhotos: 3,
    maxSchedules: 1,
    maxExceptionDaysPerMonth: 3,
    maxActiveReservationsPerMonth: 20,
    calendarDaysVisible: 7,
    statisticsDaysVisible: 7,
    canUseEmailAutomation: false,
    canUseSMS: false,
    canViewStatistics: false,
    canUseAdvancedBooking: false,
    canUsePromoCodes: false,
    canCreatePromoCodes: false,
    canExportData: false,
    showInMap: false,
    verified: false,
    priorityInSearch: false,
    emailNotifications: {
      confirmations: true,
      reminders: false,
      cancellations: false,
    },
  },
  starteris: {
    name: 'Starteris',
    emailCredits: 200,
    maxServices: 10,
    maxStaffMembers: 3,
    maxGalleryPhotos: 10,
    maxSchedules: 2,
    maxExceptionDaysPerMonth: 10,
    maxActiveReservationsPerMonth: 100,
    calendarDaysVisible: 30,
    statisticsDaysVisible: 30,
    canUseEmailAutomation: true,
    canUseSMS: false,
    canViewStatistics: true,
    canUseAdvancedBooking: true,
    canUsePromoCodes: true,
    canCreatePromoCodes: false,
    canExportData: false,
    showInMap: true,
    verified: false,
    priorityInSearch: false,
    emailNotifications: {
      confirmations: true,
      reminders: true,
      cancellations: false,
    },
  },
  pro: {
    name: 'Pro',
    emailCredits: 1000,
    maxServices: 25,
    maxStaffMembers: 10,
    maxGalleryPhotos: 30,
    maxSchedules: 5,
    maxExceptionDaysPerMonth: 30,
    maxActiveReservationsPerMonth: -1, // unlimited
    calendarDaysVisible: 90,
    statisticsDaysVisible: -1, // unlimited
    canUseEmailAutomation: true,
    canUseSMS: true,
    canViewStatistics: true,
    canUseAdvancedBooking: true,
    canUsePromoCodes: true,
    canCreatePromoCodes: true,
    canExportData: true,
    showInMap: true,
    verified: true,
    priorityInSearch: true,
    emailNotifications: {
      confirmations: true,
      reminders: true,
      cancellations: true,
    },
  },
  bizness: {
    name: 'Bizness',
    emailCredits: 5000,
    maxServices: -1, // unlimited
    maxStaffMembers: 999, // unlimited
    maxGalleryPhotos: -1, // unlimited
    maxSchedules: -1, // unlimited
    maxExceptionDaysPerMonth: -1, // unlimited
    maxActiveReservationsPerMonth: -1, // unlimited
    calendarDaysVisible: -1, // unlimited
    statisticsDaysVisible: -1, // unlimited
    canUseEmailAutomation: true,
    canUseSMS: true,
    canViewStatistics: true,
    canUseAdvancedBooking: true,
    canUsePromoCodes: true,
    canCreatePromoCodes: true,
    canExportData: true,
    showInMap: true,
    verified: true,
    priorityInSearch: true,
    emailNotifications: {
      confirmations: true,
      reminders: true,
      cancellations: true,
    },
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

// Helper functions for checking specific limits
export const canAddService = (plan: string | null, currentCount: number): boolean => {
  const features = getPlanFeatures(plan);
  return features.maxServices === -1 || currentCount < features.maxServices;
};

export const canAddStaffMember = (plan: string | null, currentCount: number): boolean => {
  const features = getPlanFeatures(plan);
  return features.maxStaffMembers === 999 || features.maxStaffMembers === -1 || currentCount < features.maxStaffMembers;
};

export const canAddGalleryPhoto = (plan: string | null, currentCount: number): boolean => {
  const features = getPlanFeatures(plan);
  return features.maxGalleryPhotos === -1 || currentCount < features.maxGalleryPhotos;
};

export const canAddSchedule = (plan: string | null, currentCount: number): boolean => {
  const features = getPlanFeatures(plan);
  return features.maxSchedules === -1 || currentCount < features.maxSchedules;
};

export const canAddExceptionDay = (plan: string | null, currentMonthCount: number): boolean => {
  const features = getPlanFeatures(plan);
  return features.maxExceptionDaysPerMonth === -1 || currentMonthCount < features.maxExceptionDaysPerMonth;
};

export const canCreateReservation = (plan: string | null, currentMonthCount: number): boolean => {
  const features = getPlanFeatures(plan);
  return features.maxActiveReservationsPerMonth === -1 || currentMonthCount < features.maxActiveReservationsPerMonth;
};

export const isFeatureBlocked = (plan: string | null, featureKey: keyof typeof PLAN_FEATURES.free): boolean => {
  const features = getPlanFeatures(plan);
  const value = features[featureKey];
  
  // For boolean features
  if (typeof value === 'boolean') {
    return !value;
  }
  
  // For numeric limits
  if (typeof value === 'number') {
    return value === 0;
  }
  
  return false;
};

export const getUpgradeMessage = (plan: string | null): string => {
  if (isFreePlan(plan)) {
    return 'Uzlabojiet uz Starteris plānu, lai atbloķētu šo funkciju';
  }
  if (plan === 'starteris') {
    return 'Uzlabojiet uz Pro plānu, lai atbloķētu šo funkciju';
  }
  if (plan === 'pro') {
    return 'Uzlabojiet uz Bizness plānu, lai atbloķētu šo funkciju';
  }
  return 'Uzlabojiet savu plānu, lai atbloķētu šo funkciju';
};
