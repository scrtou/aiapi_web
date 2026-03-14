import React, { useEffect, useMemo, useState } from 'react';
import { ChannelInfo, Model } from '../types';
import api from '../services/api';
import './ModelList.css';

type ChannelModelState = {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  raw: any;
  models: Model[];
};

const emptyChannelState: ChannelModelState = {
  loading: false,
  loaded: false,
  error: null,
  raw: null,
  models: [],
};

const ModelList: React.FC = () => {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [channelModels, setChannelModels] = useState<Record<string, ChannelModelState>>({});
  const [selectedModel, setSelectedModel] = useState<any>(null);

  const loadChannels = async () => {
    setChannelsLoading(true);
    setError(null);
    try {
      const response = await api.get('/aichat/channel/list');
      const data = Array.isArray(response.data) ? response.data : [];
      setChannels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载渠道列表失败');
    } finally {
      setChannelsLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const parseModels = (responseData: any): Model[] => {
    if (!responseData?.data || !Array.isArray(responseData.data)) return [];
    return responseData.data.map((model: any) => ({
      id: model.id,
      name: model.id,
      provider: model.owned_by || 'unknown',
      description: model.description || '',
    }));
  };

  const loadModelsForChannel = async (channelName: string) => {
    setChannelModels((prev) => ({
      ...prev,
      [channelName]: {
        ...(prev[channelName] || emptyChannelState),
        loading: true,
        error: null,
      },
    }));

    try {
      const response = await api.get(`/${channelName}/v1/models`);
      const models = parseModels(response.data);
      setChannelModels((prev) => ({
        ...prev,
        [channelName]: {
          loading: false,
          loaded: true,
          error: null,
          raw: response.data,
          models,
        },
      }));
    } catch (err) {
      setChannelModels((prev) => ({
        ...prev,
        [channelName]: {
          loading: false,
          loaded: true,
          error: err instanceof Error ? err.message : `加载 ${channelName} 模型失败`,
          raw: null,
          models: [],
        },
      }));
    }
  };

  const toggleChannel = async (channelName: string) => {
    const isExpanded = expandedChannels.has(channelName);
    if (isExpanded) {
      setExpandedChannels((prev) => {
        const next = new Set(prev);
        next.delete(channelName);
        return next;
      });
      return;
    }

    setExpandedChannels((prev) => new Set(prev).add(channelName));
    const state = channelModels[channelName];
    if (!state?.loaded && !state?.loading) {
      await loadModelsForChannel(channelName);
    }
  };

  const handleModelClick = (channelName: string, model: Model) => {
    const rawModel = channelModels[channelName]?.raw?.data?.find((item: any) => item.id === model.id);
    setSelectedModel({
      ...rawModel,
      __channelName: channelName,
      __parsedModel: model,
    });
  };

  const summary = useMemo(() => {
    const loadedStates = Object.values(channelModels).filter((item) => item.loaded && !item.error);
    return {
      channelCount: channels.length,
      loadedChannelCount: loadedStates.length,
      modelCount: loadedStates.reduce((sum, item) => sum + item.models.length, 0),
    };
  }, [channelModels, channels.length]);

  return (
    <div className="model-list">
      <div className="header">
        <h2>渠道模型列表</h2>
        <button className="btn-primary" onClick={loadChannels} disabled={channelsLoading}>
          {channelsLoading ? '刷新中...' : '刷新渠道'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {channelsLoading ? (
        <div className="loading">加载中...</div>
      ) : channels.length === 0 ? (
        <div className="empty-state">暂无可用渠道</div>
      ) : (
        <div className="models-container">
          <div className="models-stats">
            <div className="stat-card">
              <span className="stat-label">渠道数</span>
              <span className="stat-value">{summary.channelCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">已加载渠道</span>
              <span className="stat-value">{summary.loadedChannelCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">已加载模型总数</span>
              <span className="stat-value">{summary.modelCount}</span>
            </div>
          </div>

          <div className="channel-model-sections">
            {channels.map((channel) => {
              const state = channelModels[channel.channelname] || emptyChannelState;
              const expanded = expandedChannels.has(channel.channelname);
              return (
                <div key={channel.id} className="channel-model-card">
                  <button
                    type="button"
                    className={`channel-model-header ${expanded ? 'expanded' : ''}`}
                    onClick={() => toggleChannel(channel.channelname)}
                  >
                    <div className="channel-model-title">
                      <span className="channel-model-name">{channel.channelname}</span>
                      <span className="channel-model-type">{channel.channeltype}</span>
                    </div>
                    <div className="channel-model-meta">
                      {state.loaded && !state.error && (
                        <span className="channel-model-count">{state.models.length} 个模型</span>
                      )}
                      <span className="channel-model-arrow">{expanded ? '▾' : '▸'}</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="channel-model-body">
                      {state.loading ? (
                        <div className="loading">加载模型中...</div>
                      ) : state.error ? (
                        <div className="error-message">{state.error}</div>
                      ) : state.models.length === 0 ? (
                        <div className="empty-state">暂无可用模型</div>
                      ) : (
                        <div className="models-grid">
                          {state.models.map((model) => (
                            <div
                              key={`${channel.channelname}-${model.id}`}
                              className="model-card clickable"
                              onClick={() => handleModelClick(channel.channelname, model)}
                            >
                              <div className="model-header">
                                <h3 className="model-name">{model.name}</h3>
                                <span className="model-provider">{model.provider}</span>
                              </div>

                              {model.description && (
                                <p className="model-description">{model.description}</p>
                              )}

                              <div className="model-footer">
                                <span className="model-id" title={model.id}>
                                  ID: {model.id}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedModel && (
        <div className="modal-overlay" onClick={() => setSelectedModel(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>模型详细信息</h2>
              <button className="modal-close" onClick={() => setSelectedModel(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>基本信息</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">所属渠道:</span>
                    <span className="detail-value">{selectedModel.__channelName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">模型ID:</span>
                    <span className="detail-value">{selectedModel.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">所有者:</span>
                    <span className="detail-value">{selectedModel.owned_by || selectedModel.__parsedModel?.provider || 'N/A'}</span>
                  </div>
                  {selectedModel.created && (
                    <div className="detail-item">
                      <span className="detail-label">创建时间:</span>
                      <span className="detail-value">
                        {new Date(selectedModel.created * 1000).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedModel.object && (
                    <div className="detail-item">
                      <span className="detail-label">对象类型:</span>
                      <span className="detail-value">{selectedModel.object}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedModel.description && (
                <div className="detail-section">
                  <h3>描述</h3>
                  <p>{selectedModel.description}</p>
                </div>
              )}

              <div className="detail-section">
                <h3>完整数据</h3>
                <pre className="json-display">
                  {JSON.stringify(selectedModel, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelList;
