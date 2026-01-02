import axios from 'axios';
import { getBackendBaseUrl } from '../utils/config';

const api = axios.create({
  baseURL: getBackendBaseUrl(),
});

// You can add interceptors for requests or responses here
// For example, to automatically add an auth token
/*
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
*/

export default api;
