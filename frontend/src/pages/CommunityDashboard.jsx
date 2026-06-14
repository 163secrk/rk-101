import React, { useState, useEffect } from 'react'
import {
  Card, Grid, Statistic, Spin, Empty, Tag, Table
} from '@arco-design/web-react'
import {
  IconSun, IconUserGroup, IconStar, IconTrophy
} from '@arco-design/web-react/icon'
import ReactECharts from 'echarts-for-react'
import { getCommunityDashboard } from '../api/points'
import './CommunityDashboard.less'

const { Row, Col } = Grid

export default function CommunityDashboard() {
  const [loading, setLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState({
    today: { weight: 0, co2_reduction: 0, points: 0, people: 0 },
    total: { weight: 0, co2_reduction: 0 },
    building_ranking: [],
    category_breakdown: {},
  })

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const res = await getCommunityDashboard()
      setDashboardData(res.data || dashboardData)
    } catch (e) {
      console.error('获取社区大屏数据失败', e)
    } finally {
      setLoading(false)
    }
  }

  const gaugeOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: Math.max(dashboardData.today.co2_reduction * 2, 100),
        radius: '90%',
        center: ['50%', '55%'],
        progress: {
          show: true,
          width: 18,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#00B42A' },
                { offset: 0.5, color: '#14C9C9' },
                { offset: 1, color: '#165DFF' },
              ],
            },
          },
        },
        axisLine: {
          lineStyle: { width: 18, color: [[1, '#f2f3f5']] },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 36,
          fontWeight: 700,
          color: '#1d2129',
          offsetCenter: [0, '10%'],
          formatter: '{value}',
        },
        data: [{ value: dashboardData.today.co2_reduction }],
      },
    ],
  }

  const rankingData = dashboardData.building_ranking || []
  const barOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: { left: 80, right: 30, top: 10, bottom: 20 },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f2f3f5' } },
      axisLabel: { color: '#86909c', fontSize: 12 },
    },
    yAxis: {
      type: 'category',
      data: rankingData.slice(0, 10).reverse().map((r) => r.building),
      axisLine: { lineStyle: { color: '#e5e6eb' } },
      axisLabel: { color: '#4e5969', fontSize: 13 },
    },
    series: [
      {
        type: 'bar',
        data: rankingData.slice(0, 10).reverse().map((r, idx) => ({
          value: r.total_points,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#00B42A' },
                { offset: 1, color: '#14C9C9' },
              ],
            },
            borderRadius: [0, 6, 6, 0],
          },
        })),
        barWidth: 20,
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          color: '#4e5969',
          fontSize: 12,
        },
      },
    ],
  }

  const breakdown = dashboardData.category_breakdown || {}
  const pieData = Object.entries(breakdown).map(([key, val]) => ({
    name: val.name,
    value: val.co2,
    weight: val.weight,
  }))

  const categoryColorMap = {
    '可回收物': '#00B42A',
    '厨余垃圾': '#165DFF',
    '有害垃圾': '#F53F3F',
    '其他垃圾': '#86909c',
  }

  const pieOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        return `${params.name}<br/>减排量: ${params.value}kg CO₂<br/>投放量: ${params.data.weight}kg`
      },
    },
    legend: { bottom: 0, itemWidth: 12, itemHeight: 12 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 12,
          color: '#4e5969',
        },
        data: pieData.map((item) => ({
          ...item,
          itemStyle: { color: categoryColorMap[item.name] || '#86909c' },
        })),
      },
    ],
  }

  const rankingColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 70,
      render: (val) => {
        if (val === 1) return <Tag color="gold" style={{ borderRadius: '50%', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</Tag>
        if (val === 2) return <Tag color="silver" style={{ borderRadius: '50%', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</Tag>
        if (val === 3) return <Tag color="copper" style={{ borderRadius: '50%', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</Tag>
        return <span style={{ display: 'inline-block', width: 28, textAlign: 'center', color: '#86909c' }}>{val}</span>
      },
    },
    {
      title: '楼栋',
      dataIndex: 'building',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '总积分',
      dataIndex: 'total_points',
      sorter: (a, b) => a.total_points - b.total_points,
      render: (val) => <span style={{ color: '#FF7D00', fontWeight: 600 }}>{val}</span>,
    },
    {
      title: '参与人数',
      dataIndex: 'user_count',
      render: (val) => val,
    },
    {
      title: '人均积分',
      dataIndex: 'avg_points',
      render: (val) => <span style={{ color: '#00B42A', fontWeight: 500 }}>{val}</span>,
    },
  ]

  return (
    <div className="community-dashboard-page">
      <div className="dashboard-header">
        <div className="header-title">
          <IconSun style={{ fontSize: 28, color: '#00B42A' }} />
          <h2>社区环保大屏</h2>
        </div>
        <div className="header-time">
          实时数据 · {new Date().toLocaleDateString('zh-CN')}
        </div>
      </div>

      <Spin loading={loading} style={{ display: 'block' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card className="dash-stat-card" style={{ borderLeft: '4px solid #00B42A' }}>
              <div className="stat-emoji">🌍</div>
              <Statistic
                title="今日减排量"
                value={dashboardData.today.co2_reduction}
                precision={1}
                suffix="kg CO₂"
                valueStyle={{ color: '#00B42A', fontSize: 26 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="dash-stat-card" style={{ borderLeft: '4px solid #165DFF' }}>
              <div className="stat-emoji">♻️</div>
              <Statistic
                title="今日分类重量"
                value={dashboardData.today.weight}
                precision={1}
                suffix="kg"
                valueStyle={{ color: '#165DFF', fontSize: 26 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="dash-stat-card" style={{ borderLeft: '4px solid #FF7D00' }}>
              <div className="stat-emoji">⭐</div>
              <Statistic
                title="今日产生积分"
                value={dashboardData.today.points}
                suffix="分"
                valueStyle={{ color: '#FF7D00', fontSize: 26 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="dash-stat-card" style={{ borderLeft: '4px solid #722ED1' }}>
              <div className="stat-emoji">👥</div>
              <Statistic
                title="今日参与人数"
                value={dashboardData.today.people}
                suffix="人"
                valueStyle={{ color: '#722ED1', fontSize: 26 }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Card title="今日 CO₂ 减排仪表盘" className="chart-card">
              <ReactECharts option={gaugeOption} style={{ height: 260 }} />
              <div className="gauge-footer">
                <span>累计减排: {dashboardData.total.co2_reduction} kg CO₂</span>
                <span>累计投放: {dashboardData.total.weight} kg</span>
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="楼栋积分排行榜" className="chart-card">
              {rankingData.length > 0 ? (
                <ReactECharts option={barOption} style={{ height: 300 }} />
              ) : (
                <Empty description="暂无排行数据" style={{ padding: '60px 0' }} />
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card title="今日分类减排构成" className="chart-card">
              {pieData.length > 0 ? (
                <ReactECharts option={pieOption} style={{ height: 300 }} />
              ) : (
                <Empty description="暂无分类数据" style={{ padding: '60px 0' }} />
              )}
            </Card>
          </Col>
        </Row>

        <Card title="楼栋积分排行明细" className="ranking-table-card">
          {rankingData.length > 0 ? (
            <Table
              columns={rankingColumns}
              data={rankingData}
              pagination={false}
              rowKey="rank"
              size="medium"
              stripe
            />
          ) : (
            <Empty description="暂无楼栋排行数据" style={{ padding: '60px 0' }} />
          )}
        </Card>
      </Spin>
    </div>
  )
}
