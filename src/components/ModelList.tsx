import React, { useState, useEffect } from 'react';
import { Model } from '../types';
import api from '../services/api';
import './ModelList.css';

const ModelList: React.FC = () => {
  const [models, setModels] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);

  // 加载模型列表
  const loadModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/chaynsapi/v1/models');
      setModels(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载模型列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadModels();
  }, []);

  // 点击模型卡片处理
  const handleModelClick = (model: any) => {
    // 找到原始数据
    const originalModel = models?.data?.find((m: any) => m.id === model.id);
    setSelectedModel(originalModel || model);
  };

  // 关闭模态框
  const handleCloseModal = () => {
    setSelectedModel(null);
  };

  // 解析模型数据
  const parseModels = (): Model[] => {
    if (!models || !models.data) return [];
    return models.data.map((model: any) => ({
      id: model.id,
      name: model.id,
      provider: model.owned_by || 'unknown',
      description: model.description || '',
    }));
  };

  const modelList = parseModels();

  return (
    <div className="model-list">
      <div className="header">
        <h2>可用模型列表</h2>
        <button 
          className="btn-primary" 
          onClick={loadModels}
          disabled={loading}
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : modelList.length === 0 ? (
        <div className="empty-state">暂无可用模型</div>
      ) : (
        <div className="models-container">
          <div className="models-stats">
            <div className="stat-card">
              <span className="stat-label">总模型数</span>
              <span className="stat-value">{modelList.length}</span>
            </div>
            {models?.object && (
              <div className="stat-card">
                <span className="stat-label">对象类型</span>
                <span className="stat-value">{models.object}</span>
              </div>
            )}
          </div>

          <div className="models-grid">
            {modelList.map((model) => (
              <div
                key={model.id}
                className="model-card clickable"
                onClick={() => handleModelClick(model)}
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
        </div>
      )}

      {/* 模型详情模态框 */}
      {selectedModel && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>模型详细信息</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>基本信息</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">模型ID:</span>
                    <span className="detail-value">{selectedModel.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">所有者:</span>
                    <span className="detail-value">{selectedModel.owned_by || 'N/A'}</span>
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

              {/* 显示所有原始字段 */}
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