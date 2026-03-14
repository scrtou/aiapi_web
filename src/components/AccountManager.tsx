import React, { useState, useEffect } from 'react';
import { AccountInfo, AccountRequest, ChannelInfo, NexosQuotaResponse } from '../types';
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
  if (!normalized) {
    return 'free';
  }
  return normalized;
};

const getAccountTypeLabel = (accountType?: string): string => {
  switch ((accountType || '').toLowerCase()) {
    case 'pro':
      return 'Pro';
    case 'trial_budget_exceeded':
      return 'Free';
    case 'free':
      return 'Free';
    default:
      return accountType || 'Free';
  }
};

const getAccountTypeBadgeClass = (accountType?: string): string => {
  switch ((accountType || '').toLowerCase()) {
    case 'pro':
      return 'active';
    case 'trial_budget_exceeded':
      return 'inactive';
    default:
      return 'inactive';
  }
};

const getNexosQuotaDisplayText = (
  account: AccountInfo,
  quota?: NexosQuotaResponse,
): string => {
  if ((account.accountType || '').toLowerCase() === 'trial_budget_exceeded') {
    return 'Trial Budget Exceeded';
  }

  if (quota) {
    if (quota.available) {
      return `${formatNumber(quota.quota?.budget_used_raw ?? quota.quota?.budget_used)} / ${quota.quota?.user_limit_raw ?? '-'}`;
    }
    return '查看失败';
  }

  return '加载中';
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

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
};

const formatNumber = (value?: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '-';
  return parsed.toFixed(4);
};

const buildQuotaKey = (account: Pick<AccountInfo, 'apiName' | 'userName'>): string =>
  `${account.apiName}:${account.userName}`;

const isNexosAccount = (apiName?: string): boolean => apiName === 'nexosapi';

const getDisplayedNexosEmail = (
  account: AccountInfo,
  quotaMap: Record<string, NexosQuotaResponse>,
): string => {
  const quota = quotaMap[buildQuotaKey(account)];
  if (quota?.account?.email) {
    return quota.account.email;
  }
  if (account.userName.includes('@')) {
    return account.userName;
  }
  return '-';
};

const AccountManager: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [nexosQuotaMap, setNexosQuotaMap] = useState<Record<string, NexosQuotaResponse>>({});
  const [selectedQuotaAccount, setSelectedQuotaAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOriginalPassword, setEditingOriginalPassword] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [autoRegistering, setAutoRegistering] = useState(false);
  const [registerCount, setRegisterCount] = useState(1);
  const [showRegisterInput, setShowRegisterInput] = useState(false);
  const [selectedAutoRegisterApi, setSelectedAutoRegisterApi] = useState('chaynsapi');
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

  const editingAccountForDisplay = accounts.find(
    (account) => account.apiName === formData.apiName && account.userName === formData.userName,
  );

  // 加载账号列表
  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/aichat/account/info');
      const data = response.data;
      const normalizedAccounts = Array.isArray(data) ? data.map(normalizeAccount) : [];
      setAccounts(normalizedAccounts);
      await loadNexosQuotas(normalizedAccounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载账号列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadNexosQuotas = async (accountList: AccountInfo[]) => {
    const nexosAccounts = accountList.filter((account) => account.apiName === 'nexosapi');
    if (nexosAccounts.length === 0) {
      setNexosQuotaMap({});
      return;
    }

    try {
      const results = await Promise.all(
        nexosAccounts.map(async (account) => {
          try {
            const response = await api.get<NexosQuotaResponse>('/nexosapi/v1/account/quota', {
              params: { userName: account.userName },
            });
            return [buildQuotaKey(account), response.data] as const;
          } catch (err: any) {
            const responseData = err?.response?.data;
            return [buildQuotaKey(account), (
              responseData && typeof responseData === 'object'
                ? responseData
                : {
                    available: false,
                    provider: 'nexosapi',
                    error: err instanceof Error ? err.message : '加载 Nexos 额度失败',
                  }
            ) as NexosQuotaResponse] as const;
          }
        }),
      );

      setNexosQuotaMap(Object.fromEntries(results));
    } finally {
      // no-op
    }
  };

  // 初始加载
  useEffect(() => {
    loadAccounts();
    const loadChannels = async () => {
      try {
        const response = await api.get('/aichat/channel/list');
        const channelData = response.data;
        const normalizedChannels = Array.isArray(channelData) ? channelData : [];
        setChannels(normalizedChannels);
        if (normalizedChannels.length > 0) {
          setSelectedAutoRegisterApi((prev) => {
            if (normalizedChannels.some((channel) => channel.channelname === prev)) {
              return prev;
            }
            return normalizedChannels[0].channelname;
          });
        }
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
      };

      if (!isEditing) {
        cleanedData.password = formData.password;
      } else if (formData.password) {
        cleanedData.password = formData.password;
      } else if (editingOriginalPassword) {
        cleanedData.password = editingOriginalPassword;
      }

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
        setEditingOriginalPassword('');
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
      password: account.password || '',
      authToken: account.authToken || '',
      userTobitId: account.userTobitId,
      personId: account.personId || '',
      useCount: account.useCount || 0,
      tokenStatus: account.tokenStatus ?? true,
      accountStatus: account.accountStatus ?? true,
      accountType: account.accountType || 'free',
    });
    setEditingOriginalPassword(account.password || '');
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
    if (!selectedAutoRegisterApi) {
      setError('请选择要自动注册的渠道');
      return;
    }
    setAutoRegistering(true);
    setError(null);
    setStatusMessage(null);
    try {
      const response = await api.post('/aichat/account/autoregister', {
        apiName: selectedAutoRegisterApi,
        count: registerCount,
      });
      const data = response.data;
      setStatusMessage(data.message || `正在后台为 ${selectedAutoRegisterApi} 注册 ${registerCount} 个账号`);
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
                <select
                  className="register-channel-select"
                  value={selectedAutoRegisterApi}
                  onChange={(e) => setSelectedAutoRegisterApi(e.target.value)}
                  disabled={autoRegistering || channels.length === 0}
                >
                  {channels.length === 0 ? (
                    <option value="">暂无可选渠道</option>
                  ) : (
                    channels.map((channel) => (
                      <option key={channel.id} value={channel.channelname}>
                        {channel.channelname}
                      </option>
                    ))
                  )}
                </select>
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
                  disabled={autoRegistering || loading || channels.length === 0 || !selectedAutoRegisterApi}
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
              <label>{isNexosAccount(formData.apiName) ? '登录邮箱 *' : 'userName *'}</label>
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

          {isEditing && isNexosAccount(formData.apiName) && (
            <div className="form-row">
              <div className="form-group">
                <label>注册邮箱 / 登录邮箱</label>
                <input
                  type="text"
                  value={editingAccountForDisplay ? getDisplayedNexosEmail(editingAccountForDisplay, nexosQuotaMap) : (formData.userName || '')}
                  readOnly
                  disabled
                />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>password *</label>
              <input
                type={isEditing ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!isEditing}
                placeholder={isEditing ? '留空则保持原密码不变' : 'password'}
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
                <option value="trial_budget_exceeded">Trial Budget Exceeded</option>
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
                setEditingOriginalPassword('');
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
                  <th>登录邮箱</th>
                  <th>password</th>
                  <th>authToken</th>
                  <th>userTobitId</th>
                  <th>personId</th>
                  <th>useCount</th>
                  <th>tokenStatus</th>
                  <th>accountStatus</th>
                  <th>accountType</th>
                  <th>Nexos额度</th>
                  <th>createTime</th>
                  <th>actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => (
                  <tr key={`${account.apiName}-${account.userName}-${index}`}>
                    <td>{account.apiName}</td>
                    <td>{account.userName}</td>
                    <td>{isNexosAccount(account.apiName) ? getDisplayedNexosEmail(account, nexosQuotaMap) : '-'}</td>
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
                      <span className={`status-badge ${getAccountTypeBadgeClass(account.accountType)}`}>
                        {getAccountTypeLabel(account.accountType)}
                      </span>
                    </td>
                    <td>
                      {account.apiName === 'nexosapi' ? (
                        (() => {
                          const quota = nexosQuotaMap[buildQuotaKey(account)];
                          return (
                            <button
                              type="button"
                              className="btn-secondary btn-small quota-detail-btn"
                              onClick={() => setSelectedQuotaAccount(account)}
                              disabled={!quota}
                              title={quota?.available
                                ? `已用额度: ${formatNumber(quota.quota?.budget_used_raw ?? quota.quota?.budget_used)}`
                                : (quota?.error || '暂无额度信息')}
                            >
                              {getNexosQuotaDisplayText(account, quota)}
                            </button>
                          );
                        })()
                      ) : (
                        <span className="empty">-</span>
                      )}
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

      {selectedQuotaAccount && (
        <div className="dialog-overlay" onClick={() => setSelectedQuotaAccount(null)}>
          <div className="dialog quota-detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Nexos额度详情 - {selectedQuotaAccount.userName}</h3>
              <button className="dialog-close" onClick={() => setSelectedQuotaAccount(null)}>
                ×
              </button>
            </div>
            <div className="dialog-body">
              {(() => {
                const quota = nexosQuotaMap[buildQuotaKey(selectedQuotaAccount)];
                if (!quota) {
                  return <div className="quota-error">额度信息加载中...</div>;
                }
                if (!quota.available) {
                  return <div className="quota-error">{quota.error || '暂无可用额度信息'}</div>;
                }

                return (
                  <div className="quota-grid">
                    <div className="quota-item">
                      <span className="quota-label">账号</span>
                      <span className="quota-value">{quota.account?.userName || selectedQuotaAccount.userName}</span>
                    </div>
                    <div className="quota-item">
                      <span className="quota-label">账号类型</span>
                      <span className="quota-value">{getAccountTypeLabel(quota.account?.accountType || selectedQuotaAccount.accountType)}</span>
                    </div>
                    <div className="quota-item">
                      <span className="quota-label">套餐类型</span>
                      <span className="quota-value">{quota.quota?.subscription_type || '-'}</span>
                    </div>
                    <div className="quota-item">
                      <span className="quota-label">状态</span>
                      <span className="quota-value">{quota.quota?.status || '-'}</span>
                    </div>
                    <div className="quota-item">
                      <span className="quota-label">已用额度</span>
                      <span className="quota-value">{formatNumber(quota.quota?.budget_used_raw ?? quota.quota?.budget_used)}</span>
                    </div>
                    <div className="quota-item">
                      <span className="quota-label">已用席位</span>
                      <span className="quota-value">{quota.quota?.seats_used_raw ?? '-'}</span>
                    </div>
                    <div className="quota-item">
                      <span className="quota-label">席位上限</span>
                      <span className="quota-value">{quota.quota?.user_limit_raw ?? '-'}</span>
                    </div>
                    <div className="quota-item">
                      <span className="quota-label">自动续费</span>
                      <span className="quota-value">{quota.quota?.auto_renew ? '是' : '否'}</span>
                    </div>
                    <div className="quota-item">
                      <span className="quota-label">启用状态</span>
                      <span className="quota-value">{quota.quota?.enabled ? '已启用' : '未启用'}</span>
                    </div>
                    <div className="quota-item">
                      <span className="quota-label">开始时间</span>
                      <span className="quota-value">{formatDateTime(quota.quota?.start_at)}</span>
                    </div>
                    <div className="quota-item">
                      <span className="quota-label">结束时间</span>
                      <span className="quota-value">{formatDateTime(quota.quota?.end_at)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManager;
