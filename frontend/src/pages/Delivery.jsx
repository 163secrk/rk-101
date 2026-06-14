import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card, Button, Table, Modal, Form, Select, InputNumber,
  Message, Space, Tag, Statistic, Empty
} from '@arco-design/web-react'
import { IconPlus, IconStar } from '@arco-design/web-react/icon'
import { getBinList, getDeliveryList, createDelivery } from '../api/points'

const { Option } = Select

const statusMap = {
  0: { text: '待审核', color: 'orange' },
  1: { text: '已完成', color: 'green' },
  2: { text: '异常', color: 'red' },
  3: { text: '已驳回', color: 'gray' },
}

const categoryOptions = [
  { value: 'recyclable', label: '可回收物', points: 100 },
  { value: 'kitchen', label: '厨余垃圾', points: 50 },
  { value: 'hazardous', label: '有害垃圾', points: 80 },
  { value: 'other', label: '其他垃圾', points: 20 },
]

function getCategoryLabel(category) {
  const item = categoryOptions.find(c => c.value === category)
  return item ? item.label : category
}

function getStatusTag(status) {
  const item = statusMap[status]
  if (item) {
    return <Tag color={item.color}>{item.text}</Tag>
  }
  return <Tag color="gray">未知</Tag>
}

export default function Delivery() {
  const [deliveryList, setDeliveryList] = useState([])
  const [binList, setBinList] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [weight, setWeight] = useState(null)

  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_info') || '{}')
    } catch {
      return {}
    }
  }, [])

  const isAdmin = userInfo.role === 'admin'

  const fetchDeliveryList = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      const res = await getDeliveryList(params)
      if (res.code === 0) {
        setDeliveryList(res.data.list || [])
        setTotal(res.data.total || 0)
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  const fetchBinList = useCallback(async () => {
    try {
      const res = await getBinList({ page_size: 100 })
      if (res.code === 0) {
        setBinList(res.data.list || [])
      }
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchDeliveryList()
    fetchBinList()
  }, [fetchDeliveryList, fetchBinList])

  const handleAddDelivery = () => {
    form.resetFields()
    setSelectedCategory(null)
    setWeight(null)
    setModalVisible(true)
  }

  const calculatePoints = () => {
    if (!selectedCategory || !weight) return 0
    const cat = categoryOptions.find(c => c.value === selectedCategory)
    if (!cat) return 0
    return Math.floor(weight * cat.points)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validate()
      setSubmitting(true)
      const res = await createDelivery({
        bin_id: values.bin_id,
        category: values.category,
        weight: values.weight,
      })
      if (res.code === 0) {
        Message.success(`投放登记成功，获得 ${res.data.points_earned} 积分`)
        setModalVisible(false)
        fetchDeliveryList()
        const updatedInfo = { ...userInfo, available_points: (userInfo.available_points || 0) + res.data.points_earned }
        localStorage.setItem('user_info', JSON.stringify(updatedInfo))
      }
    } catch (e) {
      if (e?.errorFields) return
      Message.error('登记失败')
    } finally {
      setSubmitting(false)
    }
  }

  const stats = useMemo(() => {
    let totalWeight = 0
    let totalPoints = 0
    let completedCount = 0
    deliveryList.forEach(item => {
      if (item.status === 1) {
        totalWeight += item.weight
        totalPoints += item.points_earned
        completedCount++
      }
    })
    return {
      totalCount: total,
      completedCount,
      totalWeight: totalWeight.toFixed(2),
      totalPoints,
    }
  }, [deliveryList, total])

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '投放点',
      dataIndex: 'bin_info',
      width: 180,
      render: (val) => val ? val.name : '-',
    },
    {
      title: '垃圾类别',
      dataIndex: 'category_name',
      width: 100,
      render: (val, record) => val || getCategoryLabel(record.category),
    },
    {
      title: '重量(kg)',
      dataIndex: 'weight',
      width: 100,
      render: (val) => val?.toFixed?.(2) || val,
    },
    {
      title: '获得积分',
      dataIndex: 'points_earned',
      width: 100,
      render: (val) => (
        <span style={{ color: '#FF7D00', fontWeight: 500 }}>
          +{val}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (val, record) => record.status_name ? <Tag>{record.status_name}</Tag> : getStatusTag(val),
    },
    {
      title: '投放时间',
      dataIndex: 'created_at',
      width: 180,
      render: (val) => val ? new Date(val).toLocaleString('zh-CN') : '-',
    },
  ]

  if (isAdmin) {
    columns.splice(1, 0, {
      title: '用户',
      dataIndex: 'user',
      width: 100,
      render: (_, record) => record.user?.nickname || record.user_id || '-',
    })
  }

  return (
    <div className="delivery-page">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <Statistic
              title="总投放次数"
              value={stats.totalCount}
              style={{ borderRight: '1px solid var(--color-border-2)', paddingRight: 24 }}
            />
            <Statistic
              title="已完成"
              value={stats.completedCount}
              style={{ borderRight: '1px solid var(--color-border-2)', paddingRight: 24 }}
            />
            <Statistic
              title="总重量(kg)"
              value={stats.totalWeight}
              style={{ borderRight: '1px solid var(--color-border-2)', paddingRight: 24 }}
            />
            <Statistic
              title={<span><IconStar style={{ color: '#FF7D00' }} /> 累计积分</span>}
              value={stats.totalPoints}
              style={{ color: '#FF7D00' }}
            />
          </div>
          {!isAdmin && (
            <Button type="primary" icon={<IconPlus />} onClick={handleAddDelivery}>
              登记投放
            </Button>
          )}
        </div>

        <Table
          loading={loading}
          columns={columns}
          data={deliveryList}
          rowKey="id"
          pagination={{
            total,
            current: page,
            pageSize,
            pageSizeChangeResetCurrent: true,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
          empty={<Empty description="暂无投放记录" />}
        />
      </Card>

      <Modal
        title="登记投放"
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        width={500}
        okText="确认提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="投放站点"
            field="bin_id"
            rules={[{ required: true, message: '请选择投放站点' }]}
          >
            <Select placeholder="请选择投放站点">
              {binList.map(bin => (
                <Option key={bin.id} value={bin.id}>
                  {bin.name} - {bin.location}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="垃圾类别"
            field="category"
            rules={[{ required: true, message: '请选择垃圾类别' }]}
          >
            <Select
              placeholder="请选择垃圾类别"
              onChange={(val) => setSelectedCategory(val)}
            >
              {categoryOptions.map(cat => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}（{cat.points}积分/kg）
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="投放重量(kg)"
            field="weight"
            rules={[
              { required: true, message: '请输入投放重量' },
              { type: 'number', min: 0.1, message: '重量不能小于0.1kg' }
            ]}
          >
            <InputNumber
              placeholder="请输入投放重量"
              style={{ width: '100%' }}
              min={0.1}
              step={0.1}
              precision={2}
              onChange={setWeight}
            />
          </Form.Item>
          {selectedCategory && weight > 0 && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: 4,
              marginBottom: 16,
            }}>
              <span style={{ color: 'var(--color-text-2)' }}>预计获得积分：</span>
              <span style={{ color: '#FF7D00', fontSize: 18, fontWeight: 600, marginLeft: 8 }}>
                +{calculatePoints()}
              </span>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  )
}
