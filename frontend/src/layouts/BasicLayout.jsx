import React, { useState, useMemo } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button } from '@arco-design/web-react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Message } from '@arco-design/web-react'
import { logout as logoutApi } from '../api/user'
import './BasicLayout.less'

const { Sider, Header, Content } = Layout
const MenuItem = Menu.Item

const menuIconMap = {
  dashboard: '📊',
  delivery: '♻️',
  points: '💰',
  exchange: '🎁',
  achievement: '🏆',
  inspection: '🔍',
  profile: '👤',
}

export default function BasicLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_info') || '{}')
    } catch {
      return {}
    }
  }, [])

  const selectedKeys = [location.pathname.replace('/', '') || 'dashboard']

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      await logoutApi({ refresh })
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
    Message.success('已退出登录')
    navigate('/login', { replace: true })
  }

  const userDropdown = (
    <div className="user-dropdown-menu">
      <div className="dropdown-item" onClick={() => navigate('/profile')}>
        <span style={{ fontSize: 16, marginRight: 10 }}>👤</span>
        <span>个人中心</span>
      </div>
      <div className="dropdown-item" onClick={() => navigate('/profile?tab=settings')}>
        <span style={{ fontSize: 16, marginRight: 10 }}>⚙️</span>
        <span>设置</span>
      </div>
      <div className="dropdown-divider" />
      <div className="dropdown-item logout" onClick={handleLogout}>
        <span style={{ fontSize: 16, marginRight: 10 }}>🚪</span>
        <span>退出登录</span>
      </div>
    </div>
  )

  return (
    <Layout className="basic-layout">
      <Sider
        className="layout-sider"
        collapsed={collapsed}
        collapsible
        trigger={null}
        width={220}
        collapsedWidth={64}
      >
        <div className="logo-wrapper">
          <div className="logo-icon">🌿</div>
          {!collapsed && <div className="logo-text">绿踪 GreenTrace</div>}
        </div>
        <Menu
          className="side-menu"
          selectedKeys={selectedKeys}
          onClickMenuItem={(key) => navigate(`/${key}`)}
          style={{ width: '100%' }}
        >
          <MenuItem key="dashboard">
            <span className="menu-icon">{menuIconMap.dashboard}</span>
            <span>数据大盘</span>
          </MenuItem>
          <MenuItem key="delivery">
            <span className="menu-icon">{menuIconMap.delivery}</span>
            <span>投放管理</span>
          </MenuItem>
          <MenuItem key="points">
            <span className="menu-icon">{menuIconMap.points}</span>
            <span>积分中心</span>
          </MenuItem>
          <MenuItem key="exchange">
            <span className="menu-icon">{menuIconMap.exchange}</span>
            <span>兑换商城</span>
          </MenuItem>
          <MenuItem key="achievement">
            <span className="menu-icon">{menuIconMap.achievement}</span>
            <span>绿色成就</span>
          </MenuItem>
          <MenuItem key="inspection">
            <span className="menu-icon">{menuIconMap.inspection}</span>
            <span>巡检上报</span>
          </MenuItem>
          <MenuItem key="profile">
            <span className="menu-icon">{menuIconMap.profile}</span>
            <span>个人中心</span>
          </MenuItem>
        </Menu>
      </Sider>
      <Layout className="layout-main">
        <Header className="layout-header">
          <Button
            type="text"
            icon={<span style={{ fontSize: 18 }}>{collapsed ? '☰' : '✕'}</span>}
            onClick={() => setCollapsed(!collapsed)}
            className="collapse-btn"
          />
          <div className="header-right">
            <Dropdown
              droplist={userDropdown}
              position="br"
              trigger="click"
            >
              <div className="user-info">
                <Avatar size={36} style={{ backgroundColor: '#00B42A' }}>
                  {userInfo.nickname ? userInfo.nickname.charAt(0) : '🌱'}
                </Avatar>
                <span className="username">{userInfo.nickname || '用户'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="layout-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
