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
  // Production: use deployed backend
  if (window.location.hostname.includes('ondigitalocean.app') || 
      window.location.hostname === 'sparkvibe.app' || 
      window.location.hostname === 'www.sparkvibe.app') {
    return 'https://backend-sv-3n4v6.ondigitalocean.app';
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