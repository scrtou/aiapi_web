import axios from 'axios';
import { getBackendBaseUrl, getAdminApiKey } from '../utils/config';
import type {
  StatusSummaryResponse,
  ChannelStatusResponse,
  ModelStatusResponse,
  StatusQueryParams,
  AccountAutomationSettings,
  RetoolWorkspaceCreateRequest,
  RetoolWorkspaceCreateResponse,
  RetoolWorkspaceInfo,
  RetoolWorkspaceListResponse,
  RetoolWorkspacePoolStatus,
  RetoolWorkspaceUpsertRequest,
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

export const getRetoolWorkspaces = async (): Promise<RetoolWorkspaceListResponse> => {
  const response = await api.get<RetoolWorkspaceListResponse>('/aichat/retool/workspace/list');
  return response.data;
};

export const createRetoolWorkspace = async (
  payload: RetoolWorkspaceCreateRequest,
): Promise<RetoolWorkspaceCreateResponse> => {
  const response = await api.post<RetoolWorkspaceCreateResponse>('/aichat/retool/workspace/create', payload);
  return response.data;
};

export const verifyRetoolWorkspace = async (workspaceId: string): Promise<{
  workspaceId: string;
  ready: boolean;
  verifyStatus: string;
  checks: Record<string, boolean>;
}> => {
  const response = await api.post('/aichat/retool/workspace/verify', { workspaceId });
  return response.data;
};

export const disableRetoolWorkspace = async (workspaceId: string): Promise<{
  status: 'success' | 'failed';
  workspaceId: string;
  newStatus: string;
}> => {
  const response = await api.post('/aichat/retool/workspace/disable', { workspaceId });
  return response.data;
};

export const enableRetoolWorkspace = async (workspaceId: string): Promise<{
  status: 'success' | 'failed';
  workspaceId: string;
  newStatus: string;
  verifyStatus: string;
}> => {
  const response = await api.post('/aichat/retool/workspace/enable', { workspaceId });
  return response.data;
};

export const deleteRetoolWorkspace = async (workspaceId: string): Promise<{
  status: 'success' | 'failed';
  workspaceId: string;
}> => {
  const response = await api.post('/aichat/retool/workspace/delete', { workspaceId });
  return response.data;
};

export const getRetoolWorkspaceInfo = async (workspaceId: string): Promise<{
  workspace: RetoolWorkspaceInfo;
  hasExecutionContext: boolean;
}> => {
  const response = await api.get('/aichat/retool/workspace/info', { params: { workspaceId } });
  return response.data;
};

export const getRetoolWorkspacePoolStatus = async (): Promise<RetoolWorkspacePoolStatus> => {
  const response = await api.get<RetoolWorkspacePoolStatus>('/aichat/retool/workspace/pool-status');
  return response.data;
};

export const upsertRetoolWorkspace = async (payload: RetoolWorkspaceUpsertRequest): Promise<{
  status: 'success' | 'failed';
  workspace: RetoolWorkspaceInfo;
}> => {
  const response = await api.post('/aichat/retool/workspace/upsert', payload);
  return response.data;
};

export default api;
