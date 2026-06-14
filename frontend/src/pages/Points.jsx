import React, { useState, useEffect } from 'react'
import {
  Card, Grid, Progress, Tabs, Table, Tag,
  Space, Select, Empty, Spin
} from '@arco-design/web-react'
import {
  IconArrowUp, IconArrowDown, IconGift,
  IconTrophy
} from '@arco-design/web-react/icon'
import { getPointAccount, getPointRecords } from '../api/points'
import dayjs from 'dayjs'
import './Points.less'

const { Row, Col } = Grid
const TabPane = Tabs.TabPane
const Option = Select.Option

export default function Points() {
  const [activeTab, setActiveTab] = useState('records')
  const [accountInfo, setAccountInfo] = useState(null)
  const [records, setRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [typeFilter, setTypeFilter] = useState('all')
  const [summary, setSummary] = useState({ earn_total: 0, spend_total: 0, count: 0 })

  useEffect(() => {
    loadAccountInfo()
  }, [])

  useEffect(() => {
    loadRecords()
  }, [activeTab, page, typeFilter])

  const loadAccountInfo = async () => {
    try {
      const res = await getPointAccount()
      setAccountInfo(res.data)
    } catch (e) {
      console.error('获取积分账户失败', e)
    }
  }

  const loadRecords = async () => {
    setRecordsLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (typeFilter !== 'all') {
        params.type = typeFilter
      }
      const res = await getPointRecords(params)
      setRecords(res.data.list || [])
      setRecordsTotal(res.data.total || 0)
      setSummary(res.data.summary || { earn_total: 0, spend_total: 0, count: 0 })
    } catch (e) {
      console.error('获取积分流水失败', e)
    } finally {
      setRecordsLoading(false)
    }
  }

  const getTypeColor = (type) => {
    const colorMap = {
      earn: 'green',
      spend: 'red',
      expire: 'gray',
      adjust: 'orange',
    }
    return colorMap[type] || 'gray'
  }

  const columns = [
    {
      title: '类型',
      dataIndex: 'type_name',
      width: 100,
      render: (text, record) => (
        <Tag color={getTypeColor(record.type)}>{text}</Tag>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source_name',
      width: 120,
    },
    {
      title: '积分变动',
      dataIndex: 'points',
      width: 120,
      render: (value) => (
        <span style={{
          color: value > 0 ? '#00B42A' : '#F53F3F',
          fontWeight: 500,
          fontSize: 16,
        }}>
          {value > 0 ? '+' : ''}{value}
        </span>
      ),
    },
    {
      title: '变动前余额',
      dataIndex: 'balance_before',
      width: 120,
    },
    {
      title: '变动后余额',
      dataIndex: 'balance_after',
      width: 120,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      render: (text) => text || '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 170,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  return (
    <div className="points-page">
      <Row gutter={16}>
        <Col span={8}>
          <Card className="points-summary-card">
            <div className="card-header">
              <IconGift className="card-icon" style={{ color: '#FF7D00' }} />
              <span className="card-title">积分余额</span>
            </div>
            <div className="balance-value">
              {accountInfo?.balance || 0}
              <span className="balance-unit">积分</span>
            </div>
            <div className="balance-desc">
              当前可用积分
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card className="points-summary-card">
            <div className="card-header">
              <IconArrowUp className="card-icon" style={{ color: '#00B42A' }} />
              <span className="card-title">累计获得</span>
            </div>
            <div className="balance-value earn">
              +{accountInfo?.total_earned || 0}
              <span className="balance-unit">积分</span>
            </div>
            <div className="balance-desc">
              历史累计获得积分
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card className="points-summary-card">
            <div className="card-header">
              <IconArrowDown className="card-icon" style={{ color: '#F53F3F' }} />
              <span className="card-title">累计消费</span>
            </div>
            <div className="balance-value spend">
              -{accountInfo?.total_spent || 0}
              <span className="balance-unit">积分</span>
            </div>
            <div className="balance-desc">
              历史累计消费积分
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="level-card">
        <div className="level-header">
          <div className="level-info">
            <IconTrophy className="level-icon" />
            <div>
              <div className="level-name">{accountInfo?.level_name || '环保新手'}</div>
              <div className="level-desc">
                Lv.{accountInfo?.level || 1} · 距离下一等级还需 {
                  Math.max(0, (accountInfo?.next_level_points || 0) - (accountInfo?.total_earned || 0))
                } 积分
              </div>
            </div>
          </div>
          <div className="level-progress-wrapper">
            <Progress
              percent={accountInfo?.level_progress || 0}
              color="#FF7D00"
              style={{ width: 300 }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="records" title="积分流水" />
        </Tabs>

        <div className="records-toolbar">
          <Space size="medium">
            <span className="filter-label">类型筛选:</span>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 160 }}
            >
              <Option value="all">全部</Option>
              <Option value="earn">获得</Option>
              <Option value="spend">消费</Option>
              <Option value="expire">过期</Option>
              <Option value="adjust">调整</Option>
            </Select>
          </Space>
          <div className="records-summary">
            <Tag color="green">收入: +{summary.earn_total}</Tag>
            <Tag color="red">支出: -{summary.spend_total}</Tag>
            <Tag color="blue">共 {summary.count} 条</Tag>
          </div>
        </div>

        <Spin loading={recordsLoading} style={{ display: 'block' }}>
          {records.length > 0 ? (
            <Table
              columns={columns}
              data={records}
              pagination={{
                total: recordsTotal,
                current: page,
                pageSize: pageSize,
                showTotal: true,
                onChange: (pageNum) => setPage(pageNum),
              }}
              rowKey="id"
            />
          ) : (
            <Empty description="暂无积分流水记录" style={{ padding: '60px 0' }} />
          )}
        </Spin>
      </Card>
    </div>
  )
}
