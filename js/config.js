window.APP_CONFIG = {
  // Your Render backend URL, no trailing slash, e.g. https://christmas-api.onrender.com
  API_URL: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://chrisback.onrender.com',
  SHOP_NAME: 'KENYA SUPERMARKETS',
  SHOW_SAMPLE_WINNERS: true,
};