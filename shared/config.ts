/**
 * Centralized Configuration
 * 
 * This file manages all environment-specific configurations.
 * Change the API_BASE_URL in .env file to switch between environments.
 */

// Get the base URL from environment variable or use default
const getApiBaseUrl = (): string => {
  // For client-side (browser)
  if (typeof window !== 'undefined') {
    // In production, use the same origin as the frontend
    // In development, Vite proxy handles this
    return window.location.origin;
  }
  
  // For server-side
  return process.env.API_BASE_URL || 'http://localhost:5000';
};

// Get the environment
const getEnvironment = (): 'development' | 'production' => {
  if (typeof window !== 'undefined') {
    // Client-side: check hostname
    return window.location.hostname === 'localhost' ? 'development' : 'production';
  }
  // Server-side: check NODE_ENV
  return (process.env.NODE_ENV as 'development' | 'production') || 'development';
};

export const config = {
  // API Configuration
  apiBaseUrl: getApiBaseUrl(),
  
  // Environment
  environment: getEnvironment(),
  isDevelopment: getEnvironment() === 'development',
  isProduction: getEnvironment() === 'production',
  
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
  },
  
  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-tracking',
    name: process.env.DB_NAME || 'employee-tracking',
  },
  
  // External APIs
  externalApis: {
    userApi: process.env.EXTERNAL_USER_API || 'https://jbdspower.in/LeafNetServer/api/user',
    customerApi: process.env.EXTERNAL_CUSTOMER_API || 'https://jbdspower.in/LeafNetServer/api/customer',
    leadApi: process.env.EXTERNAL_LEAD_API || 'https://jbdspower.in/LeafNetServer/api/getAllLead',
  },
  
  // Feature Flags
  features: {
    enableLogging: process.env.ENABLE_LOGGING !== 'false',
    enableDebugMode: process.env.DEBUG_MODE === 'true',
  },
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${config.apiBaseUrl}${cleanEndpoint}`;
};

// Log configuration on initialization (only in development)
if (config.isDevelopment && config.features.enableLogging) {
  console.log('📋 Configuration loaded:', {
    environment: config.environment,
    apiBaseUrl: config.apiBaseUrl,
    isDevelopment: config.isDevelopment,
  });
}

export default config;
