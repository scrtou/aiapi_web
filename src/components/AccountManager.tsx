import React, { useState, useEffect } from 'react';
import { AccountInfo, AccountRequest, ChannelInfo } from '../types';
import api from '../services/api';
import './AccountManager.css';

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
    apiname: '',
    username: '',
    password: '',
    authtoken: '',
    usertobitid: undefined,
    personid: '',
    usecount: 0,
    tokenstatus: true,
    accountstatus: true,
    accounttype: 'free',
  });

  // 加载账号列表
  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/aichat/account/info');
      const data = response.data;
      setAccounts(Array.isArray(data) ? data : []);
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
        const response = await api.get('/aichat/channel/info');
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
        apiname: formData.apiname,
        username: formData.username,
        password: formData.password,
      };

      if (formData.authtoken) cleanedData.authtoken = formData.authtoken;
      if (formData.usertobitid) cleanedData.usertobitid = formData.usertobitid;
      if (formData.personid) cleanedData.personid = formData.personid;
      if (formData.usecount !== undefined) cleanedData.usecount = formData.usecount;
      if (formData.tokenstatus !== undefined) cleanedData.tokenstatus = formData.tokenstatus;
      if (formData.accountstatus !== undefined) cleanedData.accountstatus = formData.accountstatus;
      if (formData.accounttype) cleanedData.accounttype = formData.accounttype;

      const endpoint = isEditing ? '/aichat/account/update' : '/aichat/account/add';
      const response = await api.post(endpoint, [cleanedData]);
      const results = response.data;
      
      if (results[0].status === 'success') {
        // 重置表单
        setFormData({
          apiname: '',
          username: '',
          password: '',
          authtoken: '',
          usertobitid: undefined,
          personid: '',
          usecount: 0,
          tokenstatus: true,
          accountstatus: true,
          accounttype: 'free',
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
      apiname: account.apiname,
      username: account.username,
      password: account.password,
      authtoken: account.authtoken || '',
      usertobitid: account.usertobitid,
      personid: account.personid || '',
      usecount: account.usecount || 0,
      tokenstatus: account.tokenstatus ?? true,
      accountstatus: account.accountstatus ?? true,
      accounttype: account.accounttype || 'free',
    });
    setIsEditing(true);
    setShowAddForm(true);
  };

  // 删除账号
  const handleDelete = async (apiname: string, username: string) => {
    if (!confirm(`确定要删除账号 ${username} (${apiname}) 吗？`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/aichat/account/delete', [{ apiname, username }]);
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
        apiname: 'chaynsapi',
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
                  apiname: '',
                  username: '',
                  password: '',
                  authtoken: '',
                  usertobitid: undefined,
                  personid: '',
                  usecount: 0,
                  tokenstatus: true,
                  accountstatus: true,
                  accounttype: 'free',
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
              <label>API 名称 *</label>
              <select
                value={formData.apiname}
                onChange={(e) => setFormData({ ...formData, apiname: e.target.value })}
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
              <label>用户名 *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                placeholder="账号用户名"
                disabled={isEditing}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>密码 *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="账号密码"
              />
            </div>

            <div className="form-group">
              <label>Auth Token</label>
              <input
                type="text"
                value={formData.authtoken}
                onChange={(e) => setFormData({ ...formData, authtoken: e.target.value })}
                placeholder="认证令牌（可选）"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>User Tobit ID</label>
              <input
                type="number"
                value={formData.usertobitid || ''}
                onChange={(e) => setFormData({ ...formData, usertobitid: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Tobit用户ID（可选）"
              />
            </div>

            <div className="form-group">
              <label>Person ID</label>
              <input
                type="text"
                value={formData.personid}
                onChange={(e) => setFormData({ ...formData, personid: e.target.value })}
                placeholder="人员ID（可选）"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>使用次数</label>
              <input
                type="number"
                value={formData.usecount}
                onChange={(e) => setFormData({ ...formData, usecount: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label>账号类型</label>
              <select
                value={formData.accounttype}
                onChange={(e) => setFormData({ ...formData, accounttype: e.target.value })}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.tokenstatus}
                  onChange={(e) => setFormData({ ...formData, tokenstatus: e.target.checked })}
                />
                Token 状态
              </label>
              
              <label>
                <input
                  type="checkbox"
                  checked={formData.accountstatus}
                  onChange={(e) => setFormData({ ...formData, accountstatus: e.target.checked })}
                />
                账号状态
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
                  apiname: '',
                  username: '',
                  password: '',
                  authtoken: '',
                  usertobitid: undefined,
                  personid: '',
                  usecount: 0,
                  tokenstatus: true,
                  accountstatus: true,
                  accounttype: 'free',
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
                  <th>API 名称</th>
                  <th>用户名</th>
                  <th>密码</th>
                  <th>Auth Token</th>
                  <th>User Tobit ID</th>
                  <th>Person ID</th>
                  <th>使用次数</th>
                  <th>Token 状态</th>
                  <th>账号状态</th>
                  <th>账号类型</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => (
                  <tr key={`${account.apiname}-${account.username}-${index}`}>
                    <td>{account.apiname}</td>
                    <td>{account.username}</td>
                    <td>
                      <span className="password-mask">{'*'.repeat(8)}</span>
                    </td>
                    <td>
                      {account.authtoken ? (
                        <span className="token-preview" title={account.authtoken}>
                          {account.authtoken.substring(0, 10)}...
                        </span>
                      ) : (
                        <span className="empty">-</span>
                      )}
                    </td>
                    <td>{account.usertobitid || '-'}</td>
                    <td>{account.personid || '-'}</td>
                    <td>{account.usecount || 0}</td>
                    <td>
                      <span className={`status-badge ${account.tokenstatus ? 'active' : 'inactive'}`}>
                        {account.tokenstatus ? '✓ 有效' : '✗ 无效'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${account.accountstatus ? 'active' : 'inactive'}`}>
                        {account.accountstatus ? '✓ 启用' : '✗ 禁用'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${account.accounttype === 'pro' ? 'active' : 'inactive'}`}>
                        {account.accounttype === 'pro' ? 'Pro' : 'Free'}
                      </span>
                    </td>
                    <td>
                      {account.createtime ? (
                        <span className="createtime">
                          {new Date(account.createtime).toLocaleString('zh-CN')}
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
                        onClick={() => handleDelete(account.apiname, account.username)}
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