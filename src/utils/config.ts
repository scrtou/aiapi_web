// 后端配置管理
const BACKEND_CONFIG_KEY = 'backend_config';

export interface BackendConfig {
  host: string;
  port: number;
}

// 默认配置
const DEFAULT_CONFIG: BackendConfig = {
  host: '127.0.0.1',
  port: 5555,
};

// 获取后端配置
export const getBackendConfig = (): BackendConfig => {
  const stored = localStorage.getItem(BACKEND_CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
};

// 保存后端配置
export const saveBackendConfig = (config: BackendConfig): void => {
  localStorage.setItem(BACKEND_CONFIG_KEY, JSON.stringify(config));
};

// 获取后端基础URL
export const getBackendBaseUrl = (): string => {
  const config = getBackendConfig();
  return `http://${config.host}:${config.port}`;
};

// 重置为默认配置
export const resetBackendConfig = (): void => {
  localStorage.removeItem(BACKEND_CONFIG_KEY);
};