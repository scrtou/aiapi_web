import axios from 'axios';
import { getBackendBaseUrl, getAdminApiKey } from '../utils/config';
import type {
  StatusSummaryResponse,
  ChannelStatusResponse,
  ModelStatusResponse,
  StatusQueryParams,
  AccountAutomationSettings,
} from '../types';

const api = axios.create({
  baseURL: getBackendBaseUrl(),
});

// 请求拦截器：自动添加 Authorization 头
api.interceptors.request.use(config => {
  const apiKey = getAdminApiKey();
  if (apiKey) {
    config.headers.Authorization = `Bearer ${apiKey}`;
  }
  return config;
});

// 响应拦截器：处理 401 错误
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // 可在此处触发全局未认证提示
      console.warn('[API] 401 Unauthorized — 请检查 Admin API Key 配置');
    }
    return Promise.reject(error);
  }
);

// ============ 服务状态监控 API ============

/**
 * 获取服务状态概览
 */
export const getStatusSummary = async (params?: StatusQueryParams): Promise<StatusSummaryResponse> => {
  const response = await api.get<StatusSummaryResponse>('/aichat/metrics/status/summary', { params });
  return response.data;
};

/**
 * 获取渠道状态列表
 */
export const getStatusChannels = async (params?: StatusQueryParams): Promise<ChannelStatusResponse> => {
  const response = await api.get<ChannelStatusResponse>('/aichat/metrics/status/channels', { params });
  return response.data;
};

/**
 * 获取模型状态列表
 */
export const getStatusModels = async (params?: StatusQueryParams): Promise<ModelStatusResponse> => {
  const response = await api.get<ModelStatusResponse>('/aichat/metrics/status/models', { params });
  return response.data;
};

/**
 * 获取账号自动化设置
 */
export const getAccountAutomationSettings = async (): Promise<AccountAutomationSettings> => {
  const response = await api.get<AccountAutomationSettings>('/aichat/account/settings');
  return response.data;
};

/**
 * 保存账号自动化设置
 */
export const saveAccountAutomationSettings = async (
  settings: AccountAutomationSettings,
): Promise<AccountAutomationSettings> => {
  const response = await api.post<{
    status: 'success' | 'failed';
    message?: string;
    settings: AccountAutomationSettings;
  }>('/aichat/account/settings', settings);
  return response.data.settings;
};

export default api;
