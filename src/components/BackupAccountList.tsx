import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { BackupAccountInfo } from '../types';
import './AccountManager.css';

const toBoolean = (value: unknown, defaultValue = false): boolean => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on', 'active', 'enabled'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off', 'inactive', 'disabled'].includes(normalized)) return false;
  }
  return defaultValue;
};

const normalizeAccountType = (value: unknown): string => {
  if (typeof value !== 'string') return 'free';
  const normalized = value.trim().toLowerCase();
  return normalized || 'free';
};

const getAccountTypeLabel = (accountType?: string): string => {
  switch ((accountType || '').toLowerCase()) {
    case 'pro':
      return 'Pro';
    case 'trial_budget_exceeded':
      return 'Trial Budget Exceeded';
    case 'free':
      return 'Free';
    default:
      return accountType || 'Free';
  }
};

const normalizeAccount = (raw: BackupAccountInfo): BackupAccountInfo => ({
  apiName: raw.apiName ?? '',
  userName: raw.userName ?? '',
  password: raw.password ?? '',
  authToken: raw.authToken ?? '',
  userTobitId: Number(raw.userTobitId || 0),
  personId: raw.personId ?? '',
  useCount: Number(raw.useCount || 0),
  tokenStatus: toBoolean(raw.tokenStatus, false),
  accountStatus: toBoolean(raw.accountStatus, false),
  createTime: raw.createTime ?? '',
  accountType: normalizeAccountType(raw.accountType),
  status: raw.status ?? 'active',
});

const BackupAccountList: React.FC = () => {
  const [accounts, setAccounts] = useState<BackupAccountInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<BackupAccountInfo[]>('/aichat/account/backupinfo');
      const normalized = Array.isArray(response.data) ? response.data.map(normalizeAccount) : [];
      setAccounts(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载备份账号失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  return (
    <div className="account-manager">
      <div className="manager-header">
        <div>
          <h2>备份账号列表</h2>
          <p>这里展示已被迁移到备份数据库的账号记录。</p>
        </div>
        <button className="btn-secondary" onClick={loadAccounts} disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="accounts-table">
          <thead>
            <tr>
              <th>apiName</th>
              <th>userName</th>
              <th>password</th>
              <th>userTobitId</th>
              <th>personId</th>
              <th>useCount</th>
              <th>tokenStatus</th>
              <th>accountStatus</th>
              <th>accountType</th>
              <th>status</th>
              <th>createTime</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty">暂无备份账号</td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={`${account.apiName}:${account.userName}:${account.createTime}`}>
                  <td>{account.apiName}</td>
                  <td>{account.userName}</td>
                  <td>{account.password || '-'}</td>
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
                      {getAccountTypeLabel(account.accountType)}
                    </span>
                  </td>
                  <td>{account.status || '-'}</td>
                  <td>{account.createTime ? new Date(account.createTime).toLocaleString('zh-CN') : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BackupAccountList;
