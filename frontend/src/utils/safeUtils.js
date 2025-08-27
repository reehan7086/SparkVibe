// Safe utility functions to prevent errors
export const safeIncludes = (str, searchString) => {
  if (typeof str !== 'string') return false;
  return str.includes(searchString);
};

export const safeMap = (array, callback) => {
  if (!Array.isArray(array)) return [];
  return array.map(callback);
};

export const safeFilter = (array, callback) => {
  if (!Array.isArray(array)) return [];
  return array.filter(callback);
};

export const safeFind = (array, callback) => {
  if (!Array.isArray(array)) return undefined;
  return array.find(callback);
};

// API utility functions
export const getApiUrl = () => {
  // Production: always use the API subdomain
  if (import.meta.env.PROD) {
    return 'https://sparkvibe.app/api';
  }
  
  // Development: check environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development fallback: construct from hostname
  const hostname = window.location.hostname || '';
  if (safeIncludes(hostname, 'app.github.dev')) {
    const baseUrl = hostname.replace('-5173', '-5000');
    return `https://${baseUrl}`;
  }
  
  return 'http://localhost:5000';
};

// Fetch API wrapper with consistent configuration
export const fetchWithConfig = async (endpoint, options = {}) => {
  const apiUrl = getApiUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${apiUrl}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    ...options
  };
  
  console.log(`API Request: ${defaultOptions.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log(`API Response: ${response.status} ${url}`);
    return await response.json();
  } catch (error) {
    console.error(`API Error for ${url}:`, error);
    throw error;
  }
};