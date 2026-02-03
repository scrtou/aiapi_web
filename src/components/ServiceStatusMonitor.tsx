import React, { useState, useEffect, useCallback } from 'react';
import { getStatusSummary, getStatusChannels, getStatusModels } from '../services/api';
import type {
  StatusSummaryResponse,
  ChannelStatusItem,
  ModelStatusItem,
  ServiceHealthStatus,
  StatusBucket,
} from '../types';
import './ServiceStatusMonitor.css';

// ============ 图标组件 ============
const Icons = {
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  ),
  Server: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
      <line x1="6" y1="6" x2="6.01" y2="6"></line>
      <line x1="6" y1="18" x2="6.01" y2="18"></line>
    </svg>
  ),
  Cpu: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
      <rect x="9" y="9" width="6" height="6"></rect>
      <line x1="9" y1="1" x2="9" y2="4"></line>
      <line x1="15" y1="1" x2="15" y2="4"></line>
      <line x1="9" y1="20" x2="9" y2="23"></line>
      <line x1="15" y1="20" x2="15" y2="23"></line>
      <line x1="20" y1="9" x2="23" y2="9"></line>
      <line x1="20" y1="14" x2="23" y2="14"></line>
      <line x1="1" y1="9" x2="4" y2="9"></line>
      <line x1="1" y1="14" x2="4" y2="14"></line>
    </svg>
  ),
  RefreshCw: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  AlertTriangle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
  XCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  ),
  HelpCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
};

// ============ 辅助函数 ============

// 将后端 UTC 时间字符串转换为 ISO 格式
const backendUtcToIso = (utcStr: string): string => {
  if (!utcStr) return '';
  // 后端格式: "YYYY-MM-DD HH:MM:SS"
  const normalized = utcStr.replace(' ', 'T') + 'Z';
  return normalized;
};

// 将 ISO 时间转换为后端 UTC 格式
const pad2 = (n: number) => n.toString().padStart(2, '0');
const toBackendUtcString = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
};

// 格式化时间显示
const formatTime = (isoStr: string): string => {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString();
  } catch {
    return isoStr;
  }
};

// 格式化错误率为百分比
const formatErrorRate = (rate: number): string => {
  return (rate * 100).toFixed(2) + '%';
};

// 获取状态颜色
const getStatusColor = (status: ServiceHealthStatus): string => {
  switch (status) {
    case 'OK': return 'var(--status-ok, #22c55e)';
    case 'DEGRADED': return 'var(--status-degraded, #f59e0b)';
    case 'DOWN': return 'var(--status-down, #ef4444)';
    default: return 'var(--status-unknown, #6b7280)';
  }
};

// 获取状态图标
const StatusIcon: React.FC<{ status: ServiceHealthStatus }> = ({ status }) => {
  switch (status) {
    case 'OK': return <Icons.CheckCircle />;
    case 'DEGRADED': return <Icons.AlertTriangle />;
    case 'DOWN': return <Icons.XCircle />;
    default: return <Icons.HelpCircle />;
  }
};

// 获取状态文本
const getStatusText = (status: ServiceHealthStatus): string => {
  switch (status) {
    case 'OK': return '正常';
    case 'DEGRADED': return '降级';
    case 'DOWN': return '不可用';
    default: return '未知';
  }
};

// ============ 迷你柱状图组件 ============
const MiniBars: React.FC<{
  buckets: StatusBucket[];
  height?: number;
  width?: number;
}> = ({ buckets, height = 32, width = 120 }) => {
  if (!buckets || buckets.length === 0) {
    return <div className="mini-bars-empty">无数据</div>;
  }

  const maxCount = Math.max(...buckets.map(b => b.request_count), 1);
  const barWidth = Math.max(2, Math.floor((width - buckets.length) / buckets.length));

  return (
    <div className="mini-bars" style={{ height, width }}>
      {buckets.map((bucket, index) => {
        const barHeight = (bucket.request_count / maxCount) * height;
        const errorRatio = bucket.request_count > 0 ? bucket.error_count / bucket.request_count : 0;
        
        // 根据错误率决定颜色
        let barColor = 'var(--bar-ok, #22c55e)';
        if (errorRatio >= 0.1) {
          barColor = 'var(--bar-error, #ef4444)';
        } else if (errorRatio >= 0.01) {
          barColor = 'var(--bar-warn, #f59e0b)';
        }

        return (
          <div
            key={index}
            className="mini-bar"
            style={{
              width: barWidth,
              height: Math.max(2, barHeight),
              backgroundColor: barColor,
            }}
            title={`${bucket.bucket_start}\n请求: ${bucket.request_count}\n错误: ${bucket.error_count}\n错误率: ${formatErrorRate(bucket.error_rate)}`}
          />
        );
      })}
    </div>
  );
};

// ============ 统计卡片组件 ============
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.FC;
  color?: string;
  subtitle?: string;
}> = ({ title, value, icon: Icon, color = 'var(--primary-color)', subtitle }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ color }}>
      <Icon />
    </div>
    <div className="stat-content">
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  </div>
);

// ============ 状态徽章组件 ============
const StatusBadge: React.FC<{ status: ServiceHealthStatus }> = ({ status }) => (
  <span 
    className={`status-badge status-${status.toLowerCase()}`}
    style={{ color: getStatusColor(status) }}
  >
    <StatusIcon status={status} />
    <span>{getStatusText(status)}</span>
  </span>
);

// ============ 渠道状态行组件 ============
const ChannelRow: React.FC<{ channel: ChannelStatusItem }> = ({ channel }) => (
  <tr className="status-row">
    <td className="name-cell">
      <div className="name-with-icon">
        <Icons.Server />
        <span>{channel.channel_name || channel.channel_id}</span>
      </div>
    </td>
    <td className="status-cell">
      <StatusBadge status={channel.status} />
    </td>
    <td className="number-cell">{channel.total_requests.toLocaleString()}</td>
    <td className="number-cell">{channel.total_errors.toLocaleString()}</td>
    <td className="number-cell">{formatErrorRate(channel.error_rate)}</td>
    <td className="chart-cell">
      <MiniBars buckets={channel.buckets} />
    </td>
    <td className="time-cell">{formatTime(backendUtcToIso(channel.last_request_time))}</td>
  </tr>
);

// ============ 模型状态行组件 ============
const ModelRow: React.FC<{ model: ModelStatusItem }> = ({ model }) => (
  <tr className="status-row">
    <td className="name-cell">
      <div className="name-with-icon">
        <Icons.Cpu />
        <span>{model.model}</span>
      </div>
    </td>
    <td className="provider-cell">{model.provider || '-'}</td>
    <td className="status-cell">
      <StatusBadge status={model.status} />
    </td>
    <td className="number-cell">{model.total_requests.toLocaleString()}</td>
    <td className="number-cell">{model.total_errors.toLocaleString()}</td>
    <td className="number-cell">{formatErrorRate(model.error_rate)}</td>
    <td className="chart-cell">
      <MiniBars buckets={model.buckets} />
    </td>
    <td className="time-cell">{formatTime(backendUtcToIso(model.last_request_time))}</td>
  </tr>
);

// ============ 主组件 ============
const ServiceStatusMonitor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'channels' | 'models'>('channels');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [summary, setSummary] = useState<StatusSummaryResponse | null>(null);
  const [channels, setChannels] = useState<ChannelStatusItem[]>([]);
  const [models, setModels] = useState<ModelStatusItem[]>([]);

  // 计算时间范围
  const getTimeRange = useCallback(() => {
    const now = new Date();
    let from: Date;
    
    switch (timeRange) {
      case '1h':
        from = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        from = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    return {
      from: toBackendUtcString(from.toISOString()),
      to: toBackendUtcString(now.toISOString()),
    };
  }, [timeRange]);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { from, to } = getTimeRange();
      const params = { from, to };
      
      // 并行加载所有数据
      const [summaryData, channelsData, modelsData] = await Promise.all([
        getStatusSummary(params),
        getStatusChannels(params),
        getStatusModels(params),
      ]);
      
      setSummary(summaryData);
      setChannels(channelsData.data || []);
      setModels(modelsData.data || []);
    } catch (err) {
      console.error('Failed to load status data:', err);
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [getTimeRange]);

  // 初始加载和定时刷新
  useEffect(() => {
    loadData();
    
    // 每 30 秒自动刷新
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="service-status-monitor">
      {/* 头部 */}
      <div className="monitor-header">
        <h1>
          <Icons.Activity />
          服务状态监控
        </h1>
        <div className="header-controls">
          <div className="time-range-select">
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="1h">最近 1 小时</option>
              <option value="6h">最近 6 小时</option>
              <option value="24h">最近 24 小时</option>
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
            </select>
          </div>
          <button 
            className="refresh-btn" 
            onClick={loadData} 
            disabled={loading}
            title="刷新数据"
          >
            <Icons.RefreshCw />
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-banner">
          <Icons.AlertTriangle />
          <span>{error}</span>
          <button onClick={loadData}>重试</button>
        </div>
      )}

      {/* 概览统计卡片 */}
      <div className="stats-grid">
        <StatCard
          title="总请求数"
          value={summary?.total_requests?.toLocaleString() || '0'}
          icon={Icons.Activity}
          color="var(--primary-color)"
        />
        <StatCard
          title="总错误数"
          value={summary?.total_errors?.toLocaleString() || '0'}
          icon={Icons.AlertTriangle}
          color="var(--status-down)"
        />
        <StatCard
          title="错误率"
          value={formatErrorRate(summary?.error_rate || 0)}
          icon={Icons.Activity}
          color={summary?.error_rate && summary.error_rate > 0.01 ? 'var(--status-down)' : 'var(--status-ok)'}
        />
        <StatCard
          title="整体状态"
          value={getStatusText(summary?.overall_status || 'UNKNOWN')}
          icon={() => <StatusIcon status={summary?.overall_status || 'UNKNOWN'} />}
          color={getStatusColor(summary?.overall_status || 'UNKNOWN')}
        />
      </div>

      {/* 状态概览 */}
      <div className="status-overview">
        <div className="overview-item">
          <span className="overview-label">渠道</span>
          <span className="overview-value">{summary?.channel_count || 0}</span>
          <div className="overview-breakdown">
            <span className="status-ok">{summary?.healthy_channels || 0} 正常</span>
            <span className="status-degraded">{summary?.degraded_channels || 0} 降级</span>
            <span className="status-down">{summary?.down_channels || 0} 不可用</span>
          </div>
        </div>
        <div className="overview-item">
          <span className="overview-label">模型</span>
          <span className="overview-value">{summary?.model_count || 0}</span>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'channels' ? 'active' : ''}`}
          onClick={() => setActiveTab('channels')}
        >
          <Icons.Server />
          渠道状态 ({channels.length})
        </button>
        <button
          className={`tab ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          <Icons.Cpu />
          模型状态 ({models.length})
        </button>
      </div>

      {/* 数据表格 */}
      <div className="status-table-container">
        {loading && !summary ? (
          <div className="loading-placeholder">
            <Icons.RefreshCw />
            <span>加载中...</span>
          </div>
        ) : activeTab === 'channels' ? (
          channels.length === 0 ? (
            <div className="empty-state">
              <Icons.Server />
              <span>暂无渠道数据</span>
            </div>
          ) : (
            <table className="status-table">
              <thead>
                <tr>
                  <th>渠道名称</th>
                  <th>状态</th>
                  <th>请求数</th>
                  <th>错误数</th>
                  <th>错误率</th>
                  <th>趋势</th>
                  <th>最后请求</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel) => (
                  <ChannelRow key={channel.channel_id} channel={channel} />
                ))}
              </tbody>
            </table>
          )
        ) : (
          models.length === 0 ? (
            <div className="empty-state">
              <Icons.Cpu />
              <span>暂无模型数据</span>
            </div>
          ) : (
            <table className="status-table">
              <thead>
                <tr>
                  <th>模型名称</th>
                  <th>渠道</th>
                  <th>状态</th>
                  <th>请求数</th>
                  <th>错误数</th>
                  <th>错误率</th>
                  <th>趋势</th>
                  <th>最后请求</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model, index) => (
                  <ModelRow key={`${model.model}-${model.provider}-${index}`} model={model} />
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
};

export default ServiceStatusMonitor;
