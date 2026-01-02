import { useState } from 'react'
import AccountManager from './components/AccountManager'
import ChannelManager from './components/ChannelManager'
import ModelList from './components/ModelList'
import Settings from './components/Settings'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'channels' | 'models' | 'settings'>('accounts')

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI API 管理面板</h1>
        <nav className="tab-nav">
          <button
            className={activeTab === 'accounts' ? 'active' : ''}
            onClick={() => setActiveTab('accounts')}
          >
            账号数据库管理
          </button>
          <button
            className={activeTab === 'channels' ? 'active' : ''}
            onClick={() => setActiveTab('channels')}
          >
            渠道管理
          </button>
          <button
            className={activeTab === 'models' ? 'active' : ''}
            onClick={() => setActiveTab('models')}
          >
            模型列表
          </button>
          <button
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            设置
          </button>
        </nav>
      </header>
      <main className="app-content">
        {activeTab === 'accounts' && <AccountManager />}
        {activeTab === 'channels' && <ChannelManager />}
        {activeTab === 'models' && <ModelList />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export default App