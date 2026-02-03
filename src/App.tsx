import { useState } from 'react'
import AccountManager from './components/AccountManager'
import ChannelManager from './components/ChannelManager'
import ModelList from './components/ModelList'
import Settings from './components/Settings'
import ErrorMonitor from './components/ErrorMonitor'
import ServiceStatusMonitor from './components/ServiceStatusMonitor'
import './App.css'

// 图标组件
const Icons = {
  Logo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Channel: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  Model: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Monitor: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Menu: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  ),
}

type TabType = 'accounts' | 'channels' | 'models' | 'monitor' | 'status' | 'settings'

interface NavItem {
  id: TabType
  label: string
  icon: React.FC
}

const navItems: { section: string; items: NavItem[] }[] = [
  {
    section: '管理',
    items: [
      { id: 'accounts', label: '账号管理', icon: Icons.Users },
      { id: 'channels', label: '渠道管理', icon: Icons.Channel },
      { id: 'models', label: '模型列表', icon: Icons.Model },
    ],
  },
  {
    section: '监控',
    items: [
      { id: 'status', label: '服务状态', icon: Icons.Activity },
      { id: 'monitor', label: '错误监控', icon: Icons.Monitor },
    ],
  },
  {
    section: '系统',
    items: [
      { id: 'settings', label: '系统设置', icon: Icons.Settings },
    ],
  },
]

const pageTitles: Record<TabType, string> = {
  accounts: '账号管理',
  channels: '渠道管理',
  models: '模型列表',
  status: '服务状态监控',
  monitor: '错误统计与监控',
  settings: '系统设置',
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('accounts')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleNavClick = (tabId: TabType) => {
    setActiveTab(tabId)
    setMobileMenuOpen(false)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'accounts':
        return <AccountManager />
      case 'channels':
        return <ChannelManager />
      case 'models':
        return <ModelList />
      case 'status':
        return <ServiceStatusMonitor />
      case 'monitor':
        return <ErrorMonitor />
      case 'settings':
        return <Settings />
      default:
        return <AccountManager />
    }
  }

  return (
    <div className="app-layout">
      {/* 移动端遮罩 */}
      <div 
        className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* 侧边栏 */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'open' : ''}`}>
        {/* Logo 区域 */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Icons.Logo />
          </div>
          <span className="sidebar-title">AI API</span>
        </div>

        {/* 导航菜单 */}
        <nav className="sidebar-nav">
          {navItems.map((section) => (
            <div key={section.section} className="nav-section">
              <div className="nav-section-title">{section.section}</div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="nav-item-icon">
                    <item.icon />
                  </span>
                  <span className="nav-item-text">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* 折叠按钮 */}
        <div className="sidebar-footer">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            <Icons.ChevronLeft />
          </button>
        </div>
      </aside>

      {/* 主内容区域 */}
      <div className="main-content">
        {/* 顶部导航栏 */}
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="header-btn mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Icons.Menu />
            </button>
            <h1 className="page-title">{pageTitles[activeTab]}</h1>
          </div>
          <div className="header-actions">
            <button className="header-btn" title="刷新">
              <Icons.Refresh />
            </button>
            <button className="header-btn" title="通知">
              <Icons.Bell />
            </button>
          </div>
        </header>

        {/* 内容区域 */}
        <main className="content-area">
          <div className="animate-fade-in" key={activeTab}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
