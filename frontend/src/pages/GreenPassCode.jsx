import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, Button, Statistic, Space, Tag, Typography, Message, Empty, Spin } from '@arco-design/web-react'
import { IconRefresh, IconQrcode, IconClockCircle } from '@arco-design/web-react/icon'
import { QRCodeSVG } from 'qrcode.react'
import { generatePassCode, getMyPassCodes } from '../api/points'
import './GreenPassCode.less'

const { Title, Paragraph, Text } = Typography

function formatTime(seconds) {
  if (seconds <= 0) return '已过期'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}分${secs}秒`
}

export default function GreenPassCode() {
  const [currentCode, setCurrentCode] = useState(null)
  const [codeList, setCodeList] = useState([])
  const [loading, setLoading] = useState(false)
  const [expiresIn, setExpiresIn] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_info') || '{}')
    } catch {
      return {}
    }
  }, [])

  const fetchCurrentCode = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await generatePassCode({ valid_minutes: 5 })
      if (res.code === 0) {
        setCurrentCode(res.data)
        setExpiresIn(res.data.expires_in)
      }
    } catch (e) {
      Message.error('生成通行码失败')
    } finally {
      setRefreshing(false)
    }
  }, [])

  const fetchCodeList = useCallback(async () => {
    try {
      const res = await getMyPassCodes()
      if (res.code === 0) {
        setCodeList(res.data.list || [])
      }
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchCurrentCode(), fetchCodeList()]).finally(() => {
      setLoading(false)
    })
  }, [fetchCurrentCode, fetchCodeList])

  useEffect(() => {
    if (!currentCode || expiresIn <= 0) return

    const timer = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentCode, expiresIn])

  const handleRefresh = () => {
    fetchCurrentCode()
    fetchCodeList()
  }

  const statusMap = {
    0: { text: '未使用', color: 'green' },
    1: { text: '已使用', color: 'blue' },
    2: { text: '已过期', color: 'gray' },
    3: { text: '已作废', color: 'red' },
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Spin size={40} />
      </div>
    )
  }

  return (
    <div className="green-pass-code-page">
      <Card
        className="qr-card"
        title={
          <Space>
            <IconQrcode style={{ color: '#00B42A', fontSize: 20 }} />
            <span>绿色通行码</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<IconRefresh />}
            onClick={handleRefresh}
            loading={refreshing}
          >
            刷新
          </Button>
        }
      >
        <div className="qr-wrapper">
          <div className="qr-container">
            {currentCode && currentCode.qr_content ? (
              <>
                <div className="qr-code">
                  <QRCodeSVG
                    value={currentCode.qr_content}
                    size={220}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#1f2329"
                  />
                </div>
                <div className="qr-status">
                  <Tag color={expiresIn > 0 ? 'green' : 'red'}>
                    {expiresIn > 0 ? '有效' : '已过期'}
                  </Tag>
                </div>
                <div className="qr-expire">
                  <IconClockCircle style={{ marginRight: 4 }} />
                  <span>
                    有效期: <Text bold>{formatTime(expiresIn)}</Text>
                  </span>
                </div>
              </>
            ) : (
              <Empty description="暂无通行码" />
            )}
          </div>

          <div className="user-info-section">
            <Title heading={5} style={{ marginBottom: 16 }}>用户信息</Title>
            <Space direction="vertical" size="medium" style={{ width: '100%' }}>
              <div className="info-row">
                <span className="info-label">姓名</span>
                <span className="info-value">{userInfo.nickname || '绿友'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">身份码</span>
                <span className="info-value">{userInfo.identity_code || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">社区</span>
                <span className="info-value">{userInfo.community || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">可用积分</span>
                <span className="info-value points">{userInfo.available_points || 0}</span>
              </div>
            </Space>
          </div>
        </div>

        <div className="tips-section">
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            💡 提示：通行码每5分钟自动更新，请在有效期内使用。扫码投递时请向巡检员出示此码。
          </Paragraph>
        </div>
      </Card>

      <Card
        className="history-card"
        title="历史记录"
        style={{ marginTop: 16 }}
      >
        {codeList.length > 0 ? (
          <div className="code-list">
            {codeList.map((item) => {
              const status = statusMap[item.status] || { text: '未知', color: 'gray' }
              return (
                <div key={item.code_id} className="code-item">
                  <div className="code-item-left">
                    <div className="code-id">{item.code_id.slice(0, 8)}...</div>
                    <div className="code-time">
                      生成时间: {new Date(item.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <Tag color={status.color}>{status.text}</Tag>
                </div>
              )
            })}
          </div>
        ) : (
          <Empty description="暂无历史记录" />
        )}
      </Card>
    </div>
  )
}
