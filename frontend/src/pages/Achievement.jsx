import React, { useState, useEffect } from 'react'
import {
  Card, Grid, Progress, Spin, Empty, Tag, Tabs, Tooltip
} from '@arco-design/web-react'
import {
  IconTrophy, IconFire, IconStar, IconThunderbolt, IconHeart
} from '@arco-design/web-react/icon'
import { getAchievements, getCarbonFootprint } from '../api/points'
import dayjs from 'dayjs'
import './Achievement.less'

const { Row, Col } = Grid
const TabPane = Tabs.TabPane

const RARITY_CONFIG = {
  1: { name: '普通', color: '#86909c', bg: '#f2f3f5', border: '#e5e6eb' },
  2: { name: '精良', color: '#00B42A', bg: '#e8ffea', border: '#00B42A' },
  3: { name: '稀有', color: '#165DFF', bg: '#e8f3ff', border: '#165DFF' },
  4: { name: '史诗', color: '#722ED1', bg: '#f3e8ff', border: '#722ED1' },
  5: { name: '传说', color: '#FF7D00', bg: '#fff7e8', border: '#FF7D00' },
}

const CATEGORY_CONFIG = {
  delivery: { name: '投放达人', icon: IconFire, color: '#00B42A' },
  points: { name: '积分王者', icon: IconStar, color: '#FF7D00' },
  streak: { name: '连续挑战', icon: IconThunderbolt, color: '#165DFF' },
  special: { name: '特殊成就', icon: IconHeart, color: '#722ED1' },
}

const CATEGORY_ICONS = {
  delivery: '♻️',
  points: '⭐',
  streak: '🔥',
  special: '💎',
}

export default function Achievement() {
  const [activeTab, setActiveTab] = useState('badges')
  const [achievements, setAchievements] = useState([])
  const [achievementLoading, setAchievementLoading] = useState(false)
  const [unlockedCount, setUnlockedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const [timeline, setTimeline] = useState([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelinePage, setTimelinePage] = useState(1)
  const [timelineTotal, setTimelineTotal] = useState(0)
  const [footprintSummary, setFootprintSummary] = useState({
    total_weight: 0,
    total_co2: 0,
    total_points: 0,
    total_deliveries: 0,
    trees_equivalent: 0,
  })

  useEffect(() => {
    loadAchievements()
  }, [])

  useEffect(() => {
    if (activeTab === 'footprint') {
      loadTimeline()
    }
  }, [activeTab, timelinePage])

  const loadAchievements = async () => {
    setAchievementLoading(true)
    try {
      const res = await getAchievements()
      setAchievements(res.data.list || [])
      setUnlockedCount(res.data.unlocked_count || 0)
      setTotalCount(res.data.total || 0)
    } catch (e) {
      console.error('获取成就列表失败', e)
    } finally {
      setAchievementLoading(false)
    }
  }

  const loadTimeline = async () => {
    setTimelineLoading(true)
    try {
      const res = await getCarbonFootprint({ page: timelinePage, page_size: 20 })
      setTimeline(res.data.list || [])
      setTimelineTotal(res.data.total || 0)
      setFootprintSummary(res.data.summary || footprintSummary)
    } catch (e) {
      console.error('获取减排足迹失败', e)
    } finally {
      setTimelineLoading(false)
    }
  }

  const groupedAchievements = {}
  achievements.forEach((item) => {
    const cat = item.category || 'special'
    if (!groupedAchievements[cat]) groupedAchievements[cat] = []
    groupedAchievements[cat].push(item)
  })

  const unlockProgress = totalCount > 0 ? Math.round(unlockedCount / totalCount * 100) : 0

  const categoryColors = {
    recyclable: '#00B42A',
    kitchen: '#165DFF',
    hazardous: '#F53F3F',
    other: '#86909c',
  }

  return (
    <div className="achievement-page">
      <Row gutter={16}>
        <Col span={6}>
          <Card className="summary-stat-card" style={{ borderLeft: '4px solid #00B42A' }}>
            <div className="stat-icon" style={{ backgroundColor: '#e8ffea', color: '#00B42A' }}>
              ♻️
            </div>
            <div className="stat-info">
              <div className="stat-value">{footprintSummary.total_weight}<span className="unit">kg</span></div>
              <div className="stat-label">累计分类重量</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="summary-stat-card" style={{ borderLeft: '4px solid #165DFF' }}>
            <div className="stat-icon" style={{ backgroundColor: '#e8f3ff', color: '#165DFF' }}>
              🌍
            </div>
            <div className="stat-info">
              <div className="stat-value">{footprintSummary.total_co2}<span className="unit">kg</span></div>
              <div className="stat-label">CO₂ 减排量</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="summary-stat-card" style={{ borderLeft: '4px solid #FF7D00' }}>
            <div className="stat-icon" style={{ backgroundColor: '#fff7e8', color: '#FF7D00' }}>
              🌳
            </div>
            <div className="stat-info">
              <div className="stat-value">{footprintSummary.trees_equivalent}<span className="unit">棵</span></div>
              <div className="stat-label">相当于种树</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="summary-stat-card" style={{ borderLeft: '4px solid #722ED1' }}>
            <div className="stat-icon" style={{ backgroundColor: '#f3e8ff', color: '#722ED1' }}>
              🏆
            </div>
            <div className="stat-info">
              <div className="stat-value">{unlockedCount}<span className="unit">/{totalCount}</span></div>
              <div className="stat-label">已解锁成就</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="progress-card">
        <div className="progress-header">
          <div className="progress-title">
            <IconTrophy style={{ fontSize: 24, color: '#FF7D00' }} />
            <span>成就解锁进度</span>
          </div>
          <span className="progress-text">{unlockedCount}/{totalCount} 已解锁</span>
        </div>
        <Progress
          percent={unlockProgress}
          color={{
            '0%': '#00B42A',
            '100%': '#722ED1',
          }}
          style={{ marginTop: 12 }}
        />
      </Card>

      <Card>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="badges" title="成就徽章" />
          <TabPane key="footprint" title="减排足迹" />
        </Tabs>

        {activeTab === 'badges' && (
          <Spin loading={achievementLoading} style={{ display: 'block' }}>
            {achievements.length > 0 ? (
              <div className="badge-sections">
                {Object.entries(groupedAchievements).map(([category, items]) => {
                  const catConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.special
                  const CatIcon = catConfig.icon
                  return (
                    <div key={category} className="badge-section">
                      <div className="section-header">
                        <CatIcon style={{ fontSize: 20, color: catConfig.color }} />
                        <span className="section-name">{catConfig.name}</span>
                        <span className="section-count">
                          {items.filter((i) => i.unlocked).length}/{items.length}
                        </span>
                      </div>
                      <div className="badge-grid">
                        {items.map((item) => {
                          const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG[1]
                          return (
                            <Tooltip
                              key={item.id}
                              content={
                                <div className="badge-tooltip">
                                  <div className="tooltip-title">{item.name}</div>
                                  <div className="tooltip-desc">{item.description}</div>
                                  <div className="tooltip-meta">
                                    <span>稀有度: {rarity.name}</span>
                                    {item.points_reward > 0 && <span>奖励: +{item.points_reward}积分</span>}
                                  </div>
                                  {!item.unlocked && (
                                    <div className="tooltip-condition">
                                      条件: {item.condition_type} ≥ {item.condition_value}
                                    </div>
                                  )}
                                </div>
                              }
                            >
                              <div
                                className={`badge-card ${item.unlocked ? 'unlocked' : 'locked'}`}
                                style={{
                                  borderColor: item.unlocked ? rarity.border : '#e5e6eb',
                                  background: item.unlocked ? rarity.bg : '#fafafa',
                                }}
                              >
                                <div className="badge-icon">
                                  {item.unlocked
                                    ? (CATEGORY_ICONS[category] || '🏅')
                                    : '🔒'}
                                </div>
                                <div className="badge-name" style={{ color: item.unlocked ? rarity.color : '#c9cdd4' }}>
                                  {item.name}
                                </div>
                                {item.unlocked && (
                                  <Tag
                                    size="small"
                                    style={{
                                      backgroundColor: rarity.bg,
                                      color: rarity.color,
                                      border: `1px solid ${rarity.border}`,
                                    }}
                                  >
                                    {rarity.name}
                                  </Tag>
                                )}
                              </div>
                            </Tooltip>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty description="暂无成就数据" style={{ padding: '60px 0' }} />
            )}
          </Spin>
        )}

        {activeTab === 'footprint' && (
          <Spin loading={timelineLoading} style={{ display: 'block' }}>
            {timeline.length > 0 ? (
              <div className="timeline-container">
                <div className="timeline">
                  {timeline.map((item, index) => (
                    <div key={item.id} className="timeline-item">
                      <div className="timeline-dot" style={{ backgroundColor: categoryColors[item.category] || '#86909c' }} />
                      {index < timeline.length - 1 && <div className="timeline-line" />}
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-date">{item.date}</span>
                          <span className="timeline-time">{item.time}</span>
                          <Tag
                            size="small"
                            color={categoryColors[item.category] === '#86909c' ? 'gray' : undefined}
                            style={{
                              backgroundColor: categoryColors[item.category]
                                ? `${categoryColors[item.category]}15`
                                : '#f2f3f5',
                              color: categoryColors[item.category] || '#86909c',
                              border: 'none',
                            }}
                          >
                            {item.category_name}
                          </Tag>
                        </div>
                        <div className="timeline-body">
                          <div className="timeline-metrics">
                            <div className="metric">
                              <span className="metric-label">投放重量</span>
                              <span className="metric-value">{item.weight} kg</span>
                            </div>
                            <div className="metric">
                              <span className="metric-label">CO₂ 减排</span>
                              <span className="metric-value green">{item.co2_reduction} kg</span>
                            </div>
                            <div className="metric">
                              <span className="metric-label">获得积分</span>
                              <span className="metric-value orange">+{item.points_earned}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Empty description="暂无减排足迹" style={{ padding: '60px 0' }} />
            )}
          </Spin>
        )}
      </Card>
    </div>
  )
}
