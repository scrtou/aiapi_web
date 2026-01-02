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