import React, { useState, useEffect, useCallback } from 'react'
import { Badge, Popover, List, Button, Spin, Empty, Tag } from '@arco-design/web-react'
import { IconNotification } from '@arco-design/web-react/icon'
import {
  getNotifications, getNotificationUnreadCount,
  markNotificationRead, markAllNotificationsRead
} from '../api/points'
import './NotificationBell.less'

const typeColorMap = {
  delivery_approved: '#00B42A',
  delivery_rejected: '#F53F3F',
  exchange_success: '#165DFF',
  exchange_shipped: '#0FC6C2',
  exchange_completed: '#00B42A',
  exchange_cancelled: '#F53F3F',
  inspection_resolved: '#00B42A',
  inspection_rejected: '#F53F3F',
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [popoverVisible, setPopoverVisible] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await getNotificationUnreadCount()
      setUnreadCount(res.data.unread_count)
    } catch (e) {
      console.error('获取未读消息数失败', e)
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const timer = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(timer)
  }, [fetchUnreadCount])

  const fetchNotifications = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await getNotifications({ page: p, page_size: 10 })
      const data = res.data
      if (p === 1) {
        setNotifications(data.list)
      } else {
        setNotifications(prev => [...prev, ...data.list])
      }
      setTotal(data.total)
      setPage(p)
    } catch (e) {
      console.error('获取消息列表失败', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleVisibleChange = (visible) => {
    setPopoverVisible(visible)
    if (visible) {
      fetchNotifications(1)
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error('标记已读失败', e)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error('全部标记已读失败', e)
    }
  }

  const handleLoadMore = () => {
    fetchNotifications(page + 1)
  }

  const formatTime = (timeStr) => {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  const content = (
    <div className="notification-panel">
      <div className="notification-header">
        <span className="notification-title">消息通知</span>
        {unreadCount > 0 && (
          <Button
            type="text"
            size="mini"
            className="mark-all-btn"
            onClick={handleMarkAllRead}
          >
            全部已读
          </Button>
        )}
      </div>
      <div className="notification-list">
        {loading && notifications.length === 0 ? (
          <div className="notification-loading">
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty description="暂无消息" style={{ padding: '40px 0' }} />
        ) : (
          <List
            size="small"
            dataSource={notifications}
            render={(item) => (
              <div
                className={`notification-item ${!item.is_read ? 'unread' : ''}`}
                onClick={() => !item.is_read && handleMarkRead(item.id)}
              >
                <div className="notification-item-header">
                  <Tag
                    color={typeColorMap[item.type] || '#86909c'}
                    size="small"
                    className="notification-type-tag"
                  >
                    {item.type_name}
                  </Tag>
                  <span className="notification-time">{formatTime(item.created_at)}</span>
                </div>
                <div className="notification-item-title">{item.title}</div>
                <div className="notification-item-content">{item.content}</div>
                {!item.is_read && <div className="notification-unread-dot" />}
              </div>
            )}
          />
        )}
      </div>
      {notifications.length > 0 && notifications.length < total && (
        <div className="notification-footer">
          <Button type="text" size="small" onClick={handleLoadMore} loading={loading}>
            加载更多
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Popover
      content={content}
      position="br"
      trigger="click"
      popupVisible={popoverVisible}
      onVisibleChange={handleVisibleChange}
      style={{ width: 380 }}
    >
      <div className="notification-bell">
        <Badge count={unreadCount} dot offset={[-4, 4]}>
          <IconNotification style={{ fontSize: 20, color: '#4e5969', cursor: 'pointer' }} />
        </Badge>
      </div>
    </Popover>
  )
}
