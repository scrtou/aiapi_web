import React, { useState, useEffect } from 'react';
import { AccountInfo, AccountRequest, ChannelInfo, NexosQuotaResponse, RetoolWorkspaceInfo, RetoolWorkspaceListItem, RetoolWorkspacePoolStatus, RetoolWorkspaceUpsertRequest } from '../types';
import api, { createRetoolWorkspace, deleteRetoolWorkspace, disableRetoolWorkspace, enableRetoolWorkspace, getRetoolWorkspacePoolStatus, getRetoolWorkspaces, upsertRetoolWorkspace, verifyRetoolWorkspace } from '../services/api';
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

const formatJsonText = (value?: Record<string, unknown>): string => {
  if (!value || Object.keys(value).length === 0) {
    return '{}';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '{}';
  }
};

type RetoolFormMode = 'create' | 'edit';

type RetoolFormState = {
  fullName: string;
  password: string;
  workspacePrefix: string;
  mailProviders: string;
  workspaceId: string;
  email: string;
  mailProvider: string;
  mailAccountId: string;
  baseUrl: string;
  subdomain: string;
  accessToken: string;
  xsrfToken: string;
  openaiResourceUuid: string;
  openaiResourceName: string;
  anthropicResourceUuid: string;
  anthropicResourceName: string;
  workflowId: string;
  workflowApiKey: string;
  agentId: string;
  status: string;
  verifyStatus: string;
  extraCookiesJson: string;
  notesJson: string;
};

const createDefaultRetoolForm = (): RetoolFormState => ({
  fullName: 'Codex Flow',
  password: 'RetoolFlow123!!',
  workspacePrefix: 'codexorg',
  mailProviders: 'gptmail',
  workspaceId: '',
  email: '',
  mailProvider: '',
  mailAccountId: '',
  baseUrl: '',
  subdomain: '',
  accessToken: '',
  xsrfToken: '',
  openaiResourceUuid: '',
  openaiResourceName: '',
  anthropicResourceUuid: '',
  anthropicResourceName: '',
  workflowId: '',
  workflowApiKey: '',
  agentId: '',
  status: 'ready',
  verifyStatus: 'unknown',
  extraCookiesJson: '{}',
  notesJson: '{}',
});

const buildQuotaKey = (account: Pick<AccountInfo, 'apiName' | 'userName'>): string =>
  `${account.apiName}:${account.userName}`;

const isNexosAccount = (apiName?: string): boolean => apiName === 'nexosapi';
const isTemporaryPlaceholderAccount = (account: AccountInfo): boolean =>
  account.status === 'waiting' || account.status === 'registering';

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
  const [retoolWorkspaces, setRetoolWorkspaces] = useState<RetoolWorkspaceListItem[]>([]);
  const [retoolPoolStatus, setRetoolPoolStatus] = useState<RetoolWorkspacePoolStatus | null>(null);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [nexosQuotaMap, setNexosQuotaMap] = useState<Record<string, NexosQuotaResponse>>({});
  const [selectedQuotaAccount, setSelectedQuotaAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRetoolForm, setShowRetoolForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOriginalPassword, setEditingOriginalPassword] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [autoRegistering, setAutoRegistering] = useState(false);
  const [registerCount, setRegisterCount] = useState(1);
  const [showRegisterInput, setShowRegisterInput] = useState(false);
  const [selectedAutoRegisterApi, setSelectedAutoRegisterApi] = useState('chaynsapi');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [retoolCreating, setRetoolCreating] = useState(false);
  const [retoolVerifyingId, setRetoolVerifyingId] = useState<string | null>(null);
  const [retoolFormMode, setRetoolFormMode] = useState<RetoolFormMode>('create');
  const [retoolSaving, setRetoolSaving] = useState(false);
  const [retoolEditingWorkspaceId, setRetoolEditingWorkspaceId] = useState<string | null>(null);
  const [retoolForm, setRetoolForm] = useState<RetoolFormState>(createDefaultRetoolForm());
  
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
  const manualAccountChannels = channels.filter((channel) => channel.channelname !== 'retoolapi');
  const autoRegisterChannels = channels;

  // 加载账号列表
  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/aichat/account/info');
      const data = response.data;
      const normalizedAccounts = Array.isArray(data)
        ? data.map(normalizeAccount).filter((account) => !isTemporaryPlaceholderAccount(account))
        : [];
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

  const loadRetoolWorkspaces = async () => {
    try {
      const [response, poolStatus] = await Promise.all([
        getRetoolWorkspaces(),
        getRetoolWorkspacePoolStatus().catch(() => null),
      ]);
      setRetoolWorkspaces(Array.isArray(response.items) ? response.items : []);
      setRetoolPoolStatus(poolStatus);
    } catch (err) {
      console.error('加载 Retool workspace 列表失败:', err);
      setRetoolWorkspaces([]);
      setRetoolPoolStatus(null);
    }
  };

  // 初始加载
  useEffect(() => {
    loadAccounts();
    loadRetoolWorkspaces();
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

  const handleCreateRetoolWorkspace = async () => {
    setRetoolCreating(true);
    setError(null);
    setStatusMessage(null);
    try {
      const mailProviders = retoolForm.mailProviders
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const response = await createRetoolWorkspace({
        full_name: retoolForm.fullName,
        password: retoolForm.password,
        workspace_prefix: retoolForm.workspacePrefix,
        mail_providers: mailProviders.length > 0 ? mailProviders : ['gptmail'],
      });
      setStatusMessage(`Retool workspace 创建成功：${response.workspace.baseUrl || response.workspace.workspaceId}`);
      setShowRetoolForm(false);
      setRetoolFormMode('create');
      setRetoolEditingWorkspaceId(null);
      setRetoolForm(createDefaultRetoolForm());
      await loadRetoolWorkspaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建 Retool workspace 失败');
    } finally {
      setRetoolCreating(false);
    }
  };

  const handleVerifyRetoolWorkspace = async (workspaceId: string) => {
    setRetoolVerifyingId(workspaceId);
    setError(null);
    setStatusMessage(null);
    try {
      const result = await verifyRetoolWorkspace(workspaceId);
      setStatusMessage(`Retool workspace 校验完成：${result.workspaceId} (${result.verifyStatus})`);
      await loadRetoolWorkspaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : '校验 Retool workspace 失败');
    } finally {
      setRetoolVerifyingId(null);
    }
  };

  const handleToggleRetoolWorkspace = async (workspaceId: string, enable: boolean) => {
    setRetoolVerifyingId(workspaceId);
    setError(null);
    setStatusMessage(null);
    try {
      if (enable) {
        const result = await enableRetoolWorkspace(workspaceId);
        setStatusMessage(`Retool workspace 已启用：${result.workspaceId} (${result.newStatus})`);
      } else {
        const result = await disableRetoolWorkspace(workspaceId);
        setStatusMessage(`Retool workspace 已禁用：${result.workspaceId} (${result.newStatus})`);
      }
      await loadRetoolWorkspaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${enable ? '启用' : '禁用'} Retool workspace 失败`);
    } finally {
      setRetoolVerifyingId(null);
    }
  };

  const handleDeleteRetoolWorkspace = async (workspaceId: string) => {
    if (!window.confirm(`确定要删除 Retool Workspace ${workspaceId} 吗？此操作不可恢复。`)) {
      return;
    }
    setRetoolVerifyingId(workspaceId);
    setError(null);
    setStatusMessage(null);
    try {
      const result = await deleteRetoolWorkspace(workspaceId);
      setStatusMessage(`Retool workspace 已删除：${result.workspaceId}`);
      await loadRetoolWorkspaces();
      if (retoolEditingWorkspaceId === workspaceId) {
        setShowRetoolForm(false);
        setRetoolFormMode('create');
        setRetoolEditingWorkspaceId(null);
        setRetoolForm(createDefaultRetoolForm());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除 Retool workspace 失败');
    } finally {
      setRetoolVerifyingId(null);
    }
  };

  const handleEditRetoolWorkspace = (item: RetoolWorkspaceListItem) => {
    const workspace = item.metadata;
    setRetoolFormMode('edit');
    setRetoolEditingWorkspaceId(workspace.workspaceId || item.id);
    setRetoolForm({
      fullName: '',
      password: workspace.password || '',
      workspacePrefix: '',
      mailProviders: '',
      workspaceId: workspace.workspaceId || item.id,
      email: workspace.email || '',
      mailProvider: workspace.mailProvider || '',
      mailAccountId: workspace.mailAccountId || '',
      baseUrl: workspace.baseUrl || '',
      subdomain: workspace.subdomain || '',
      accessToken: workspace.accessToken || '',
      xsrfToken: workspace.xsrfToken || '',
      openaiResourceUuid: workspace.openaiResourceUuid || '',
      openaiResourceName: workspace.openaiResourceName || '',
      anthropicResourceUuid: workspace.anthropicResourceUuid || '',
      anthropicResourceName: workspace.anthropicResourceName || '',
      workflowId: workspace.workflowId || '',
      workflowApiKey: workspace.workflowApiKey || '',
      agentId: workspace.agentId || '',
      status: workspace.status || item.status || 'ready',
      verifyStatus: workspace.verifyStatus || 'unknown',
      extraCookiesJson: formatJsonText(workspace.extraCookies),
      notesJson: formatJsonText(workspace.notes),
    });
    setShowRetoolForm(true);
    setError(null);
    setStatusMessage(null);
  };

  const handleSaveRetoolWorkspace = async () => {
    if (retoolFormMode !== 'edit') return;
    if (!retoolForm.workspaceId.trim()) {
      setError('workspaceId 不能为空');
      return;
    }
    if (!retoolForm.baseUrl.trim()) {
      setError('baseUrl 不能为空');
      return;
    }

    setRetoolSaving(true);
    setError(null);
    setStatusMessage(null);
    try {
      let extraCookies: Record<string, unknown> | undefined;
      let notes: Record<string, unknown> | undefined;

      if (retoolForm.extraCookiesJson.trim()) {
        extraCookies = JSON.parse(retoolForm.extraCookiesJson);
      }
      if (retoolForm.notesJson.trim()) {
        notes = JSON.parse(retoolForm.notesJson);
      }

      const payload: RetoolWorkspaceUpsertRequest = {
        workspaceId: retoolForm.workspaceId.trim(),
        email: retoolForm.email.trim(),
        password: retoolForm.password.trim(),
        mailProvider: retoolForm.mailProvider.trim(),
        mailAccountId: retoolForm.mailAccountId.trim(),
        baseUrl: retoolForm.baseUrl.trim(),
        subdomain: retoolForm.subdomain.trim(),
        accessToken: retoolForm.accessToken.trim(),
        xsrfToken: retoolForm.xsrfToken.trim(),
        extraCookies,
        openaiResourceUuid: retoolForm.openaiResourceUuid.trim(),
        openaiResourceName: retoolForm.openaiResourceName.trim(),
        anthropicResourceUuid: retoolForm.anthropicResourceUuid.trim(),
        anthropicResourceName: retoolForm.anthropicResourceName.trim(),
        workflowId: retoolForm.workflowId.trim(),
        workflowApiKey: retoolForm.workflowApiKey.trim(),
        agentId: retoolForm.agentId.trim(),
        status: retoolForm.status.trim(),
        verifyStatus: retoolForm.verifyStatus.trim(),
        notes,
      };

      const response = await upsertRetoolWorkspace(payload);
      const verifyResult = await verifyRetoolWorkspace(payload.workspaceId);
      setStatusMessage(
        `Retool workspace 已更新并完成校验：${response.workspace.baseUrl || response.workspace.workspaceId} (${verifyResult.verifyStatus})`,
      );
      setShowRetoolForm(false);
      setRetoolFormMode('create');
      setRetoolEditingWorkspaceId(null);
      setRetoolForm(createDefaultRetoolForm());
      await loadRetoolWorkspaces();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('extraCookies / notes 必须是合法 JSON 对象');
      } else {
        setError(err instanceof Error ? err.message : '更新 Retool workspace 失败');
      }
    } finally {
      setRetoolSaving(false);
    }
  };

  const renderRetoolWorkspaceRow = (item: RetoolWorkspaceListItem, index: number) => {
    const workspace: RetoolWorkspaceInfo = item.metadata;
    const workspaceId = workspace.workspaceId || item.id;
    const workspaceUrl = workspace.baseUrl || `https://${workspace.subdomain}`;
    const verifyOk = workspace.verifyStatus === 'passed' || workspace.verifyStatus === 'ready';
    const inUseCount = workspace.inUseCount || 0;
    const poolStatus = workspace.status === 'disabled'
      ? '已禁用'
      : inUseCount > 0
        ? '使用中'
        : '空闲';
    const poolStatusClass = workspace.status === 'disabled'
      ? 'inactive'
      : inUseCount > 0
        ? 'active'
        : 'idle';
    return (
      <tr key={`${workspaceId}-${index}`}>
        <td>
          <span className="resource-type-badge retool">Retool Workspace</span>
        </td>
        <td>
          <div className="resource-main">retoolapi</div>
          <div className="resource-sub">{workspace.mailProvider || '-'}</div>
        </td>
        <td>
          <div className="resource-main">{workspace.subdomain || workspaceId || '-'}</div>
          <div className="resource-sub">{workspace.email || '-'}</div>
        </td>
        <td>
          <div className="resource-main">{workspaceUrl}</div>
          <div className="resource-sub">敏感信息请点击“编辑”查看</div>
          <div className="resource-sub">
            最近使用: {formatDateTime(workspace.lastUsedAt)}
          </div>
          <div className="resource-sub">
            inUseCount: {inUseCount}
          </div>
        </td>
        <td>
          <span className={`status-badge ${workspace.status === 'ready' ? 'active' : 'inactive'}`}>
            {workspace.status || item.status || '-'}
          </span>
          <span className={`status-badge ${verifyOk ? 'active' : 'inactive'}`} style={{ marginLeft: '0.5rem' }}>
            {workspace.verifyStatus || '-'}
          </span>
          <span className={`status-badge ${poolStatusClass}`} style={{ marginLeft: '0.5rem' }}>
            {poolStatus}
          </span>
        </td>
        <td>{workspace.createdAt || '-'}</td>
        <td>
          <button
            className="btn-secondary btn-small"
            onClick={() => handleVerifyRetoolWorkspace(workspaceId)}
            disabled={retoolVerifyingId === workspaceId}
            style={{ marginRight: '5px' }}
          >
            {retoolVerifyingId === workspaceId ? '校验中...' : '校验'}
          </button>
          <button
            className="btn-secondary btn-small"
            onClick={() => handleEditRetoolWorkspace(item)}
            disabled={retoolSaving || retoolVerifyingId === workspaceId}
            style={{ marginRight: '5px' }}
          >
            编辑
          </button>
          {workspace.status === 'disabled' ? (
            <button
              className="btn-primary btn-small"
              onClick={() => handleToggleRetoolWorkspace(workspaceId, true)}
              disabled={retoolVerifyingId === workspaceId}
              style={{ marginRight: '5px' }}
            >
              {retoolVerifyingId === workspaceId ? '处理中...' : '启用'}
            </button>
          ) : (
            <button
              className="btn-danger btn-small"
              onClick={() => handleToggleRetoolWorkspace(workspaceId, false)}
              disabled={retoolVerifyingId === workspaceId}
              style={{ marginRight: '5px' }}
            >
              {retoolVerifyingId === workspaceId ? '处理中...' : '禁用'}
            </button>
          )}
          <button
            className="btn-secondary btn-small"
            onClick={() => window.open(workspaceUrl, '_blank')}
            style={{ marginRight: '5px' }}
          >
            打开
          </button>
          <button
            className="btn-danger btn-small"
            onClick={() => handleDeleteRetoolWorkspace(workspaceId)}
            disabled={retoolVerifyingId === workspaceId}
          >
            {retoolVerifyingId === workspaceId ? '处理中...' : '删除'}
          </button>
        </td>
      </tr>
    );
  };

  const renderTraditionalAccountRow = (account: AccountInfo, index: number) => {
    const quota = account.apiName === 'nexosapi' ? nexosQuotaMap[buildQuotaKey(account)] : undefined;
    return (
      <tr key={`${account.apiName}-${account.userName}-${index}`}>
        <td>
          <span className="resource-type-badge classic">传统账号</span>
        </td>
        <td>
          <div className="resource-main">{account.apiName}</div>
          <div className="resource-sub">{getAccountTypeLabel(account.accountType)}</div>
        </td>
        <td>
          <div className="resource-main">{account.userName}</div>
          <div className="resource-sub">
            {isNexosAccount(account.apiName) ? getDisplayedNexosEmail(account, nexosQuotaMap) : '-'}
          </div>
        </td>
        <td>
          <div className="resource-main">
            {account.authToken ? `${account.authToken.substring(0, 10)}...` : '无 authToken'}
          </div>
          <div className="resource-sub">personId: {account.personId || '-'}</div>
          <div className="resource-sub">useCount: {account.useCount || 0}</div>
          {account.apiName === 'nexosapi' && (
            <div className="resource-sub">
              Nexos额度: {getNexosQuotaDisplayText(account, quota)}
            </div>
          )}
        </td>
        <td>
          <span className={`status-badge ${account.tokenStatus ? 'active' : 'inactive'}`}>
            {account.tokenStatus ? 'token 有效' : 'token 无效'}
          </span>
          <span className={`status-badge ${account.accountStatus ? 'active' : 'inactive'}`} style={{ marginLeft: '0.5rem' }}>
            {account.accountStatus ? '账号启用' : '账号禁用'}
          </span>
        </td>
        <td>{account.createTime ? new Date(account.createTime).toLocaleString('zh-CN') : '-'}</td>
        <td>
          <button
            className="btn-secondary btn-small"
            onClick={() => handleEdit(account)}
            disabled={loading}
            style={{ marginRight: '5px' }}
          >
            编辑
          </button>
          {account.apiName === 'nexosapi' && (
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={() => setSelectedQuotaAccount(account)}
              style={{ marginRight: '5px' }}
            >
              额度
            </button>
          )}
          <button
            className="btn-danger btn-small"
            onClick={() => handleDelete(account.apiName, account.userName)}
            disabled={loading}
          >
            删除
          </button>
        </td>
      </tr>
    );
  };

  const totalResources = retoolWorkspaces.length + accounts.length;
  const retoolPoolStats = React.useMemo(() => {
    if (retoolPoolStatus) {
      return {
        total: retoolPoolStatus.total || 0,
        idle: retoolPoolStatus.idle || 0,
        inUse: retoolPoolStatus.inUse || 0,
        disabled: retoolPoolStatus.disabled || 0,
        latestUsedAt: retoolPoolStatus.latestUsedAt || '',
        consecutiveFailures: retoolPoolStatus.consecutiveFailures || 0,
        lastFailureAt: retoolPoolStatus.lastFailureAt || '',
        lastFailureReason: retoolPoolStatus.lastFailureReason || '',
        cooldownUntil: retoolPoolStatus.cooldownUntil || '',
      };
    }
    const total = retoolWorkspaces.length;
    let idle = 0;
    let inUse = 0;
    let disabled = 0;
    let latestUsedAt = '';
    for (const item of retoolWorkspaces) {
      const workspace = item.metadata;
      const currentLastUsedAt = workspace.lastUsedAt || '';
      if (workspace.status === 'disabled') {
        disabled += 1;
      } else if ((workspace.inUseCount || 0) > 0) {
        inUse += 1;
      } else {
        idle += 1;
      }
      if (currentLastUsedAt && (!latestUsedAt || currentLastUsedAt > latestUsedAt)) {
        latestUsedAt = currentLastUsedAt;
      }
    }
    return {
      total,
      idle,
      inUse,
      disabled,
      latestUsedAt,
      consecutiveFailures: 0,
      lastFailureAt: '',
      lastFailureReason: '',
      cooldownUntil: '',
    };
  }, [retoolWorkspaces, retoolPoolStatus]);

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
                  disabled={autoRegistering || autoRegisterChannels.length === 0}
                >
                  {autoRegisterChannels.length === 0 ? (
                    <option value="">暂无可选渠道</option>
                  ) : (
                    autoRegisterChannels.map((channel) => (
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
                  disabled={autoRegistering || loading || autoRegisterChannels.length === 0 || !selectedAutoRegisterApi}
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
            className="btn-register"
            onClick={() => {
              if (showRetoolForm && retoolFormMode === 'create') {
                setShowRetoolForm(false);
                setRetoolForm(createDefaultRetoolForm());
              } else {
                setRetoolFormMode('create');
                setRetoolEditingWorkspaceId(null);
                setRetoolForm(createDefaultRetoolForm());
                setShowRetoolForm(true);
              }
            }}
            disabled={loading || retoolCreating}
          >
            {showRetoolForm && retoolFormMode === 'create' ? '取消 Retool 创建' : '🚀 创建 Retool Workspace'}
          </button>

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
                {manualAccountChannels.map((channel) => (
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

      {showRetoolForm && (
        <div
          className="dialog-overlay"
          onClick={() => {
            if (retoolCreating || retoolSaving) return;
            setShowRetoolForm(false);
            setRetoolFormMode('create');
            setRetoolEditingWorkspaceId(null);
            setRetoolForm(createDefaultRetoolForm());
          }}
        >
          <div className="dialog retool-workspace-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>{retoolFormMode === 'create' ? '创建 Retool Workspace' : `编辑 Retool Workspace${retoolEditingWorkspaceId ? `：${retoolEditingWorkspaceId}` : ''}`}</h3>
              <button
                className="dialog-close"
                onClick={() => {
                  if (retoolCreating || retoolSaving) return;
                  setShowRetoolForm(false);
                  setRetoolFormMode('create');
                  setRetoolEditingWorkspaceId(null);
                  setRetoolForm(createDefaultRetoolForm());
                }}
              >
                ×
              </button>
            </div>
            <div className="dialog-content">
              <div className="form-row">
                {retoolFormMode === 'create' ? (
                  <>
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={retoolForm.fullName}
                        onChange={(e) => setRetoolForm({ ...retoolForm, fullName: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Password</label>
                      <input
                        type="text"
                        value={retoolForm.password}
                        onChange={(e) => setRetoolForm({ ...retoolForm, password: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Workspace Prefix</label>
                      <input
                        type="text"
                        value={retoolForm.workspacePrefix}
                        onChange={(e) => setRetoolForm({ ...retoolForm, workspacePrefix: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Mail Providers</label>
                      <input
                        type="text"
                        value={retoolForm.mailProviders}
                        onChange={(e) => setRetoolForm({ ...retoolForm, mailProviders: e.target.value })}
                        placeholder="gptmail,duckmail"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Workspace ID</label>
                      <input
                        type="text"
                        value={retoolForm.workspaceId}
                        onChange={(e) => setRetoolForm({ ...retoolForm, workspaceId: e.target.value })}
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="text"
                        value={retoolForm.email}
                        onChange={(e) => setRetoolForm({ ...retoolForm, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Base URL</label>
                      <input
                        type="text"
                        value={retoolForm.baseUrl}
                        onChange={(e) => setRetoolForm({ ...retoolForm, baseUrl: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Subdomain</label>
                      <input
                        type="text"
                        value={retoolForm.subdomain}
                        onChange={(e) => setRetoolForm({ ...retoolForm, subdomain: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Password（留空保持不变）</label>
                      <input
                        type="text"
                        value={retoolForm.password}
                        onChange={(e) => setRetoolForm({ ...retoolForm, password: e.target.value })}
                        placeholder="留空则保持原值"
                      />
                    </div>
                    <div className="form-group">
                      <label>Mail Provider</label>
                      <input
                        type="text"
                        value={retoolForm.mailProvider}
                        onChange={(e) => setRetoolForm({ ...retoolForm, mailProvider: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Mail Account ID</label>
                      <input
                        type="text"
                        value={retoolForm.mailAccountId}
                        onChange={(e) => setRetoolForm({ ...retoolForm, mailAccountId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Access Token（留空保持不变）</label>
                      <input
                        type="text"
                        value={retoolForm.accessToken}
                        onChange={(e) => setRetoolForm({ ...retoolForm, accessToken: e.target.value })}
                        placeholder="留空则保持原值"
                      />
                    </div>
                    <div className="form-group">
                      <label>XSRF Token（留空保持不变）</label>
                      <input
                        type="text"
                        value={retoolForm.xsrfToken}
                        onChange={(e) => setRetoolForm({ ...retoolForm, xsrfToken: e.target.value })}
                        placeholder="留空则保持原值"
                      />
                    </div>
                    <div className="form-group">
                      <label>OpenAI Resource UUID</label>
                      <input
                        type="text"
                        value={retoolForm.openaiResourceUuid}
                        onChange={(e) => setRetoolForm({ ...retoolForm, openaiResourceUuid: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>OpenAI Resource Name</label>
                      <input
                        type="text"
                        value={retoolForm.openaiResourceName}
                        onChange={(e) => setRetoolForm({ ...retoolForm, openaiResourceName: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Anthropic Resource UUID</label>
                      <input
                        type="text"
                        value={retoolForm.anthropicResourceUuid}
                        onChange={(e) => setRetoolForm({ ...retoolForm, anthropicResourceUuid: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Anthropic Resource Name</label>
                      <input
                        type="text"
                        value={retoolForm.anthropicResourceName}
                        onChange={(e) => setRetoolForm({ ...retoolForm, anthropicResourceName: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Workflow ID</label>
                      <input
                        type="text"
                        value={retoolForm.workflowId}
                        onChange={(e) => setRetoolForm({ ...retoolForm, workflowId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Workflow API Key</label>
                      <input
                        type="text"
                        value={retoolForm.workflowApiKey}
                        onChange={(e) => setRetoolForm({ ...retoolForm, workflowApiKey: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Agent ID</label>
                      <input
                        type="text"
                        value={retoolForm.agentId}
                        onChange={(e) => setRetoolForm({ ...retoolForm, agentId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <input
                        type="text"
                        value={retoolForm.status}
                        onChange={(e) => setRetoolForm({ ...retoolForm, status: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Verify Status</label>
                      <input
                        type="text"
                        value={retoolForm.verifyStatus}
                        onChange={(e) => setRetoolForm({ ...retoolForm, verifyStatus: e.target.value })}
                      />
                    </div>
                    <div className="form-group form-group-full">
                      <label>Extra Cookies JSON</label>
                      <textarea
                        value={retoolForm.extraCookiesJson}
                        onChange={(e) => setRetoolForm({ ...retoolForm, extraCookiesJson: e.target.value })}
                        rows={6}
                      />
                    </div>
                    <div className="form-group form-group-full">
                      <label>Notes JSON</label>
                      <textarea
                        value={retoolForm.notesJson}
                        onChange={(e) => setRetoolForm({ ...retoolForm, notesJson: e.target.value })}
                        rows={6}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={retoolFormMode === 'create' ? handleCreateRetoolWorkspace : handleSaveRetoolWorkspace}
                disabled={retoolCreating || retoolSaving}
              >
                {retoolFormMode === 'create'
                  ? (retoolCreating ? '创建中...' : '开始创建')
                  : (retoolSaving ? '保存中...' : '保存修改')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowRetoolForm(false);
                  setRetoolFormMode('create');
                  setRetoolEditingWorkspaceId(null);
                  setRetoolForm(createDefaultRetoolForm());
                }}
                disabled={retoolCreating || retoolSaving}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="retool-pool-panel">
        <div className="retool-pool-card">
          <div className="retool-pool-label">Retool 资源总数</div>
          <div className="retool-pool-value">{retoolPoolStats.total}</div>
        </div>
        <div className="retool-pool-card">
          <div className="retool-pool-label">空闲</div>
          <div className="retool-pool-value idle">{retoolPoolStats.idle}</div>
        </div>
        <div className="retool-pool-card">
          <div className="retool-pool-label">使用中</div>
          <div className="retool-pool-value active">{retoolPoolStats.inUse}</div>
        </div>
        <div className="retool-pool-card">
          <div className="retool-pool-label">已禁用</div>
          <div className="retool-pool-value inactive">{retoolPoolStats.disabled}</div>
        </div>
        <div className="retool-pool-card wide">
          <div className="retool-pool-label">最近使用时间</div>
          <div className="retool-pool-value text">{formatDateTime(retoolPoolStats.latestUsedAt)}</div>
        </div>
        <div className="retool-pool-card wide">
          <div className="retool-pool-label">连续失败次数</div>
          <div className="retool-pool-value text">{retoolPoolStats.consecutiveFailures}</div>
          <div className="retool-pool-sub">最近失败：{formatDateTime(retoolPoolStats.lastFailureAt)}</div>
          <div className="retool-pool-sub">冷却截止：{formatDateTime(retoolPoolStats.cooldownUntil)}</div>
        </div>
        <div className="retool-pool-card wide">
          <div className="retool-pool-label">最近失败原因</div>
          <div className="retool-pool-value text">{retoolPoolStats.lastFailureReason || '-'}</div>
        </div>
      </div>

      <div className="accounts-table-container">
        <h3>账号资源列表 ({totalResources})</h3>
        
        {loading && !showAddForm ? (
          <div className="loading">加载中...</div>
        ) : totalResources === 0 ? (
          <div className="empty-state">暂无账号资源数据</div>
        ) : (
          <div className="table-wrapper">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>资源类型</th>
                  <th>渠道</th>
                  <th>标识</th>
                  <th>资源信息</th>
                  <th>状态</th>
                  <th>createTime</th>
                  <th>actions</th>
                </tr>
              </thead>
              <tbody>
                {retoolWorkspaces.map(renderRetoolWorkspaceRow)}
                {accounts.map(renderTraditionalAccountRow)}
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
