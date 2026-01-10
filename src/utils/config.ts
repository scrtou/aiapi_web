// 后端配置管理
const BACKEND_CONFIG_KEY = 'backend_config';

export interface BackendConfig {
  protocol: 'http' | 'https';
  host: string;
  port: number;
}

// 默认配置 - 根据当前页面协议自动选择
const getDefaultConfig = (): BackendConfig => ({
  protocol: window.location.protocol === 'https:' ? 'https' : 'http',
  host: '127.0.0.1',
  port: 5555,
});

// 获取后端配置
export const getBackendConfig = (): BackendConfig => {
  const stored = localStorage.getItem(BACKEND_CONFIG_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // 兼容旧配置（没有 protocol 字段）
      if (!parsed.protocol) {
        parsed.protocol = window.location.protocol === 'https:' ? 'https' : 'http';
      }
      return parsed;
    } catch {
      return getDefaultConfig();
    }
  }
  return getDefaultConfig();
};

// 保存后端配置
export const saveBackendConfig = (config: BackendConfig): void => {
  localStorage.setItem(BACKEND_CONFIG_KEY, JSON.stringify(config));
};

// 获取后端基础URL
export const getBackendBaseUrl = (): string => {
  const config = getBackendConfig();
  return `${config.protocol}://${config.host}:${config.port}`;
};

// 重置为默认配置
export const resetBackendConfig = (): void => {
  localStorage.removeItem(BACKEND_CONFIG_KEY);
};