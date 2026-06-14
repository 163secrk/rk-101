import React, { useState, useEffect } from 'react'
import { Card, Grid, Statistic, Avatar, Tag, Button } from '@arco-design/web-react'
import {
  IconDelete,
  IconScan,
  IconGift,
  IconTrophy,
} from '@arco-design/web-react/icon'
import ReactECharts from 'echarts-for-react'
import './Dashboard.less'

const Row = Grid.Row
const Col = Grid.Col

export default function Dashboard() {
  const [userInfo, setUserInfo] = useState({})

  useEffect(() => {
    try {
      setUserInfo(JSON.parse(localStorage.getItem('user_info') || '{}'))
    } catch {}
  }, [])

  const trendOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLine: { lineStyle: { color: '#e5e6eb' } },
      axisLabel: { color: '#86909c' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f2f3f5' } },
      axisLabel: { color: '#86909c' },
    },
    series: [
      {
        name: '投放次数',
        type: 'bar',
        data: [5, 8, 12, 7, 15, 20, 18],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#23c343' },
              { offset: 1, color: '#00B42A' },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
        barWidth: 32,
      },
      {
        name: '获得积分',
        type: 'line',
        smooth: true,
        data: [50, 120, 180, 95, 220, 300, 260],
        symbolSize: 8,
        itemStyle: { color: '#FF7D00' },
        lineStyle: { width: 3, color: '#FF7D00' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 125, 0, 0.25)' },
              { offset: 1, color: 'rgba(255, 125, 0, 0.02)' },
            ],
          },
        },
      },
    ],
    legend: { data: ['投放次数', '获得积分'], top: 0, right: 0 },
  }

  const categoryOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, itemWidth: 12, itemHeight: 12 },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: [
          { value: 1048, name: '可回收物', itemStyle: { color: '#00B42A' } },
          { value: 735, name: '厨余垃圾', itemStyle: { color: '#165DFF' } },
          { value: 580, name: '其他垃圾', itemStyle: { color: '#86909c' } },
          { value: 484, name: '有害垃圾', itemStyle: { color: '#F53F3F' } },
        ],
      },
    ],
  }

  const quickActions = [
    { key: 'delivery', name: '投放登记', icon: IconDelete, color: '#00B42A', bg: '#e8f5e9' },
    { key: 'scan', name: '扫码投放', icon: IconScan, color: '#165DFF', bg: '#e8f3ff' },
    { key: 'exchange', name: '积分兑换', icon: IconGift, color: '#FF7D00', bg: '#fff7e8' },
    { key: 'achievement', name: '成就中心', icon: IconTrophy, color: '#722ED1', bg: '#f3e8ff' },
  ]

  return (
    <div className="dashboard-page">
      <div className="welcome-bar">
        <div className="user-welcome">
          <Avatar size={56} style={{ backgroundColor: '#00B42A', fontSize: 24 }}>
            {userInfo.nickname ? userInfo.nickname.charAt(0) : '🌱'}
          </Avatar>
          <div className="welcome-text">
            <h2>
              你好，{userInfo.nickname || '绿友'} 👋
            </h2>
            <p>今天又是充满绿意的一天，一起为地球加油吧！</p>
          </div>
        </div>
        <div className="points-badge">
          <Tag color="green" bordered>LV.{1}</Tag>
          <span className="points-value">{userInfo.available_points || 0}</span>
          <span className="points-label">可用积分</span>
        </div>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #00B42A' }}>
            <Statistic
              title="累计投放次数"
              value={128}
              suffix="次"
              style={{ marginBottom: 8 }}
            />
            <div className="stat-trend up">
              📈 本周 +15%
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #165DFF' }}>
            <Statistic
              title="累计分类重量"
              value={56.8}
              precision={1}
              suffix="kg"
              style={{ marginBottom: 8 }}
            />
            <div className="stat-trend up">
              🍃 减少填埋 45kg
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #FF7D00' }}>
            <Statistic
              title="累计获得积分"
              value={userInfo.total_points || 0}
              suffix="分"
              style={{ marginBottom: 8 }}
            />
            <div className="stat-trend">
              🎁 连续登录 7 天
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #722ED1' }}>
            <Statistic
              title="CO₂ 减排量"
              value={34.2}
              precision={1}
              suffix="kg"
              style={{ marginBottom: 8 }}
            />
            <div className="stat-trend up">
              🌳 相当于种树 2 棵
            </div>
          </Card>
        </Col>
      </Row>

      <div className="section-title">快捷操作</div>
      <div className="quick-actions">
        {quickActions.map((item) => {
          const IconComponent = item.icon
          return (
            <div key={item.key} className="action-card">
              <div
                className="action-icon"
                style={{ backgroundColor: item.bg, color: item.color }}
              >
                <IconComponent style={{ fontSize: 24 }} />
              </div>
              <div className="action-name">{item.name}</div>
            </div>
          )
        })}
      </div>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="近一周投放趋势" className="chart-card">
            <ReactECharts option={trendOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="分类构成占比" className="chart-card">
            <ReactECharts option={categoryOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
