// 账号信息接口 - 与后端账号 API 使用统一 camelCase 命名
export interface AccountInfo {
  apiName: string;
  userName: string;
  password: string;
  authToken?: string;
  userTobitId?: number;
  personId?: string;
  useCount?: number;
  tokenStatus?: boolean;
  accountStatus?: boolean;
  createTime?: string;
  accountType?: string;
  status?: string;
}

// 账号添加/删除请求
export interface AccountRequest {
  apiName: string;
  userName: string;
  password?: string;
  authToken?: string;
  userTobitId?: number;
  personId?: string;
  useCount?: number;
  tokenStatus?: boolean;
  accountStatus?: boolean;
  accountType?: string;
}

// 账号操作响应
export interface AccountOperationResponse {
  apiName: string;
  userName: string;
  status: 'success' | 'failed';
}

export interface BackupAccountInfo extends AccountInfo {}

export interface NexosQuotaInfo {
  auto_renew?: boolean;
  budget_used?: number;
  budget_used_raw?: number;
  enabled?: boolean;
  end_at?: string;
  seats_used_raw?: number;
  start_at?: string;
  status?: string;
  subscription_type?: string;
  trial_active_detected?: boolean;
  trial_type_detected?: boolean;
  user_limit_raw?: number;
}

export interface NexosQuotaResponse {
  account?: {
    accountType?: string;
    email?: string;
    userName?: string;
  };
  available: boolean;
  provider: string;
  quota?: NexosQuotaInfo;
  error?: string;
}

// 账号自动化设置
export interface AccountAutomationSettings {
  autoDeleteEnabled: boolean;
  deleteAfterDays: number;
  autoRegisterEnabled: boolean;
}

// 模型信息接口
export interface Model {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  contextLength?: number;
  pricing?: {
    input: number;
    output: number;
  };
}

// 渠道信息接口 - 对应后端的 Channelinfo_st
export interface ChannelInfo {
  id: number;
  channelname: string;
  channeltype: string;
  channelurl: string;
  channelkey: string;
  channelstatus: boolean;
  maxconcurrent: number;
  timeout: number;
  priority: number;
  description: string;
  createtime: string;
  updatetime: string;
  accountcount?: number;
  accountretentiondays?: number;
  supports_tool_calls?: boolean;
}

// 渠道添加/更新请求
export interface ChannelRequest {
  id?: number;
  channelname: string;
  channeltype: string;
  channelurl?: string;
  channelkey?: string;
  channelstatus?: boolean;
  maxconcurrent?: number;
  timeout?: number;
  priority?: number;
  description?: string;
  accountcount?: number;
  accountretentiondays?: number;
  supports_tool_calls?: boolean;
}

// 渠道操作响应
export interface ChannelOperationResponse {
  status: 'success' | 'failed';
  message: string;
  channelname?: string;
  id?: number;
}

// 通用API响应类型
export interface ApiResponse {
  status: 'success' | 'failed';
  message?: string;
}

// ============ 错误统计与监控相关类型 ============

// 时间序列数据点（前端消费用）
export interface TimeSeriesPoint {
  timestamp: string; // ISO string
  count: number;
}

// 后端时间序列桶（对应 /aichat/metrics/*/series 返回的 data[] 元素）
export interface BackendTimeSeriesBucket {
  bucket_start: string; // "YYYY-MM-DD HH:MM:SS" (UTC)
  count: number;
}

// 请求统计时间序列响应
export interface RequestsSeriesResponse {
  // 主接口字段
  from: string;
  to: string;
  data: BackendTimeSeriesBucket[];

  // 可选扩展字段
  series?: TimeSeriesPoint[];
  total?: number;
  interval?: string;
  start_time?: string;
  end_time?: string;
}

// 错误统计时间序列响应
export interface ErrorsSeriesResponse {
  // 主接口字段
  from: string;
  to: string;
  data: BackendTimeSeriesBucket[];

  // 可选扩展字段
  series?: TimeSeriesPoint[];
  total?: number;
  interval?: string;
  start_time?: string;
  end_time?: string;
}

// 后端错误事件（对应 /aichat/metrics/errors/events 返回的 data[] 元素）
export interface BackendErrorEvent {
  id: number;
  ts: string; // "YYYY-MM-DD HH:MM:SS" (UTC)
  severity: string;
  domain: string;
  type: string;
  provider?: string;
  model?: string;
  client_type?: string;
  api_kind?: string;
  stream?: boolean;
  http_status?: number;
  request_id?: string;
  message: string;
}

// 错误事件记录（前端消费用）
export interface ErrorEvent {
  id: number;
  request_id: string;
  timestamp: string; // ISO string
  domain: 'SESSION_GATE' | 'UPSTREAM' | 'INTERNAL' | 'TOOL_BRIDGE' | string;
  severity: 'ERROR' | 'WARN' | string;
  error_code: string;
  message: string;
  model?: string;
  channel?: string;
  provider?: string;
  http_status?: number;
  latency_ms?: number;
  metadata?: Record<string, unknown>;
}

// 错误事件列表响应
export interface ErrorEventsResponse {
  // 主接口字段
  from: string;
  to: string;
  limit: number;
  offset: number;
  data: BackendErrorEvent[];
  count: number; // 当前返回条数

  // 可选扩展字段
  events?: ErrorEvent[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
}

// 错误事件详情响应
export interface ErrorEventDetailResponse extends ErrorEvent {
  // 主接口字段
  detail_json?: string;
  raw_snippet?: string;

  // 可选扩展字段
  stack_trace?: string;
  request_body?: string;
  response_body?: string;
}

// 查询参数
export interface MetricsQueryParams {
  // 主查询参数
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  domain?: string;
  severity?: string;
  type?: string;
  provider?: string;
  model?: string;
  client_type?: string;

  // 可选查询参数
  start_time?: string;
  end_time?: string;
  interval?: '1m' | '5m' | '15m' | '1h' | '6h' | '1d';
  channel?: string;
  page?: number;
  page_size?: number;
}

// 仪表盘统计摘要
export interface DashboardSummary {
  total_requests: number;
  total_errors: number;
  error_rate: number;
  avg_latency_ms: number;
  top_error_codes: { code: string; count: number }[];
  errors_by_domain: { domain: string; count: number }[];
}

// ============ 服务状态监控相关类型 ============

// 服务健康状态
export type ServiceHealthStatus = 'OK' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

// 状态桶数据（时间序列）
export interface StatusBucket {
  bucket_start: string;    // "YYYY-MM-DD HH:MM:SS" (UTC)
  request_count: number;
  error_count: number;
  error_rate: number;
}

// 服务状态概览响应
export interface StatusSummaryResponse {
  total_requests: number;
  total_errors: number;
  error_rate: number;
  channel_count: number;
  model_count: number;
  healthy_channels: number;
  degraded_channels: number;
  down_channels: number;
  overall_status: ServiceHealthStatus;
  buckets: StatusBucket[];
}

// 渠道状态项
export interface ChannelStatusItem {
  channel_id: string;
  channel_name: string;
  total_requests: number;
  total_errors: number;
  error_rate: number;
  status: ServiceHealthStatus;
  last_request_time: string;
  buckets: StatusBucket[];
}

// 渠道状态列表响应
export interface ChannelStatusResponse {
  data: ChannelStatusItem[];
  count: number;
}

// 模型状态项
export interface ModelStatusItem {
  model: string;
  provider: string;
  total_requests: number;
  total_errors: number;
  error_rate: number;
  status: ServiceHealthStatus;
  last_request_time: string;
  buckets: StatusBucket[];
}

// 模型状态列表响应
export interface ModelStatusResponse {
  data: ModelStatusItem[];
  count: number;
}

// 状态查询参数
export interface StatusQueryParams {
  from?: string;
  to?: string;
  provider?: string;
  model?: string;
}
