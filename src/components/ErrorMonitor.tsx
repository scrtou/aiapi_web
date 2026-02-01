import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  ErrorEvent, 
  TimeSeriesPoint, 
  MetricsQueryParams 
} from '../types';
import './ErrorMonitor.css';

// 图标组件
const Icons = {
  AlertTriangle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Server: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  TrendingUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Filter: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  RefreshCw: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

// 时间范围选项
const timeRangeOptions = [
  { value: '1h', label: '最近1小时' },
  { value: '6h', label: '最近6小时' },
  { value: '24h', label: '最近24小时' },
  { value: '7d', label: '最近7天' },
  { value: '30d', label: '最近30天' },
];

// 时间间隔选项
const intervalOptions = [
  { value: '1m', label: '1分钟' },
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '1h', label: '1小时' },
  { value: '6h', label: '6小时' },
  { value: '1d', label: '1天' },
];

// 域选项
const domainOptions = [
  { value: '', label: '全部域' },
  { value: 'SESSION_GATE', label: '会话网关' },
  { value: 'UPSTREAM', label: '上游服务' },
  { value: 'INTERNAL', label: '内部错误' },
  { value: 'TOOL_BRIDGE', label: '工具桥接' },
];

// 严重级别选项
const severityOptions = [
  { value: '', label: '全部级别' },
  { value: 'ERROR', label: '错误' },
  { value: 'WARN', label: '警告' },
];

// 简单的柱状图组件
const SimpleBarChart: React.FC<{
  data: TimeSeriesPoint[];
  height?: number;
  color?: string;
  label?: string;
}> = ({ data, height = 120, color = '#6366f1', label }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty" style={{ height }}>
        <span>暂无数据</span>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="simple-chart">
      {label && <div className="chart-label">{label}</div>}
      <div className="chart-container" style={{ height }}>
        <div className="chart-bars">
          {data.map((point, index) => {
            const barHeight = (point.count / maxCount) * 100;
            return (
              <div 
                key={index} 
                className="chart-bar-wrapper"
                title={`${new Date(point.timestamp).toLocaleString()}: ${point.count}`}
              >
                <div 
                  className="chart-bar"
                  style={{ 
                    height: `${barHeight}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="chart-x-axis">
          {data.length > 0 && (
            <>
              <span>{new Date(data[0].timestamp).toLocaleTimeString()}</span>
              <span>{new Date(data[data.length - 1].timestamp).toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// 统计卡片组件
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.FC;
  trend?: number;
  color?: string;
}> = ({ title, value, icon: Icon, trend, color = 'var(--primary-color)' }) => (
  <div className="stat-card">
    <div className="stat-card-icon" style={{ backgroundColor: `${color}15`, color }}>
      <Icon />
    </div>
    <div className="stat-card-content">
      <div className="stat-card-title">{title}</div>
      <div className="stat-card-value">{value}</div>
      {trend !== undefined && (
        <div className={`stat-card-trend ${trend >= 0 ? 'up' : 'down'}`}>
          <Icons.TrendingUp />
          <span>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}%</span>
        </div>
      )}
    </div>
  </div>
);

// 错误事件详情模态框
const EventDetailModal: React.FC<{
  event: ErrorEvent | null;
  onClose: () => void;
}> = ({ event, onClose }) => {
  if (!event) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>错误事件详情</h3>
          <button className="modal-close" onClick={onClose}>
            <Icons.X />
          </button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item">
              <label>事件ID</label>
              <span>{event.id}</span>
            </div>
            <div className="detail-item">
              <label>请求ID</label>
              <span className="mono">{event.request_id}</span>
            </div>
            <div className="detail-item">
              <label>时间</label>
              <span>{new Date(event.timestamp).toLocaleString()}</span>
            </div>
            <div className="detail-item">
              <label>域</label>
              <span className={`badge badge-domain-${event.domain.toLowerCase()}`}>
                {event.domain}
              </span>
            </div>
            <div className="detail-item">
              <label>严重级别</label>
              <span className={`badge badge-${event.severity.toLowerCase()}`}>
                {event.severity}
              </span>
            </div>
            <div className="detail-item">
              <label>错误码</label>
              <span className="mono">{event.error_code}</span>
            </div>
            {event.model && (
              <div className="detail-item">
                <label>模型</label>
                <span>{event.model}</span>
              </div>
            )}
            {event.channel && (
              <div className="detail-item">
                <label>渠道</label>
                <span>{event.channel}</span>
              </div>
            )}
            {event.provider && (
              <div className="detail-item">
                <label>提供商</label>
                <span>{event.provider}</span>
              </div>
            )}
            {event.http_status && (
              <div className="detail-item">
                <label>HTTP状态</label>
                <span className={`badge ${event.http_status >= 400 ? 'badge-error' : 'badge-success'}`}>
                  {event.http_status}
                </span>
              </div>
            )}
            {event.latency_ms && (
              <div className="detail-item">
                <label>延迟</label>
                <span>{event.latency_ms} ms</span>
              </div>
            )}
          </div>
          <div className="detail-message">
            <label>错误消息</label>
            <pre>{event.message}</pre>
          </div>
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="detail-metadata">
              <label>元数据</label>
              <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ErrorMonitor: React.FC = () => {
  // 状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 时间序列数据
  const [requestsSeries, setRequestsSeries] = useState<TimeSeriesPoint[]>([]);
  const [errorsSeries, setErrorsSeries] = useState<TimeSeriesPoint[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  
  // 错误事件列表
  const [events, setEvents] = useState<ErrorEvent[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // 筛选条件
  const [timeRange, setTimeRange] = useState('24h');
  const [interval, setInterval] = useState<MetricsQueryParams['interval']>('1h');
  const [domain, setDomain] = useState('');
  const [severity, setSeverity] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // 详情模态框
  const [selectedEvent, setSelectedEvent] = useState<ErrorEvent | null>(null);

  // 计算时间范围
  const getTimeRange = useCallback(() => {
    const now = new Date();
    const end_time = now.toISOString();
    let start_time: string;

    switch (timeRange) {
      case '1h':
        start_time = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        break;
      case '6h':
        start_time = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
        break;
      case '24h':
        start_time = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case '7d':
        start_time = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        start_time = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        start_time = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }

    return { start_time, end_time };
  }, [timeRange]);

  // 加载请求统计时间序列
  const loadRequestsSeries = useCallback(async () => {
    try {
      const { start_time, end_time } = getTimeRange();
      const params: MetricsQueryParams = {
        start_time,
        end_time,
        interval,
      };
      
      const response = await api.get('/aichat/metrics/requests/series', { params });
      const data = response.data;
      
      setRequestsSeries(data.series || []);
      setTotalRequests(data.total || 0);
    } catch (err) {
      console.error('加载请求统计失败:', err);
    }
  }, [getTimeRange, interval]);

  // 加载错误统计时间序列
  const loadErrorsSeries = useCallback(async () => {
    try {
      const { start_time, end_time } = getTimeRange();
      const params: MetricsQueryParams = {
        start_time,
        end_time,
        interval,
        ...(domain && { domain }),
        ...(severity && { severity }),
      };
      
      const response = await api.get('/aichat/metrics/errors/series', { params });
      const data = response.data;
      
      setErrorsSeries(data.series || []);
      setTotalErrors(data.total || 0);
    } catch (err) {
      console.error('加载错误统计失败:', err);
    }
  }, [getTimeRange, interval, domain, severity]);

  // 加载错误事件列表
  const loadErrorEvents = useCallback(async (page: number = 1) => {
    try {
      const { start_time, end_time } = getTimeRange();
      const params: MetricsQueryParams = {
        start_time,
        end_time,
        page,
        page_size: 20,
        ...(domain && { domain }),
        ...(severity && { severity }),
      };
      
      const response = await api.get('/aichat/metrics/errors/events', { params });
      const data = response.data;
      
      setEvents(data.events || []);
      setEventsTotal(data.total || 0);
      setHasMore(data.has_more || false);
      setCurrentPage(page);
    } catch (err) {
      console.error('加载错误事件失败:', err);
    }
  }, [getTimeRange, domain, severity]);

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadRequestsSeries(),
        loadErrorsSeries(),
        loadErrorEvents(1),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [loadRequestsSeries, loadErrorsSeries, loadErrorEvents]);

  // 初始加载
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 计算错误率
  const errorRate = totalRequests > 0 
    ? ((totalErrors / totalRequests) * 100).toFixed(2) 
    : '0.00';

  // 查看事件详情
  const handleViewEvent = async (event: ErrorEvent) => {
    try {
      const response = await api.get(`/aichat/metrics/errors/events/${event.id}`);
      setSelectedEvent(response.data);
    } catch {
      // 如果详情接口失败，使用列表中的数据
      setSelectedEvent(event);
    }
  };

  return (
    <div className="error-monitor">
      {/* 工具栏 */}
      <div className="monitor-toolbar">
        <div className="toolbar-left">
          <div className="time-range-select">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
            >
              {timeRangeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Icons.ChevronDown />
          </div>
          <div className="interval-select">
            <select 
              value={interval} 
              onChange={(e) => setInterval(e.target.value as MetricsQueryParams['interval'])}
            >
              {intervalOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Icons.ChevronDown />
          </div>
          <button 
            className={`filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Icons.Filter />
            <span>筛选</span>
          </button>
        </div>
        <div className="toolbar-right">
          <button 
            className="refresh-btn"
            onClick={loadAllData}
            disabled={loading}
          >
            <Icons.RefreshCw />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="filter-panel animate-fade-in">
          <div className="filter-group">
            <label>域</label>
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              {domainOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>严重级别</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              {severityOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button 
            className="btn-primary"
            onClick={() => loadAllData()}
          >
            应用筛选
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="error-banner">
          <Icons.AlertTriangle />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <Icons.X />
          </button>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="stats-grid">
        <StatCard
          title="总请求数"
          value={totalRequests.toLocaleString()}
          icon={Icons.Activity}
          color="var(--primary-color)"
        />
        <StatCard
          title="错误总数"
          value={totalErrors.toLocaleString()}
          icon={Icons.AlertTriangle}
          color="var(--error-color)"
        />
        <StatCard
          title="错误率"
          value={`${errorRate}%`}
          icon={Icons.TrendingUp}
          color={parseFloat(errorRate) > 5 ? 'var(--error-color)' : 'var(--success-color)'}
        />
        <StatCard
          title="事件记录"
          value={eventsTotal.toLocaleString()}
          icon={Icons.Server}
          color="var(--info-color)"
        />
      </div>

      {/* 图表区域 */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>请求趋势</h3>
          </div>
          <div className="chart-card-body">
            {loading ? (
              <div className="chart-loading">
                <div className="loading-spinner" />
              </div>
            ) : (
              <SimpleBarChart 
                data={requestsSeries} 
                color="var(--primary-color)"
                height={160}
              />
            )}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>错误趋势</h3>
          </div>
          <div className="chart-card-body">
            {loading ? (
              <div className="chart-loading">
                <div className="loading-spinner" />
              </div>
            ) : (
              <SimpleBarChart 
                data={errorsSeries} 
                color="var(--error-color)"
                height={160}
              />
            )}
          </div>
        </div>
      </div>

      {/* 错误事件列表 */}
      <div className="events-section">
        <div className="events-header">
          <h3>错误事件列表</h3>
          <span className="events-count">共 {eventsTotal} 条记录</span>
        </div>
        <div className="events-table-wrapper">
          {loading ? (
            <div className="table-loading">
              <div className="loading-spinner" />
              <span>加载中...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <Icons.AlertTriangle />
              <p>暂无错误事件</p>
            </div>
          ) : (
            <table className="events-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>域</th>
                  <th>级别</th>
                  <th>错误码</th>
                  <th>消息</th>
                  <th>模型</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="time-cell">
                      <Icons.Clock />
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                    </td>
                    <td>
                      <span className={`badge badge-domain-${event.domain.toLowerCase()}`}>
                        {event.domain}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${event.severity.toLowerCase()}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="mono">{event.error_code}</td>
                    <td className="message-cell" title={event.message}>
                      {event.message}
                    </td>
                    <td>{event.model || '-'}</td>
                    <td>
                      <button 
                        className="btn-ghost btn-sm"
                        onClick={() => handleViewEvent(event)}
                        title="查看详情"
                      >
                        <Icons.Eye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* 分页 */}
        {events.length > 0 && (
          <div className="pagination">
            <button 
              className="btn-secondary"
              disabled={currentPage <= 1}
              onClick={() => loadErrorEvents(currentPage - 1)}
            >
              上一页
            </button>
            <span className="page-info">第 {currentPage} 页</span>
            <button 
              className="btn-secondary"
              disabled={!hasMore}
              onClick={() => loadErrorEvents(currentPage + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* 事件详情模态框 */}
      <EventDetailModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
      />
    </div>
  );
};

export default ErrorMonitor;
