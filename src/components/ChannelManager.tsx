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
  const [isEditing, setIsEditing] = useState(false);
  const [newChannel, setNewChannel] = useState<ChannelRequest>({
    channelname: '',
    channeltype: 'openai',
    channelurl: '',
    channelkey: '',
    channelstatus: true,
    maxconcurrent: 10,
    timeout: 30,
    priority: 1,
    description: '',
    accountcount: 0,
    accountretentiondays: 0,
    supports_tool_calls: false
  });

  const isBuiltInChannel = (channelname: string) =>
    channelname === 'chaynsapi' || channelname === 'nexosapi' || channelname === 'retoolapi';
  const isEditingBuiltInChannel = isEditing && isBuiltInChannel(newChannel.channelname || '');

  // 加载渠道列表
  const loadChannels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<ChannelInfo[]>('/aichat/channel/list');
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
    const channel = channels.find((item) => item.id === id);
    if (channel && isBuiltInChannel(channel.channelname)) {
      return;
    }
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
    const selectableIds = channels
      .filter((channel) => !isBuiltInChannel(channel.channelname))
      .map((channel) => channel.id);

    if (selectableIds.length === 0) {
      setSelectedChannels(new Set());
      return;
    }

    const allSelected = selectableIds.every((id) => selectedChannels.has(id));
    if (allSelected) {
      setSelectedChannels(new Set());
    } else {
      setSelectedChannels(new Set(selectableIds));
    }
  };

  // 添加/更新渠道
  const handleSaveChannel = async () => {
    if (!newChannel.channelname || !newChannel.channeltype) {
      alert('请填写必填字段：渠道名称和类型');
      return;
    }

    try {
      setLoading(true);
      const endpoint = isEditing ? '/aichat/channel/update' : '/aichat/channel/add';
      // 对于更新，我们需要确保 ID 存在
      if (isEditing && !newChannel.id) {
        alert('更新失败：缺少渠道 ID');
        return;
      }

      // 如果是更新，后端期望的是单个对象而不是数组（根据 AiApi.cc 的实现，update 接收单个对象，add 接收数组）
      // 等等，查看 AiApi.cc 的 channelUpdate 实现，它也是接收 jsonPtr，然后 `auto& reqBody = *jsonPtr;`
      // 如果 jsonPtr 是数组，这里可能会有问题。让我们再确认一下 AiApi.cc 的 channelUpdate 实现。
      // AiApi.cc 中 channelUpdate: auto& reqBody = *jsonPtr; Channelinfo_st channelInfo; ...
      // 这意味着它期望的是一个 JSON 对象，而不是数组。
      // 而 channelAdd: for (auto &reqBody : *jsonPtr) ... 意味着它期望数组。
      
      let response;
      if (isEditing) {
         response = await api.post(endpoint, newChannel);
      } else {
         response = await api.post(endpoint, [newChannel]);
      }

      const result = isEditing ? response.data : response.data[0];
      
      if (result.status === 'success') {
        alert(`渠道 "${isEditing ? newChannel.channelname : result.channelname}" ${isEditing ? '更新' : '添加'}成功`);
        setShowAddDialog(false);
        setIsEditing(false);
        setNewChannel({
          channelname: '',
          channeltype: 'openai',
          channelurl: '',
          channelkey: '',
          channelstatus: true,
          maxconcurrent: 10,
          timeout: 30,
          priority: 1,
          description: '',
          accountcount: 0,
          accountretentiondays: 0,
          supports_tool_calls: false
        });
        await loadChannels();
      } else {
        alert(`${isEditing ? '更新' : '添加'}失败: ${result.message}`);
      }
    } catch (err) {
      alert(`${isEditing ? '更新' : '添加'}渠道失败`);
      console.error(`${isEditing ? '更新' : '添加'}渠道失败:`, err);
    } finally {
      setLoading(false);
    }
  };

  // 编辑渠道
    const handleEdit = (channel: ChannelInfo) => {
      setNewChannel({
        id: channel.id,
        channelname: channel.channelname,
        channeltype: channel.channeltype,
        channelurl: channel.channelurl || '',
        channelkey: channel.channelkey || '',
        channelstatus: channel.channelstatus,
        maxconcurrent: channel.maxconcurrent,
        timeout: channel.timeout,
        priority: channel.priority,
        description: channel.description || '',
        accountcount: channel.accountcount || 0,
        accountretentiondays: channel.accountretentiondays || 0,
        supports_tool_calls: channel.supports_tool_calls || false
      });
    setIsEditing(true);
    setShowAddDialog(true);
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
      const successCount = results.filter((r: { status: string }) => r.status === 'success').length;
      
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
            onClick={() => {
              setIsEditing(false);
              setNewChannel({
                channelname: '',
                channeltype: 'openai',
                channelurl: '',
                channelkey: '',
                channelstatus: true,
                maxconcurrent: 10,
                timeout: 30,
                priority: 1,
                description: '',
                accountcount: 0,
                accountretentiondays: 0,
                supports_tool_calls: false
              });
              setShowAddDialog(true);
            }}
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
                  checked={
                    channels.filter((channel) => !isBuiltInChannel(channel.channelname)).length > 0 &&
                    channels
                      .filter((channel) => !isBuiltInChannel(channel.channelname))
                      .every((channel) => selectedChannels.has(channel.id))
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th>ID</th>
              <th>渠道名称</th>
              <th>类型</th>
              <th>URL</th>
              <th>状态</th>
              <th>工具调用</th>
              <th>并发数</th>
              <th>超时(秒)</th>
              <th>优先级</th>
              <th>目标账号数</th>
                  <th>账号保留天数</th>
                  <th>描述</th>
              <th>创建时间</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {channels.length === 0 ? (
              <tr>
                <td colSpan={16} className="empty-message">
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
                      disabled={isBuiltInChannel(channel.channelname)}
                      title={isBuiltInChannel(channel.channelname) ? '内置渠道不可删除' : undefined}
                    />
                  </td>
                  <td>{channel.id}</td>
                  <td className="channel-name">
                    {channel.channelname}
                    {isBuiltInChannel(channel.channelname) && (
                      <span className="builtin-badge">内置</span>
                    )}
                  </td>
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
                  <td>
                    <span className={`tool-call-badge ${channel.supports_tool_calls ? 'supported' : 'not-supported'}`}>
                      {channel.supports_tool_calls ? '✓ 支持' : '✗ 不支持'}
                    </span>
                  </td>
                  <td>{channel.maxconcurrent}</td>
                  <td>{channel.timeout}</td>
                  <td>{channel.priority}</td>
                  <td>{channel.accountcount || 0}</td>
                  <td>{channel.accountretentiondays || 0}</td>
                  <td className="description">{channel.description || '-'}</td>
                  <td>{channel.createtime}</td>
                  <td>{channel.updatetime}</td>
                  <td>
                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => handleEdit(channel)}
                      disabled={loading}
                      style={{ marginRight: '5px' }}
                      title={isBuiltInChannel(channel.channelname) ? '内置渠道仅允许编辑部分字段' : undefined}
                    >
                      编辑
                    </button>
                    <button
                      className="btn-sm btn-danger"
                      disabled={isBuiltInChannel(channel.channelname)}
                      onClick={async () => {
                        if (isBuiltInChannel(channel.channelname)) {
                          return;
                        }
                        if (confirm(`确定要删除渠道 "${channel.channelname}" 吗？`)) {
                          await api.post('/aichat/channel/delete', [{ id: channel.id }]);
                          await loadChannels();
                        }
                      }}
                      title={isBuiltInChannel(channel.channelname) ? '内置渠道不可删除' : undefined}
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
              <h3>{isEditing ? '编辑渠道' : '添加渠道'}</h3>
              <button className="close-btn" onClick={() => setShowAddDialog(false)}>
                ✕
              </button>
            </div>
            <div className="dialog-content">
              {isEditingBuiltInChannel && (
                <div className="info-message" style={{ marginBottom: '1rem' }}>
                  内置渠道仅允许编辑：启用状态、支持工具调用、最大并发数、超时时间、优先级、目标账号数量、账号保留天数、描述。
                </div>
              )}
              <div className="form-group">
                <label>渠道名称 *</label>
                <input
                  type="text"
                  value={newChannel.channelname}
                  onChange={(e) => setNewChannel({ ...newChannel, channelname: e.target.value })}
                  placeholder="例如: openai-channel-1"
                  disabled={isEditingBuiltInChannel}
                  readOnly={isEditingBuiltInChannel}
                  style={isEditingBuiltInChannel ? { backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' } : undefined}
                />
              </div>
              <div className="form-group">
                <label>渠道类型 *</label>
                <select
                  value={newChannel.channeltype}
                  onChange={(e) => setNewChannel({ ...newChannel, channeltype: e.target.value })}
                  disabled={isEditingBuiltInChannel}
                  style={isEditingBuiltInChannel ? { backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' } : undefined}
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
                  disabled={isEditingBuiltInChannel}
                  readOnly={isEditingBuiltInChannel}
                  style={isEditingBuiltInChannel ? { backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' } : undefined}
                />
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={newChannel.channelkey}
                  onChange={(e) => setNewChannel({ ...newChannel, channelkey: e.target.value })}
                  placeholder="输入 API Key"
                  disabled={isEditingBuiltInChannel}
                  readOnly={isEditingBuiltInChannel}
                  style={isEditingBuiltInChannel ? { backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' } : undefined}
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
                <div className="form-group">
                  <label>目标账号数量 (0表示不自动注册)</label>
                  <input
                    type="number"
                    value={newChannel.accountcount}
                    onChange={(e) => setNewChannel({ ...newChannel, accountcount: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>账号保留天数 (0表示不生效)</label>
                  <input
                    type="number"
                    value={newChannel.accountretentiondays}
                    onChange={(e) => setNewChannel({ ...newChannel, accountretentiondays: parseInt(e.target.value) || 0 })}
                    min="0"
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
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newChannel.channelstatus}
                    onChange={(e) => setNewChannel({ ...newChannel, channelstatus: e.target.checked })}
                  />
                  启用渠道
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={newChannel.supports_tool_calls}
                    onChange={(e) => setNewChannel({ ...newChannel, supports_tool_calls: e.target.checked })}
                  />
                  支持工具调用 (Function Calling)
                </label>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn-secondary" onClick={() => setShowAddDialog(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleSaveChannel} disabled={loading}>
                {loading ? (isEditing ? '更新中...' : '添加中...') : (isEditing ? '确认更新' : '确认添加')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelManager;
