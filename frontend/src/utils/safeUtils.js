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
  // Production: return API base URL with /api prefix
  if (window.location.hostname === 'sparkvibe.app' || window.location.hostname === 'www.sparkvibe.app') {
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
  
  // If endpoint already starts with http, use it as-is
  // Otherwise, combine with API URL
  let url;
  if (endpoint.startsWith('http')) {
    url = endpoint;
  } else {
    // For production, apiUrl already includes /api, so don't double-add it
    // For development, we need to add /api if it's not already there
    if (apiUrl.includes('/api')) {
      // Production case: apiUrl = 'https://sparkvibe.app/api'
      // endpoint should be '/health', '/leaderboard', etc. (without /api)
      url = `${apiUrl}${endpoint}`;
    } else {
      // Development case: apiUrl = 'http://localhost:5000'
      // endpoint should include /api prefix
      url = endpoint.startsWith('/api') ? `${apiUrl}${endpoint}` : `${apiUrl}/api${endpoint}`;
    }
  }
  
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

// Convenience functions for common API calls
export const apiGet = (endpoint) => fetchWithConfig(endpoint, { method: 'GET' });

export const apiPost = (endpoint, data) => fetchWithConfig(endpoint, {
  method: 'POST',
  body: JSON.stringify(data)
});

export const apiPut = (endpoint, data) => fetchWithConfig(endpoint, {
  method: 'PUT',
  body: JSON.stringify(data)
});

export const apiDelete = (endpoint) => fetchWithConfig(endpoint, { method: 'DELETE' });