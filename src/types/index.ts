// 账号信息接口 - 对应后端的 Accountinfo_st
export interface AccountInfo {
  apiname: string;
  username: string;
  password: string;
  authtoken?: string;
  usertobitid?: number;
  personid?: string;
  usecount?: number;
  tokenstatus?: boolean;
  accountstatus?: boolean;
  createtime?: string;
  accounttype?: string;
}

// 账号添加/删除请求
export interface AccountRequest {
  apiname: string;
  username: string;
  password?: string;
  authtoken?: string;
  usertobitid?: number;
  personid?: string;
  usecount?: number;
  tokenstatus?: boolean;
  accountstatus?: boolean;
  accounttype?: string;
}

// 账号操作响应
export interface AccountOperationResponse {
  apiname: string;
  username: string;
  status: 'success' | 'failed';
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

// 时间序列数据点
export interface TimeSeriesPoint {
  timestamp: string;
  count: number;
}

// 请求统计时间序列响应
export interface RequestsSeriesResponse {
  series: TimeSeriesPoint[];
  total: number;
  interval: string;
  start_time: string;
  end_time: string;
}

// 错误统计时间序列响应
export interface ErrorsSeriesResponse {
  series: TimeSeriesPoint[];
  total: number;
  interval: string;
  start_time: string;
  end_time: string;
}

// 错误事件记录
export interface ErrorEvent {
  id: number;
  request_id: string;
  timestamp: string;
  domain: 'SESSION_GATE' | 'UPSTREAM' | 'INTERNAL' | 'TOOL_BRIDGE';
  severity: 'ERROR' | 'WARN';
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
  events: ErrorEvent[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// 错误事件详情响应
export interface ErrorEventDetailResponse extends ErrorEvent {
  stack_trace?: string;
  request_body?: string;
  response_body?: string;
}

// 查询参数
export interface MetricsQueryParams {
  start_time?: string;
  end_time?: string;
  interval?: '1m' | '5m' | '15m' | '1h' | '6h' | '1d';
  domain?: string;
  severity?: string;
  model?: string;
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
