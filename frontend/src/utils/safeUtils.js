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