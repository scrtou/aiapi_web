import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import './LogViewer.css';

interface LogFile {
  name: string;
  size: number;
  modified: string;
}

const LogViewer: React.FC = () => {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState('aiapi.log');
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [level, setLevel] = useState('ALL');
  const [lineCount, setLineCount] = useState(200);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [totalLines, setTotalLines] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载日志文件列表
  const loadLogFiles = useCallback(async () => {
    try {
      const response = await api.get('/aichat/logs/list');
      setLogFiles(Array.isArray(response.data) ? response.data : []);
    } catch {
      // 静默处理
    }
  }, []);

  // 加载日志内容
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        file: selectedFile,
        lines: lineCount,
      };
      if (keyword) params.keyword = keyword;
      if (level !== 'ALL') params.level = level;

      const response = await api.get('/aichat/logs/tail', { params });
      const data = response.data;
      setLines(Array.isArray(data.lines) ? data.lines : []);
      setTotalLines(data.total_lines || 0);
      setLastRefresh(data.timestamp || new Date().toLocaleString('zh-CN'));

      // 自动滚动到底部
      if (autoScrollRef.current && logContainerRef.current) {
        setTimeout(() => {
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
          }
        }, 50);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载日志失败');
    } finally {
      setLoading(false);
    }
  }, [selectedFile, lineCount, keyword, level]);

  // 初始加载
  useEffect(() => {
    loadLogFiles();
    loadLogs();
  }, [loadLogFiles, loadLogs]);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadLogs, 5000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, loadLogs]);

  // 获取日志级别
  const getLogLevel = (line: string): string => {
    if (line.includes('ERROR') || line.includes('error')) return 'error';
    if (line.includes('WARN') || line.includes('warn')) return 'warn';
    if (line.includes('INFO') || line.includes('info')) return 'info';
    if (line.includes('DEBUG') || line.includes('debug')) return 'debug';
    return 'default';
  };

  // 处理滚动事件
  const handleScroll = () => {
    if (!logContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const levels = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR'];

  return (
    <div className="log-viewer">
      <div className="log-header">
        <h2>日志查看器</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* 工具栏 */}
      <div className="log-toolbar">
        <div className="toolbar-row">
          <div className="toolbar-group">
            <label>日志文件</label>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
            >
              {logFiles.length > 0 ? (
                logFiles.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({formatSize(f.size)})
                  </option>
                ))
              ) : (
                <option value="aiapi.log">aiapi.log</option>
              )}
            </select>
          </div>

          <div className="toolbar-group">
            <label>行数</label>
            <select
              value={lineCount}
              onChange={(e) => setLineCount(parseInt(e.target.value))}
            >
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={2000}>2000</option>
            </select>
          </div>

          <div className="toolbar-group">
            <label>搜索</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="关键词过滤..."
              onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
            />
          </div>

          <div className="toolbar-group toolbar-actions">
            <button className="btn-primary" onClick={loadLogs} disabled={loading}>
              {loading ? '加载中...' : '刷新'}
            </button>
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              自动刷新
            </label>
          </div>
        </div>

        <div className="toolbar-row">
          <div className="level-filter">
            {levels.map((l) => (
              <button
                key={l}
                className={`level-btn ${l.toLowerCase()} ${level === l ? 'active' : ''}`}
                onClick={() => setLevel(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 日志内容 */}
      <div
        className="log-content"
        ref={logContainerRef}
        onScroll={handleScroll}
      >
        {lines.length === 0 ? (
          <div className="log-empty">暂无日志内容</div>
        ) : (
          lines.map((line, index) => (
            <div key={index} className={`log-line ${getLogLevel(line)}`}>
              <span className="line-number">{index + 1}</span>
              <span className="line-text">{line}</span>
            </div>
          ))
        )}
      </div>

      {/* 状态栏 */}
      <div className="log-statusbar">
        <span>文件: {selectedFile}</span>
        <span>显示: {lines.length} / {totalLines} 行</span>
        <span>最后刷新: {lastRefresh}</span>
        {autoRefresh && <span className="auto-refresh-indicator">● 自动刷新中</span>}
      </div>
    </div>
  );
};

export default LogViewer;
