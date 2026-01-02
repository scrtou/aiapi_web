import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { ChannelInfo, ChannelRequest } from '../types';
import './ChannelManager.css';

const ChannelManager: React.FC = () => {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<Set<number>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newChannel, setNewChannel] = useState<ChannelRequest>({
    channelname: '',
    channeltype: 'openai',
    channelurl: '',
    channelkey: '',
    channelstatus: true,
    maxconcurrent: 10,
    timeout: 30,
    priority: 1,
    description: ''
  });

  // 加载渠道列表
  const loadChannels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<ChannelInfo[]>('/aichat/channel/info');
      setChannels(response.data);
    } catch (err) {
      setError('加载渠道列表失败');
      console.error('加载渠道列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  // 处理复选框选择
  const handleCheckboxChange = (id: number) => {
    setSelectedChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedChannels.size === channels.length) {
      setSelectedChannels(new Set());
    } else {
      setSelectedChannels(new Set(channels.map(c => c.id)));
    }
  };

  // 添加渠道
  const handleAddChannel = async () => {
    if (!newChannel.channelname || !newChannel.channeltype) {
      alert('请填写必填字段：渠道名称和类型');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/aichat/channel/add', [newChannel]);
      const result = response.data;
      
      if (result[0].status === 'success') {
        alert(`渠道 "${result[0].channelname}" 添加成功`);
        setShowAddDialog(false);
        setNewChannel({
          channelname: '',
          channeltype: 'openai',
          channelurl: '',
          channelkey: '',
          channelstatus: true,
          maxconcurrent: 10,
          timeout: 30,
          priority: 1,
          description: ''
        });
        await loadChannels();
      } else {
        alert(`添加失败: ${result[0].message}`);
      }
    } catch (err) {
      alert('添加渠道失败');
      console.error('添加渠道失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 删除选中的渠道
  const handleDeleteSelected = async () => {
    if (selectedChannels.size === 0) {
      alert('请先选择要删除的渠道');
      return;
    }

    if (!confirm(`确定要删除 ${selectedChannels.size} 个渠道吗？`)) {
      return;
    }

    try {
      setLoading(true);
      const channelsToDelete = Array.from(selectedChannels).map(id => ({
        id
      }));
      
      const response = await api.post('/aichat/channel/delete', channelsToDelete);
      const results = response.data;
      const successCount = results.filter(r => r.status === 'success').length;
      
      alert(`成功删除 ${successCount} 个渠道`);
      setSelectedChannels(new Set());
      await loadChannels();
    } catch (err) {
      alert('删除渠道失败');
      console.error('删除渠道失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 切换渠道状态
  const handleToggleStatus = async (channelname: string, currentStatus: boolean) => {
    try {
      const response = await api.post('/aichat/channel/updatestatus', { channelname, status: !currentStatus });
      const result = response.data;
      
      if (result.status === 'success') {
        await loadChannels();
      } else {
        alert(`更新状态失败: ${result.message}`);
      }
    } catch (err) {
      alert('更新渠道状态失败');
      console.error('更新渠道状态失败:', err);
    }
  };

  if (loading && channels.length === 0) {
    return <div className="channel-manager">加载中...</div>;
  }

  if (error) {
    return (
      <div className="channel-manager">
        <div className="error-message">{error}</div>
        <button onClick={loadChannels}>重试</button>
      </div>
    );
  }

  return (
    <div className="channel-manager">
      <div className="header">
        <h2>渠道管理</h2>
        <div className="actions">
          <button 
            className="btn-primary" 
            onClick={() => setShowAddDialog(true)}
            disabled={loading}
          >
            添加渠道
          </button>
          <button 
            className="btn-danger" 
            onClick={handleDeleteSelected}
            disabled={loading || selectedChannels.size === 0}
          >
            删除选中 ({selectedChannels.size})
          </button>
          <button 
            className="btn-secondary" 
            onClick={loadChannels}
            disabled={loading}
          >
            刷新
          </button>
        </div>
      </div>

      <div className="channel-table-container">
        <table className="channel-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={channels.length > 0 && selectedChannels.size === channels.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>ID</th>
              <th>渠道名称</th>
              <th>类型</th>
              <th>URL</th>
              <th>状态</th>
              <th>并发数</th>
              <th>超时(秒)</th>
              <th>优先级</th>
              <th>描述</th>
              <th>创建时间</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {channels.length === 0 ? (
              <tr>
                <td colSpan={13} className="empty-message">
                  暂无渠道数据
                </td>
              </tr>
            ) : (
              channels.map((channel) => (
                <tr key={channel.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedChannels.has(channel.id)}
                      onChange={() => handleCheckboxChange(channel.id)}
                    />
                  </td>
                  <td>{channel.id}</td>
                  <td className="channel-name">{channel.channelname}</td>
                  <td>{channel.channeltype}</td>
                  <td className="channel-url">{channel.channelurl || '-'}</td>
                  <td>
                    <button
                      className={`status-badge ${channel.channelstatus ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(channel.channelname, channel.channelstatus)}
                      title="点击切换状态"
                    >
                      {channel.channelstatus ? '✓ 启用' : '✗ 禁用'}
                    </button>
                  </td>
                  <td>{channel.maxconcurrent}</td>
                  <td>{channel.timeout}</td>
                  <td>{channel.priority}</td>
                  <td className="description">{channel.description || '-'}</td>
                  <td>{channel.createtime}</td>
                  <td>{channel.updatetime}</td>
                  <td>
                    <button
                      className="btn-sm btn-danger"
                      onClick={async () => {
                        if (confirm(`确定要删除渠道 "${channel.channelname}" 吗？`)) {
                          await api.post('/aichat/channel/delete', [{ id: channel.id }]);
                          await loadChannels();
                        }
                      }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 添加渠道对话框 */}
      {showAddDialog && (
        <div className="dialog-overlay" onClick={() => setShowAddDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>添加渠道</h3>
              <button className="close-btn" onClick={() => setShowAddDialog(false)}>
                ✕
              </button>
            </div>
            <div className="dialog-content">
              <div className="form-group">
                <label>渠道名称 *</label>
                <input
                  type="text"
                  value={newChannel.channelname}
                  onChange={(e) => setNewChannel({ ...newChannel, channelname: e.target.value })}
                  placeholder="例如: openai-channel-1"
                />
              </div>
              <div className="form-group">
                <label>渠道类型 *</label>
                <select
                  value={newChannel.channeltype}
                  onChange={(e) => setNewChannel({ ...newChannel, channeltype: e.target.value })}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="azure">Azure</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="form-group">
                <label>渠道 URL</label>
                <input
                  type="text"
                  value={newChannel.channelurl}
                  onChange={(e) => setNewChannel({ ...newChannel, channelurl: e.target.value })}
                  placeholder="例如: https://api.openai.com/v1"
                />
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={newChannel.channelkey}
                  onChange={(e) => setNewChannel({ ...newChannel, channelkey: e.target.value })}
                  placeholder="输入 API Key"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>最大并发数</label>
                  <input
                    type="number"
                    value={newChannel.maxconcurrent}
                    onChange={(e) => setNewChannel({ ...newChannel, maxconcurrent: parseInt(e.target.value) || 10 })}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>超时时间(秒)</label>
                  <input
                    type="number"
                    value={newChannel.timeout}
                    onChange={(e) => setNewChannel({ ...newChannel, timeout: parseInt(e.target.value) || 30 })}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>优先级</label>
                  <input
                    type="number"
                    value={newChannel.priority}
                    onChange={(e) => setNewChannel({ ...newChannel, priority: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea
                  value={newChannel.description}
                  onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                  placeholder="输入渠道描述信息"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newChannel.channelstatus}
                    onChange={(e) => setNewChannel({ ...newChannel, channelstatus: e.target.checked })}
                  />
                  启用渠道
                </label>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn-secondary" onClick={() => setShowAddDialog(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleAddChannel} disabled={loading}>
                {loading ? '添加中...' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelManager;