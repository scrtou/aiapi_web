import React, { useState, useEffect } from 'react';
import { AccountInfo, AccountRequest, ChannelInfo } from '../types';
import api from '../services/api';
import './AccountManager.css';


// 将后端账号字段标准化为统一 camelCase 结构。
// 说明：兼容代码已移除，这里只接收新字段命名并做类型兜底。
const toBoolean = (value: unknown, defaultValue = false): boolean => {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on', 'active', 'enabled'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off', 'inactive', 'disabled'].includes(normalized)) {
      return false;
    }
  }
  return defaultValue;
};

const toNumber = (value: unknown, defaultValue = 0): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const normalizeAccountType = (value: unknown): string => {
  if (typeof value !== 'string') {
    return 'free';
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'pro' ? 'pro' : 'free';
};

const normalizeAccount = (raw: AccountInfo): AccountInfo => ({
  apiName: raw.apiName ?? '',
  userName: raw.userName ?? '',
  password: raw.password ?? '',
  authToken: raw.authToken ?? '',
  userTobitId: toNumber(raw.userTobitId, 0),
  personId: raw.personId ?? '',
  useCount: toNumber(raw.useCount, 0),
  tokenStatus: toBoolean(raw.tokenStatus, false),
  accountStatus: toBoolean(raw.accountStatus, false),
  createTime: raw.createTime ?? '',
  accountType: normalizeAccountType(raw.accountType),
  status: raw.status ?? 'active',
});

const AccountManager: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRegistering, setAutoRegistering] = useState(false);
  const [registerCount, setRegisterCount] = useState(1);
  const [showRegisterInput, setShowRegisterInput] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState<AccountRequest>({
    apiName: '',
    userName: '',
    password: '',
    authToken: '',
    userTobitId: undefined,
    personId: '',
    useCount: 0,
    tokenStatus: true,
    accountStatus: true,
    accountType: 'free',
  });

  // 加载账号列表
  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/aichat/account/info');
      const data = response.data;
      setAccounts(Array.isArray(data) ? data.map(normalizeAccount) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载账号列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadAccounts();
    const loadChannels = async () => {
      try {
        const response = await api.get('/aichat/channel/list');
        const channelData = response.data;
        setChannels(Array.isArray(channelData) ? channelData : []);
      } catch (err) {
        setError('加载渠道列表失败');
      }
    };
    loadChannels();
  }, []);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 清理空值
      const cleanedData: AccountRequest = {
        apiName: formData.apiName,
        userName: formData.userName,
        password: formData.password,
      };

      if (formData.authToken) cleanedData.authToken = formData.authToken;
      if (formData.userTobitId) cleanedData.userTobitId = formData.userTobitId;
      if (formData.personId) cleanedData.personId = formData.personId;
      if (formData.useCount !== undefined) cleanedData.useCount = formData.useCount;
      if (formData.tokenStatus !== undefined) cleanedData.tokenStatus = formData.tokenStatus;
      if (formData.accountStatus !== undefined) cleanedData.accountStatus = formData.accountStatus;
      if (formData.accountType) cleanedData.accountType = formData.accountType;

      const endpoint = isEditing ? '/aichat/account/update' : '/aichat/account/add';
      const response = await api.post(endpoint, [cleanedData]);
      const results = response.data;
      
      if (results[0].status === 'success') {
        // 重置表单
        setFormData({
          apiName: '',
          userName: '',
          password: '',
          authToken: '',
          userTobitId: undefined,
          personId: '',
          useCount: 0,
          tokenStatus: true,
          accountStatus: true,
          accountType: 'free',
        });
        setShowAddForm(false);
        setIsEditing(false);
        // 重新加载账号列表
        await loadAccounts();
      } else {
        setError(isEditing ? '更新账号失败' : '添加账号失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEditing ? '更新账号失败' : '添加账号失败'));
    } finally {
      setLoading(false);
    }
  };

  // 编辑账号
  const handleEdit = (account: AccountInfo) => {
    setFormData({
      apiName: account.apiName,
      userName: account.userName,
      password: account.password,
      authToken: account.authToken || '',
      userTobitId: account.userTobitId,
      personId: account.personId || '',
      useCount: account.useCount || 0,
      tokenStatus: account.tokenStatus ?? true,
      accountStatus: account.accountStatus ?? true,
      accountType: account.accountType || 'free',
    });
    setIsEditing(true);
    setShowAddForm(true);
  };

  // 删除账号
  const handleDelete = async (apiName: string, userName: string) => {
    if (!confirm(`确定要删除账号 ${userName} (${apiName}) 吗？`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/aichat/account/delete', [{ apiName, userName }]);
      const results = response.data;
      
      if (results[0].status === 'success') {
        // 重新加载账号列表
        await loadAccounts();
      } else {
        setError('删除账号失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除账号失败');
    } finally {
      setLoading(false);
    }
  };

  // 刷新账号状态（token + 账号类型）
  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    setStatusMessage(null);
    try {
      const response = await api.post('/aichat/account/refresh');
      const data = response.data;
      setStatusMessage(data.message || '刷新已在后台启动');
      // 延迟 3 秒后重新加载账号列表
      setTimeout(() => {
        loadAccounts();
        setStatusMessage(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新账号状态失败');
    } finally {
      setRefreshing(false);
    }
  };

  // 自动注册账号
  const handleAutoRegister = async () => {
    if (registerCount < 1 || registerCount > 20) {
      setError('注册数量必须在 1-20 之间');
      return;
    }
    setAutoRegistering(true);
    setError(null);
    setStatusMessage(null);
    try {
      const response = await api.post('/aichat/account/autoregister', {
        apiName: 'chaynsapi',
        count: registerCount,
      });
      const data = response.data;
      setStatusMessage(data.message || `正在后台注册 ${registerCount} 个账号`);
      setShowRegisterInput(false);
      // 延迟后重新加载账号列表
      setTimeout(() => {
        loadAccounts();
      }, 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '自动注册失败');
    } finally {
      setAutoRegistering(false);
    }
  };

  return (
    <div className="account-manager">
      <div className="header">
        <h2>账号数据库管理</h2>
        <div className="header-actions">
          <button
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            {refreshing ? '⏳ 刷新中...' : '🔄 刷新账号状态'}
          </button>
          
          <div className="auto-register-group">
            {showRegisterInput ? (
              <>
                <input
                  type="number"
                  className="register-count-input"
                  value={registerCount}
                  onChange={(e) => setRegisterCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={20}
                  disabled={autoRegistering}
                />
                <button
                  className="btn-register"
                  onClick={handleAutoRegister}
                  disabled={autoRegistering || loading}
                >
                  {autoRegistering ? '⏳ 注册中...' : '✅ 确认注册'}
                </button>
                <button
                  className="btn-secondary btn-small"
                  onClick={() => setShowRegisterInput(false)}
                  disabled={autoRegistering}
                >
                  取消
                </button>
              </>
            ) : (
              <button
                className="btn-register"
                onClick={() => setShowRegisterInput(true)}
                disabled={loading}
              >
                ➕ 自动注册
              </button>
            )}
          </div>

          <button
            className="btn-primary"
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
                setIsEditing(false);
                setFormData({
                  apiName: '',
                  userName: '',
                  password: '',
                  authToken: '',
                  userTobitId: undefined,
                  personId: '',
                  useCount: 0,
                  tokenStatus: true,
                  accountStatus: true,
                  accountType: 'free',
                });
              } else {
                setShowAddForm(true);
              }
            }}
            disabled={loading}
          >
            {showAddForm ? '取消' : '添加账号'}
          </button>
        </div>
      </div>

      {statusMessage && <div className="status-message">{statusMessage}</div>}
      {error && <div className="error-message">{error}</div>}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="account-form">
          <h3>{isEditing ? '编辑账号' : '添加新账号'}</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>apiName *</label>
              <select
                value={formData.apiName}
                onChange={(e) => setFormData({ ...formData, apiName: e.target.value })}
                required
                disabled={isEditing}
              >
                <option value="">选择一个渠道</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.channelname}>
                    {channel.channelname}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>userName *</label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                required
                placeholder="userName"
                disabled={isEditing}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>password *</label>
              <input
                type={isEditing ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="password"
              />
            </div>

            <div className="form-group">
              <label>authToken</label>
              <input
                type="text"
                value={formData.authToken}
                onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                placeholder="authToken (optional)"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>userTobitId</label>
              <input
                type="number"
                value={formData.userTobitId || ''}
                onChange={(e) => setFormData({ ...formData, userTobitId: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="userTobitId (optional)"
              />
            </div>

            <div className="form-group">
              <label>personId</label>
              <input
                type="text"
                value={formData.personId}
                onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
                placeholder="personId (optional)"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>useCount</label>
              <input
                type="number"
                value={formData.useCount}
                onChange={(e) => setFormData({ ...formData, useCount: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label>accountType</label>
              <select
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.tokenStatus}
                  onChange={(e) => setFormData({ ...formData, tokenStatus: e.target.checked })}
                />
                tokenStatus
              </label>
              
              <label>
                <input
                  type="checkbox"
                  checked={formData.accountStatus}
                  onChange={(e) => setFormData({ ...formData, accountStatus: e.target.checked })}
                />
                accountStatus
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (isEditing ? '更新中...' : '添加中...') : (isEditing ? '更新' : '添加')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowAddForm(false);
                setIsEditing(false);
                setFormData({
                  apiName: '',
                  userName: '',
                  password: '',
                  authToken: '',
                  userTobitId: undefined,
                  personId: '',
                  useCount: 0,
                  tokenStatus: true,
                  accountStatus: true,
                  accountType: 'free',
                });
              }}
              disabled={loading}
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div className="accounts-table-container">
        <h3>账号列表 ({accounts.length})</h3>
        
        {loading && !showAddForm ? (
          <div className="loading">加载中...</div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">暂无账号数据</div>
        ) : (
          <div className="table-wrapper">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>apiName</th>
                  <th>userName</th>
                  <th>password</th>
                  <th>authToken</th>
                  <th>userTobitId</th>
                  <th>personId</th>
                  <th>useCount</th>
                  <th>tokenStatus</th>
                  <th>accountStatus</th>
                  <th>accountType</th>
                  <th>createTime</th>
                  <th>actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => (
                  <tr key={`${account.apiName}-${account.userName}-${index}`}>
                    <td>{account.apiName}</td>
                    <td>{account.userName}</td>
                    <td>
                      <span className="password-mask">{'*'.repeat(8)}</span>
                    </td>
                    <td>
                      {account.authToken ? (
                        <span className="token-preview" title={account.authToken}>
                          {account.authToken.substring(0, 10)}...
                        </span>
                      ) : (
                        <span className="empty">-</span>
                      )}
                    </td>
                    <td>{account.userTobitId || '-'}</td>
                    <td>{account.personId || '-'}</td>
                    <td>{account.useCount || 0}</td>
                    <td>
                      <span className={`status-badge ${account.tokenStatus ? 'active' : 'inactive'}`}>
                        {account.tokenStatus ? '✓ 有效' : '✗ 无效'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${account.accountStatus ? 'active' : 'inactive'}`}>
                        {account.accountStatus ? '✓ 启用' : '✗ 禁用'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${account.accountType === 'pro' ? 'active' : 'inactive'}`}>
                        {account.accountType === 'pro' ? 'Pro' : 'Free'}
                      </span>
                    </td>
                    <td>
                      {account.createTime ? (
                        <span className="createtime">
                          {new Date(account.createTime).toLocaleString('zh-CN')}
                        </span>
                      ) : (
                        <span className="empty">-</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-secondary btn-small"
                        onClick={() => handleEdit(account)}
                        disabled={loading}
                        style={{ marginRight: '5px' }}
                      >
                        编辑
                      </button>
                      <button
                        className="btn-danger btn-small"
                        onClick={() => handleDelete(account.apiName, account.userName)}
                        disabled={loading}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountManager;