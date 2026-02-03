import axios from 'axios';
import { getBackendBaseUrl } from '../utils/config';
import type {
  StatusSummaryResponse,
  ChannelStatusResponse,
  ModelStatusResponse,
  StatusQueryParams,
} from '../types';

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

// ============ 服务状态监控 API ============

/**
 * 获取服务状态概览
 */
export const getStatusSummary = async (params?: StatusQueryParams): Promise<StatusSummaryResponse> => {
  const response = await api.get<StatusSummaryResponse>('/aichat/status/summary', { params });
  return response.data;
};

/**
 * 获取渠道状态列表
 */
export const getStatusChannels = async (params?: StatusQueryParams): Promise<ChannelStatusResponse> => {
  const response = await api.get<ChannelStatusResponse>('/aichat/status/channels', { params });
  return response.data;
};

/**
 * 获取模型状态列表
 */
export const getStatusModels = async (params?: StatusQueryParams): Promise<ModelStatusResponse> => {
  const response = await api.get<ModelStatusResponse>('/aichat/status/models', { params });
  return response.data;
};

export default api;
