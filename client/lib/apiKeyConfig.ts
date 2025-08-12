// API Key configuration for routing services
// This allows using paid APIs for better route accuracy when free APIs are limited

export interface RoutingAPIConfig {
  // OpenRouteService API key (https://openrouteservice.org/)
  // Free tier: 2000 requests/day
  // Paid tiers available with higher limits
  openRouteServiceKey?: string;
  
  // MapBox API key (https://www.mapbox.com/)
  // Free tier: 50,000 requests/month
  // More reliable than free services
  mapboxKey?: string;
  
  // Google Maps API key (https://developers.google.com/maps)
  // Paid service, most accurate but requires billing account
  googleMapsKey?: string;
}

// Get API configuration from environment variables
export const getRoutingAPIConfig = (): RoutingAPIConfig => {
  return {
    openRouteServiceKey: import.meta.env.VITE_OPENROUTESERVICE_API_KEY,
    mapboxKey: import.meta.env.VITE_MAPBOX_API_KEY,
    googleMapsKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  };
};

// Check if any paid API keys are available
export const hasPaidAPIKeys = (): boolean => {
  const config = getRoutingAPIConfig();
  return !!(config.mapboxKey || config.googleMapsKey);
};

// Get the best available API configuration
export const getBestAPIConfig = (): { type: string; hasKey: boolean; description: string } => {
  const config = getRoutingAPIConfig();
  
  if (config.googleMapsKey) {
    return {
      type: 'google',
      hasKey: true,
      description: 'Google Maps API - Highest accuracy, paid service'
    };
  }
  
  if (config.mapboxKey) {
    return {
      type: 'mapbox',
      hasKey: true,
      description: 'MapBox API - High accuracy, generous free tier'
    };
  }
  
  if (config.openRouteServiceKey) {
    return {
      type: 'openroute',
      hasKey: true,
      description: 'OpenRouteService - Good accuracy, limited free tier'
    };
  }
  
  return {
    type: 'free',
    hasKey: false,
    description: 'Free public APIs - Limited requests, basic accuracy'
  };
};

// API usage recommendations
export const getAPIRecommendations = () => {
  const bestAPI = getBestAPIConfig();
  
  const recommendations = [
    {
      service: 'OpenRouteService',
      url: 'https://openrouteservice.org/',
      freeLimit: '2,000 requests/day',
      paidOptions: 'Available from €2.99/month',
      setup: 'Set VITE_OPENROUTESERVICE_API_KEY in your .env file',
      recommended: !bestAPI.hasKey
    },
    {
      service: 'MapBox',
      url: 'https://www.mapbox.com/',
      freeLimit: '50,000 requests/month',
      paidOptions: 'Pay-per-use beyond free tier',
      setup: 'Set VITE_MAPBOX_API_KEY in your .env file',
      recommended: bestAPI.type === 'free'
    },
    {
      service: 'Google Maps',
      url: 'https://developers.google.com/maps',
      freeLimit: 'Paid service (requires billing)',
      paidOptions: 'Most accurate, enterprise-grade',
      setup: 'Set VITE_GOOGLE_MAPS_API_KEY in your .env file',
      recommended: false // Only for enterprise use
    }
  ];
  
  return { current: bestAPI, recommendations };
};
