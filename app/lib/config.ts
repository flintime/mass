// Environment variables with validation
const getRequiredEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    console.warn(`Warning: Environment variable ${key} is not set`);
  }
  return value || '';
};

// JWT Configuration - This should never fall back to a default value
export const JWT_SECRET = getRequiredEnvVar('JWT_SECRET');

// API Configuration - This can have a default value
export const BACKEND_URL = getEnvVar('BACKEND_URL', 'http://localhost:5000');

// Add more configuration exports as needed 