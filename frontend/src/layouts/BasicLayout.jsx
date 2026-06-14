import React, { useState, useMemo } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button } from '@arco-design/web-react'
import {
  IconHome,
  IconDelete,
  IconScan,
  IconSearch,
  IconStar,
  IconGift,
  IconTrophy,
  IconFile,
  IconUser,
  IconSettings,
  IconPoweroff,
  IconMenuFold,
  IconMenuUnfold,
  IconQrcode,
  IconStorage,
} from '@arco-design/web-react/icon'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Message } from '@arco-design/web-react'
import { logout as logoutApi } from '../api/user'
import './BasicLayout.less'

const { Sider, Header, Content } = Layout
const MenuItem = Menu.Item

const menuIconMap = {
  dashboard: IconHome,
  delivery: IconDelete,
  passcode: IconQrcode,
  verify: IconSearch,
  points: IconStar,
  bins: IconStorage,
  exchange: IconGift,
  achievement: IconTrophy,
  inspection: IconFile,
  profile: IconUser,
}

const roleMenus = {
  resident: [
    { key: 'dashboard', name: '数据大盘' },
    { key: 'passcode', name: '绿色通行码' },
    { key: 'delivery', name: '投放管理' },
    { key: 'points', name: '积分中心' },
    { key: 'exchange', name: '兑换商城' },
    { key: 'achievement', name: '绿色成就' },
    { key: 'profile', name: '个人中心' },
  ],
  inspector: [
    { key: 'dashboard', name: '数据大盘' },
    { key: 'verify', name: '通行码验证' },
    { key: 'delivery', name: '投放管理' },
    { key: 'inspection', name: '巡检上报' },
    { key: 'profile', name: '个人中心' },
  ],
  collector: [
    { key: 'dashboard', name: '数据大盘' },
    { key: 'verify', name: '通行码验证' },
    { key: 'delivery', name: '投放管理' },
    { key: 'profile', name: '个人中心' },
  ],
  admin: [
    { key: 'dashboard', name: '数据大盘' },
    { key: 'passcode', name: '绿色通行码' },
    { key: 'verify', name: '通行码验证' },
    { key: 'bins', name: '投放点' },
    { key: 'delivery', name: '投放管理' },
    { key: 'points', name: '积分中心' },
    { key: 'exchange', name: '兑换商城' },
    { key: 'achievement', name: '绿色成就' },
    { key: 'inspection', name: '巡检上报' },
    { key: 'profile', name: '个人中心' },
  ],
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
        <IconUser style={{ fontSize: 16, marginRight: 10 }} />
        <span>个人中心</span>
      </div>
      <div className="dropdown-item" onClick={() => navigate('/profile?tab=settings')}>
        <IconSettings style={{ fontSize: 16, marginRight: 10 }} />
        <span>设置</span>
      </div>
      <div className="dropdown-divider" />
      <div className="dropdown-item logout" onClick={handleLogout}>
        <IconPoweroff style={{ fontSize: 16, marginRight: 10 }} />
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
          {(roleMenus[userInfo.role] || roleMenus.resident).map((item) => {
            const IconComponent = menuIconMap[item.key]
            return (
              <MenuItem key={item.key}>
                <IconComponent className="menu-icon" />
                <span>{item.name}</span>
              </MenuItem>
            )
          })}
        </Menu>
      </Sider>
      <Layout className="layout-main">
        <Header className="layout-header">
          <Button
            type="text"
            icon={collapsed ? <IconMenuUnfold style={{ fontSize: 18 }} /> : <IconMenuFold style={{ fontSize: 18 }} />}
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
                <div className="user-info-text">
                  <span className="username">{userInfo.nickname || '用户'}</span>
                  <span className="user-role">
                    {userInfo.role === 'admin' ? '管理员' : userInfo.role === 'collector' ? '收集员' : userInfo.role === 'inspector' ? '巡检员' : '居民'}
                  </span>
                </div>
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
