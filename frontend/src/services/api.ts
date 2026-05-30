import axios from 'axios';

import type { Conducteur, ConducteurStats } from '../types/api';



export interface ApiResponse<T = any> {

  success: boolean;

  message?: string;

  error?: string;

  data?: T;

  debug?: any;

}



const API_BASE_URL =

  process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000/api';

const FALLBACK_API_KEY =

  process.env.REACT_APP_API_KEY || 'sfam_superviseur_secret_2026';



const api = axios.create({

  baseURL: API_BASE_URL,

  headers: {

    'Content-Type': 'application/json',

  },

  withCredentials: false,

});



api.interceptors.request.use((config) => {

  const token = localStorage.getItem('sfam_token');

  if (token) {

    config.headers.Authorization = `Bearer ${token}`;

    delete config.headers['X-API-KEY'];

  } else {

    config.headers['X-API-KEY'] = FALLBACK_API_KEY;

  }

  return config;

});



api.interceptors.response.use(

  (response) => response,

  (error) => {

    console.error('❌ API Error:', error.response?.data || error.message);

    return Promise.reject(error);

  }

);



export const apiGet = async <T>(url: string): Promise<ApiResponse<T>> => {

  const response = await api.get<ApiResponse<T>>(url);

  return response.data;

};



export const apiPost = async <T>(url: string, data?: any): Promise<ApiResponse<T>> => {

  const response = await api.post<ApiResponse<T>>(url, data);

  return response.data;

};



export const apiCreateVehicle = async (vehicleData: any): Promise<ApiResponse<any>> => {

  const response = await api.post('/vehicles', vehicleData);

  return response.data;

};



export const apiUpdateVehicle = async (id: string, vehicleData: any): Promise<ApiResponse<any>> => {

  const response = await api.put(`/vehicles/${id}`, vehicleData);

  return response.data;

};



export const apiDeleteVehicle = async (id: string): Promise<ApiResponse<any>> => {

  const response = await api.delete(`/vehicles/${id}`);

  return response.data;

};



export const apiGetConducteurs = (): Promise<

  ApiResponse<{ total: number; conducteurs: Conducteur[] }>

> => apiGet('/conducteurs');



export const apiGetConducteurStats = (): Promise<ApiResponse<ConducteurStats>> =>

  apiGet('/conducteurs/stats');



export const apiCreateConducteur = (

  data: Record<string, unknown>,

): Promise<ApiResponse<Conducteur>> => apiPost('/conducteurs', data);



export const apiUpdateConducteur = (

  id: string,

  data: Record<string, unknown>,

): Promise<ApiResponse<Conducteur>> => {

  return api.put(`/conducteurs/${id}`, data).then((r) => r.data);

};



export const apiDeleteConducteur = (id: string): Promise<ApiResponse<void>> => {

  return api.delete(`/conducteurs/${id}`).then((r) => r.data);

};



export const fetchModuleAlerts = async (): Promise<ApiResponse<{ total: number; alertes: ModuleAlerte[] }>> => {

  const response = await api.get('/module-alerts');

  return response.data;

};



export interface ModuleAlerte {

  id: string;

  vehicule: { id: string; immatriculation: string };

  type: string;

  message: string;

  statut: string;

  horodatage: string;

}



export const fetchSettings = async () => {

  const response = await api.get('/settings');

  return response.data;

};



export const updateSettings = async (settings: any) => {

  const response = await api.put('/settings', settings);

  return response.data;

};



export const createApiKey = async () => {

  const response = await api.post('/settings/api-key');

  return response.data;

};



export const copyToClipboard = (text: string) => {

  navigator.clipboard.writeText(text);

};


