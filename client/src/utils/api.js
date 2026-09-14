const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://eiendomsok.onrender.com';
  }
  return '';
};

export default getApiBaseUrl;
