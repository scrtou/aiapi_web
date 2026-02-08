import { useState } from 'react';
import {
  getBackendConfig,
  saveBackendConfig,
  resetBackendConfig,
  getAdminApiKey,
  saveAdminApiKey,
  clearAdminApiKey,
  BackendConfig,
} from '../utils/config';
import './Settings.css';

const Settings: React.FC = () => {
  const [config, setConfig] = useState<BackendConfig>(() => getBackendConfig());
  const [adminApiKey, setAdminApiKey] = useState<string>(() => getAdminApiKey());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 检测当前页面是否使用 HTTPS
  const isPageHttps = window.location.protocol === 'https:';

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    // 验证
    if (!config.host) {
      setError('请输入主机地址');
      return;
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      setError('请输入有效的端口号（1-65535）');
      return;
    }

    try {
      saveBackendConfig(config);
      saveAdminApiKey(adminApiKey.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('保存配置失败');
    }
  };

  // 重置为默认配置
  const handleReset = () => {
    if (confirm('确定要重置为默认配置吗？')) {
      resetBackendConfig();
      clearAdminApiKey();
      setConfig(getBackendConfig());
      setAdminApiKey('');
      setSaved(false);
      setError(null);
    }
  };

  // 测试连接
  const handleTest = async () => {
    setError(null);
    try {
      const testUrl = `${config.protocol}://${config.host}:${config.port}/chaynsapi/v1/models`;
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5秒超时
      });
      
      if (response.ok) {
        alert('连接测试成功！');
      } else {
        setError(`连接失败：HTTP ${response.status}`);
      }
    } catch (err) {
      setError(`连接测试失败：${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  return (
    <div className="settings">
      <div className="header">
        <h2>后端配置</h2>
      </div>

      {error && <div className="error-message">{error}</div>}
      {saved && <div className="success-message">配置已保存！</div>}

      <form onSubmit={handleSubmit} className="settings-form">
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
              <option value="http" disabled={isPageHttps}>HTTP {isPageHttps ? '(HTTPS页面不可用)' : ''}</option>
              <option value="https">HTTPS</option>
            </select>
            {isPageHttps ? (
              <small className="warning-text">⚠️ 当前页面使用 HTTPS，后端必须使用 HTTPS，否则请求会被浏览器阻止</small>
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
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 8080 })}
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
              <code>{config.protocol}://{config.host}:{config.port}</code>
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
            保存配置
          </button>
          <button type="button" className="btn-secondary" onClick={handleTest}>
            测试连接
          </button>
          <button type="button" className="btn-secondary" onClick={handleReset}>
            重置为默认
          </button>
        </div>
      </form>

      <div className="settings-info">
        <h3>使用说明</h3>
        <ul>
          <li>修改配置后，需要刷新页面才能使新配置生效</li>
          <li>默认配置：127.0.0.1:5555</li>
          <li>配置保存在浏览器的 localStorage 中</li>
          <li>使用"测试连接"按钮可以验证服务器是否可访问</li>
          <li>管理接口认证失败（401）时，请检查 Admin API Key 是否正确</li>
          <li><strong>重要：</strong>如果网站使用 HTTPS 访问，必须将协议设置为 HTTPS，否则浏览器会因为"混合内容"安全策略而阻止 API 请求</li>
        </ul>
      </div>
    </div>
  );
};

export default Settings;
