import { useCallback, useEffect, useState } from 'react';
import {
  getBackendConfig,
  saveBackendConfig,
  resetBackendConfig,
  getAdminApiKey,
  saveAdminApiKey,
  clearAdminApiKey,
} from '../utils/config';
import type { BackendConfig } from '../utils/config';
import {
  getAccountAutomationSettings,
  saveAccountAutomationSettings,
} from '../services/api';
import type { AccountAutomationSettings } from '../types';
import './Settings.css';

const defaultAccountAutomationSettings: AccountAutomationSettings = {
  autoDeleteEnabled: true,
  deleteAfterDays: 6,
  autoRegisterEnabled: true,
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error as {
      response?: {
        data?: {
          error?: {
            message?: string;
          };
        };
      };
    };
    const message = response.response?.data?.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return error instanceof Error ? error.message : fallback;
};

const Settings: React.FC = () => {
  const [config, setConfig] = useState<BackendConfig>(() => getBackendConfig());
  const [adminApiKey, setAdminApiKey] = useState<string>(() => getAdminApiKey());
  const [clientSaved, setClientSaved] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const [accountAutomation, setAccountAutomation] = useState<AccountAutomationSettings>(
    defaultAccountAutomationSettings,
  );
  const [automationLoading, setAutomationLoading] = useState(true);
  const [automationSaving, setAutomationSaving] = useState(false);
  const [automationSaved, setAutomationSaved] = useState(false);
  const [automationError, setAutomationError] = useState<string | null>(null);

  const isPageHttps = window.location.protocol === 'https:';

  const loadAutomationSettings = useCallback(async () => {
    setAutomationLoading(true);
    setAutomationError(null);

    try {
      const settings = await getAccountAutomationSettings();
      setAccountAutomation(settings);
    } catch (error) {
      setAutomationError(getErrorMessage(error, '加载账号策略设置失败'));
    } finally {
      setAutomationLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAutomationSettings();
  }, [loadAutomationSettings]);

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    setClientSaved(false);

    if (!config.host) {
      setClientError('请输入主机地址');
      return;
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      setClientError('请输入有效的端口号（1-65535）');
      return;
    }

    try {
      saveBackendConfig(config);
      saveAdminApiKey(adminApiKey.trim());
      setClientSaved(true);
      window.setTimeout(() => setClientSaved(false), 3000);
    } catch {
      setClientError('保存配置失败');
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认配置吗？')) {
      resetBackendConfig();
      clearAdminApiKey();
      setConfig(getBackendConfig());
      setAdminApiKey('');
      setClientSaved(false);
      setClientError(null);
    }
  };

  const handleTest = async () => {
    setClientError(null);
    try {
      const testUrl = `${config.protocol}://${config.host}:${config.port}/chaynsapi/v1/models`;
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        alert('连接测试成功！');
      } else {
        setClientError(`连接失败：HTTP ${response.status}`);
      }
    } catch (error) {
      setClientError(`连接测试失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleAutomationSave = async () => {
    setAutomationError(null);
    setAutomationSaved(false);

    if (!Number.isInteger(accountAutomation.deleteAfterDays) || accountAutomation.deleteAfterDays < 1) {
      setAutomationError('自动删除天数必须是大于 0 的整数');
      return;
    }

    setAutomationSaving(true);
    try {
      const savedSettings = await saveAccountAutomationSettings(accountAutomation);
      setAccountAutomation(savedSettings);
      setAutomationSaved(true);
      window.setTimeout(() => setAutomationSaved(false), 3000);
    } catch (error) {
      setAutomationError(getErrorMessage(error, '保存账号策略设置失败'));
    } finally {
      setAutomationSaving(false);
    }
  };

  return (
    <div className="settings">
      <div className="header">
        <h2>系统设置</h2>
      </div>

      {clientError && <div className="error-message">{clientError}</div>}
      {clientSaved && <div className="success-message">本地连接配置已保存！</div>}

      <form onSubmit={handleClientSubmit} className="settings-form">
        <div className="settings-section">
          <h3>后端服务器地址</h3>
          <p className="settings-description">
            配置后端 API 服务器的地址和端口。修改后需要刷新页面才能生效。
            <br />
            <strong>注意：</strong>如果网站使用 HTTPS 访问，后端也必须使用 HTTPS，否则浏览器会阻止请求。
          </p>

          <div className="form-group">
            <label>协议</label>
            <select
              value={config.protocol}
              onChange={(e) => setConfig({ ...config, protocol: e.target.value as 'http' | 'https' })}
              disabled={isPageHttps}
            >
              <option value="http" disabled={isPageHttps}>
                HTTP {isPageHttps ? '(HTTPS页面不可用)' : ''}
              </option>
              <option value="https">HTTPS</option>
            </select>
            {isPageHttps ? (
              <small className="warning-text">
                ⚠️ 当前页面使用 HTTPS，后端必须使用 HTTPS，否则请求会被浏览器阻止
              </small>
            ) : (
              <small>HTTPS 网站必须使用 HTTPS 后端</small>
            )}
          </div>

          <div className="form-group">
            <label>主机地址</label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="例如: localhost 或 192.168.1.100"
            />
            <small>可以是域名、IP地址或 localhost</small>
          </div>

          <div className="form-group">
            <label>端口号</label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 8080 })}
              min="1"
              max="65535"
              placeholder="8080"
            />
            <small>端口范围：1-65535</small>
          </div>

          <div className="current-config">
            <h4>当前配置</h4>
            <div className="config-display">
              <span className="config-label">完整地址：</span>
              <code>
                {config.protocol}://{config.host}:{config.port}
              </code>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>管理接口认证</h3>
          <p className="settings-description">
            配置 Admin API Key 后，前端访问 `/aichat/*` 管理接口时会自动附带
            `Authorization: Bearer &lt;key&gt;` 请求头。
          </p>

          <div className="form-group">
            <label>Admin API Key</label>
            <input
              type="password"
              value={adminApiKey}
              onChange={(e) => setAdminApiKey(e.target.value)}
              placeholder="留空表示不设置认证"
              autoComplete="off"
            />
            <small>留空后保存，将清除本地存储的 API Key</small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            保存本地配置
          </button>
          <button type="button" className="btn-secondary" onClick={handleTest}>
            测试连接
          </button>
          <button type="button" className="btn-secondary" onClick={handleReset}>
            重置为默认
          </button>
        </div>
      </form>

      <div className="settings-form">
        <div className="settings-section">
          <div className="section-header">
            <div>
              <h3>账号自动化策略</h3>
              <p className="settings-description">
                这里控制后端的过期账号自动删除和渠道缺号时的自动补注册；保存后立即生效，并持久化到数据库配置表 `app_config`。
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void loadAutomationSettings()}
              disabled={automationLoading || automationSaving}
            >
              {automationLoading ? '加载中...' : '重新加载'}
            </button>
          </div>

          {automationError && <div className="error-message inline-message">{automationError}</div>}
          {automationSaved && <div className="success-message inline-message">账号策略已保存！</div>}

          {automationLoading ? (
            <div className="loading-placeholder">正在加载后端账号策略...</div>
          ) : (
            <>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={accountAutomation.autoDeleteEnabled}
                  onChange={(e) =>
                    setAccountAutomation({
                      ...accountAutomation,
                      autoDeleteEnabled: e.target.checked,
                    })
                  }
                />
                <span>启用自动删除过期账号</span>
              </label>

              <div className="form-group compact-group">
                <label>自动删除天数</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={accountAutomation.deleteAfterDays}
                  onChange={(e) =>
                    setAccountAutomation({
                      ...accountAutomation,
                      deleteAfterDays: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                />
                <small>达到该天数后，free 账号会在后台巡检时被自动删除。当前默认值为 6 天。</small>
              </div>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={accountAutomation.autoRegisterEnabled}
                  onChange={(e) =>
                    setAccountAutomation({
                      ...accountAutomation,
                      autoRegisterEnabled: e.target.checked,
                    })
                  }
                />
                <span>启用自动补注册账号</span>
              </label>
              <small className="standalone-help">
                关闭后，后端不会因为渠道账号数量不足而自动补号；账号管理页里的手动“自动注册”按钮仍可单独使用。
              </small>

              <div className="form-actions top-borderless">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void handleAutomationSave()}
                  disabled={automationSaving}
                >
                  {automationSaving ? '保存中...' : '保存后端策略'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="settings-info">
        <h3>使用说明</h3>
        <ul>
          <li>修改本地连接配置后，需要刷新页面才能让新的后端地址生效</li>
          <li>默认连接配置：127.0.0.1:5555</li>
          <li>本地连接配置和 Admin API Key 保存在浏览器的 localStorage 中</li>
          <li>账号自动化策略优先从数据库配置表 `app_config` 读取；若表中缺失配置项，则会使用 `config.json` 默认值补齐</li>
          <li>管理接口认证失败（401）时，请检查 Admin API Key 是否正确</li>
          <li>
            <strong>重要：</strong>如果网站使用 HTTPS 访问，必须将协议设置为 HTTPS，否则浏览器会因为“混合内容”安全策略阻止 API 请求
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Settings;
