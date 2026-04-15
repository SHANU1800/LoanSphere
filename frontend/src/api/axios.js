import axios from 'axios';

const API_BASE = 'http://localhost:8005/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
  if (tokens.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

// Handle 401 — attempt token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
        const res = await axios.post(`${API_BASE}/auth/token/refresh/`, {
          refresh: tokens.refresh,
        });
        const newTokens = { ...tokens, access: res.data.access };
        localStorage.setItem('tokens', JSON.stringify(newTokens));
        original.headers.Authorization = `Bearer ${res.data.access}`;
        return api(original);
      } catch {
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
