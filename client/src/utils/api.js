const getApiBaseUrl = () => {
  // Always use Render backend URL for production
  // In development, this won't match localhost dev server, so empty string for proxy fallback
  return 'https://eiendomsok.onrender.com';
};

export default getApiBaseUrl;
