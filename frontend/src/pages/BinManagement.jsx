import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, Button, Table, Input, Select, Modal, Form,
  Message, Space, Tag, Popconfirm, InputNumber
} from '@arco-design/web-react'
import { IconPlus, IconEdit, IconDelete, IconSearch, IconRefresh } from '@arco-design/web-react/icon'
import { getBinList, createBin, updateBin, deleteBin } from '../api/points'

const { Option } = Select

const statusOptions = [
  { value: 0, label: '离线', color: 'gray' },
  { value: 1, label: '在线', color: 'green' },
  { value: 2, label: '维护中', color: 'orange' },
  { value: 3, label: '故障', color: 'red' },
]

const categoryOptions = [
  { value: 'recyclable', label: '可回收物' },
  { value: 'kitchen', label: '厨余垃圾' },
  { value: 'hazardous', label: '有害垃圾' },
  { value: 'other', label: '其他垃圾' },
  { value: 'mixed', label: '混合投放' },
]

function getStatusTag(status) {
  const item = statusOptions.find(s => s.value === status)
  if (item) {
    return <Tag color={item.color}>{item.label}</Tag>
  }
  return <Tag color="gray">未知</Tag>
}

function getCategoryLabel(category) {
  const item = categoryOptions.find(c => c.value === category)
  return item ? item.label : category
}

export default function BinManagement() {
  const [dataList, setDataList] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState(undefined)
  const [categoryFilter, setCategoryFilter] = useState(undefined)

  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (keyword) params.keyword = keyword
      if (statusFilter !== undefined) params.status = statusFilter
      if (categoryFilter) params.category = categoryFilter
      const res = await getBinList(params)
      if (res.code === 0) {
        setDataList(res.data.list || [])
        setTotal(res.data.total || 0)
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword, statusFilter, categoryFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = () => {
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setStatusFilter(undefined)
    setCategoryFilter(undefined)
    setPage(1)
  }

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingItem(record)
    form.setFieldsValue({
      bin_code: record.bin_code,
      name: record.name,
      location: record.location,
      community: record.community,
      longitude: record.longitude,
      latitude: record.latitude,
      category: record.category,
      status: record.status,
      capacity: record.capacity,
      used: record.used,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      const res = await deleteBin(id)
      if (res.code === 0) {
        Message.success('删除成功')
        fetchData()
      }
    } catch (e) {
      // ignore
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validate()
      setSubmitting(true)
      if (editingItem) {
        const res = await updateBin(editingItem.id, values)
        if (res.code === 0) {
          Message.success('更新成功')
          setModalVisible(false)
          fetchData()
        }
      } else {
        const res = await createBin(values)
        if (res.code === 0) {
          Message.success('创建成功')
          setModalVisible(false)
          fetchData()
        }
      }
    } catch (e) {
      if (e?.errorFields) return
      Message.error('操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: '设备编号',
      dataIndex: 'bin_code',
      width: 120,
    },
    {
      title: '站点名称',
      dataIndex: 'name',
      width: 150,
    },
    {
      title: '安装地址',
      dataIndex: 'location',
      width: 200,
      ellipsis: true,
    },
    {
      title: '所属社区',
      dataIndex: 'community',
      width: 120,
    },
    {
      title: '垃圾类型',
      dataIndex: 'category',
      width: 100,
      render: (val) => getCategoryLabel(val),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (val) => getStatusTag(val),
    },
    {
      title: '容量上限(L)',
      dataIndex: 'capacity',
      width: 100,
    },
    {
      title: '已使用(L)',
      dataIndex: 'used',
      width: 100,
    },
    {
      title: '使用率',
      dataIndex: 'usage_rate',
      width: 100,
      render: (val) => `${val}%`,
    },
    {
      title: '经纬度',
      width: 160,
      render: (_, record) => {
        if (record.longitude && record.latitude) {
          return `${record.longitude.toFixed(6)}, ${record.latitude.toFixed(6)}`
        }
        return '-'
      },
    },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<IconEdit />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            content="删除后不可恢复，确定要删除吗？"
            onOk={() => handleDelete(record.id)}
          >
            <Button type="text" size="small" status="danger" icon={<IconDelete />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="bin-management-page">
      <Card
        title="投放点"
        extra={
          <Button type="primary" icon={<IconPlus />} onClick={handleAdd}>
            新增投放点
          </Button>
        }
      >
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <Space>
            <Input
              placeholder="搜索名称/地址"
              style={{ width: 200 }}
              value={keyword}
              onChange={setKeyword}
              onPressEnter={handleSearch}
            />
            <Select
              placeholder="状态筛选"
              style={{ width: 120 }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              {statusOptions.map(item => (
                <Option key={item.value} value={item.value}>{item.label}</Option>
              ))}
            </Select>
            <Select
              placeholder="垃圾类型"
              style={{ width: 140 }}
              value={categoryFilter}
              onChange={setCategoryFilter}
              allowClear
            >
              {categoryOptions.map(item => (
                <Option key={item.value} value={item.value}>{item.label}</Option>
              ))}
            </Select>
            <Button type="primary" icon={<IconSearch />} onClick={handleSearch}>
              搜索
            </Button>
            <Button icon={<IconRefresh />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </div>

        <Table
          loading={loading}
          columns={columns}
          data={dataList}
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
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑投放点' : '新增投放点'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="设备编号"
            field="bin_code"
            rules={[{ required: true, message: '请输入设备编号' }]}
          >
            <Input placeholder="请输入设备编号" disabled={!!editingItem} />
          </Form.Item>
          <Form.Item
            label="站点名称"
            field="name"
            rules={[{ required: true, message: '请输入站点名称' }]}
          >
            <Input placeholder="请输入站点名称" />
          </Form.Item>
          <Form.Item
            label="安装地址"
            field="location"
            rules={[{ required: true, message: '请输入安装地址' }]}
          >
            <Input placeholder="请输入安装地址" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="所属社区"
              field="community"
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入所属社区" />
            </Form.Item>
            <Form.Item
              label="垃圾类型"
              field="category"
              rules={[{ required: true, message: '请选择垃圾类型' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="请选择垃圾类型">
                {categoryOptions.map(item => (
                  <Option key={item.value} value={item.value}>{item.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="经度"
              field="longitude"
              style={{ flex: 1 }}
            >
              <InputNumber
                placeholder="请输入经度"
                style={{ width: '100%' }}
                min={-180}
                max={180}
                step={0.000001}
              />
            </Form.Item>
            <Form.Item
              label="纬度"
              field="latitude"
              style={{ flex: 1 }}
            >
              <InputNumber
                placeholder="请输入纬度"
                style={{ width: '100%' }}
                min={-90}
                max={90}
                step={0.000001}
              />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="状态"
              field="status"
              rules={[{ required: true, message: '请选择状态' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="请选择状态">
                {statusOptions.map(item => (
                  <Option key={item.value} value={item.value}>{item.label}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="容量上限(L)"
              field="capacity"
              rules={[{ required: true, message: '请输入容量上限' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                placeholder="请输入容量上限"
                style={{ width: '100%' }}
                min={0}
                step={1}
              />
            </Form.Item>
          </div>
          <Form.Item
            label="已使用(L)"
            field="used"
          >
            <InputNumber
              placeholder="请输入已使用容量"
              style={{ width: '100%' }}
              min={0}
              step={0.1}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
