/**
 * Trigger haptic feedback on mobile devices
 * @param style - The type of haptic feedback ('light', 'medium', 'heavy')
 */
export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  // Check if the device supports vibration
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30
    };
    
    navigator.vibrate(patterns[style]);
  }
};

/**
 * Trigger a success haptic pattern
 */
export const triggerSuccessHaptic = () => {
  if ('vibrate' in navigator) {
    // Double tap pattern for success
    navigator.vibrate([10, 50, 10]);
  }
};

/**
 * Trigger an error haptic pattern
 */
export const triggerErrorHaptic = () => {
  if ('vibrate' in navigator) {
    // Error pattern
    navigator.vibrate([30, 50, 30, 50, 30]);
  }
};
