import axios, { AxiosResponse } from 'axios';

// 🔑 Configuration de l'API Symfony backend
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api';
const API_KEY = process.env.REACT_APP_API_KEY || 'sfam_test_12345';

// Type générique pour les réponses API SFAM
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  debug?: any;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': API_KEY,
  },
});

// Intercepteur pour les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Méthodes typées
export const apiGet = async <T>(url: string): Promise<ApiResponse<T>> => {
  const response = await api.get<ApiResponse<T>>(url);
  return response.data;
};

export const apiPost = async <T>(url: string, data: any): Promise<ApiResponse<T>> => {
  const response = await api.post<ApiResponse<T>>(url, data);
  return response.data;
};

export default api;