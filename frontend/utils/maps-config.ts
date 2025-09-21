import Constants from 'expo-constants';

/**
 * Checks if Google Maps API keys are properly configured
 * Checks both environment variables and app.json
 * @returns Object with validation results and helpful error messages
 */
export function validateGoogleMapsConfig() {
  const config = Constants.expoConfig;

  if (!config) {
    return {
      isValid: false,
      error: 'App configuration not found',
      suggestion: 'Please ensure the app is properly built and configured.'
    };
  }

  // Check environment variables first (for local development)
  const envIosKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY;

  // Check app.json values (for production builds)
  const configIosKey = config.ios?.config?.googleMapsApiKey;

  // Use environment variables if available, otherwise fall back to app.json
  const iosApiKey = envIosKey || configIosKey;

  // Only need iOS key for this project
  const hasPlaceholderIOS = iosApiKey?.includes('YOUR_') || !iosApiKey;

  if (hasPlaceholderIOS) {
    const isUsingEnv = !!envIosKey;

    return {
      isValid: false,
      error: 'Google Maps API key not configured',
      suggestion: isUsingEnv
        ? 'Please add your Google Maps API key to your .env file. Visit https://console.cloud.google.com/ to get an API key and enable the Maps SDK for iOS.'
        : 'Please add your Google Maps API key to app.json. Visit https://console.cloud.google.com/ to get an API key and enable the Maps SDK for iOS.'
    };
  }

  return {
    isValid: true,
    error: null,
    suggestion: null
  };
}

/**
 * Gets a user-friendly error message for Google Maps configuration issues
 */
export function getMapsConfigErrorMessage() {
  const validation = validateGoogleMapsConfig();

  if (validation.isValid) {
    return null;
  }

  return {
    title: 'Map unavailable',
    message: validation.error,
    suggestion: validation.suggestion,
    isConfigError: true
  };
}
