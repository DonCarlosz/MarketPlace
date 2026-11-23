import axios from 'axios';
import { syncSocketAuth } from './socket';

const DEFAULT_API_URL = import.meta.env.PROD
  ? 'https://marketplace-5wy3.onrender.com/api'
  : 'http://localhost:5000/api';

export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export const resolveMediaUrl = (url, fallback = '') => {
  if (!url || typeof url !== 'string') return fallback;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${SERVER_BASE_URL}${url}`;
  return fallback;
};

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token on every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Single-flight refresh promise to prevent parallel 401 refresh storms
let refreshPromise = null;

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${API_BASE_URL}/auth/refresh`, { token: refreshToken })
              .finally(() => {
                refreshPromise = null;
              });
          }

          const res = await refreshPromise;

          if (res.data?.accessToken) {
            localStorage.setItem('accessToken', res.data.accessToken);
            syncSocketAuth(res.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
            return API(originalRequest);
          }
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          syncSocketAuth(null);
          if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
