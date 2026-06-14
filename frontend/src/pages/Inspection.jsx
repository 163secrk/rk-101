import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card, Button, Table, Modal, Form, Select, Input, Upload,
  Message, Space, Tag, Statistic, Empty, Image, InputNumber,
  Descriptions, Divider
} from '@arco-design/web-react'
import {
  IconPlus, IconFile, IconImage, IconEye, IconCheck,
  IconClose, IconClockCircle, IconStar
} from '@arco-design/web-react/icon'
import {
  getBinList, getDeliveryList, getInspectionList,
  createInspection, handleInspection
} from '../api/points'
import './Placeholder.less'

const { Option } = Select
const { TextArea } = Input

const statusMap = {
  0: { text: '待处理', color: 'orange' },
  1: { text: '处理中', color: 'blue' },
  2: { text: '已处理', color: 'green' },
  3: { text: '已驳回', color: 'red' },
}

const typeMap = {
  wrong_category: '分类错误',
  bin_full: '投放点满溢',
  bin_damage: '设备损坏',
  hygiene: '卫生问题',
  other: '其他',
}

const typeOptions = [
  { value: 'wrong_category', label: '分类错误' },
  { value: 'bin_full', label: '投放点满溢' },
  { value: 'bin_damage', label: '设备损坏' },
  { value: 'hygiene', label: '卫生问题' },
  { value: 'other', label: '其他' },
]

const binCategoryMap = {
  recyclable: '可回收物',
  kitchen: '厨余垃圾',
  hazardous: '有害垃圾',
  other: '其他垃圾',
  mixed: '混合投放',
}

const deliveryCategoryMap = {
  recyclable: '可回收物',
  kitchen: '厨余垃圾',
  hazardous: '有害垃圾',
  other: '其他垃圾',
}

function getStatusTag(status) {
  const item = statusMap[status]
  if (item) {
    return <Tag color={item.color}>{item.text}</Tag>
  }
  return <Tag color="gray">未知</Tag>
}

function getTypeLabel(type) {
  return typeMap[type] || type
}

export default function Inspection() {
  const [reportList, setReportList] = useState([])
  const [binList, setBinList] = useState([])
  const [deliveryList, setDeliveryList] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [stats, setStats] = useState({ pending_count: 0, processing_count: 0, resolved_count: 0 })

  const [createVisible, setCreateVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [handleVisible, setHandleVisible] = useState(false)
  const [currentReport, setCurrentReport] = useState(null)

  const [createForm] = Form.useForm()
  const [handleForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [handling, setHandling] = useState(false)
  const [uploadedImages, setUploadedImages] = useState([])
  const [statusFilter, setStatusFilter] = useState(null)

  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_info') || '{}')
    } catch {
      return {}
    }
  }, [])

  const isAdmin = userInfo.role === 'admin'
  const isInspector = userInfo.role === 'inspector' || isAdmin
  const canCreate = isInspector

  const fetchReportList = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (statusFilter !== null && statusFilter !== undefined) {
        params.status = statusFilter
      }
      const res = await getInspectionList(params)
      if (res.code === 0) {
        setReportList(res.data.list || [])
        setTotal(res.data.total || 0)
        setStats(res.data.stats || { pending_count: 0, processing_count: 0, resolved_count: 0 })
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter])

  const fetchBinList = useCallback(async () => {
    try {
      const res = await getBinList({ page_size: 200 })
      if (res.code === 0) {
        setBinList(res.data.list || [])
      }
    } catch (e) {
      // ignore
    }
  }, [])

  const fetchDeliveryList = useCallback(async () => {
    try {
      const res = await getDeliveryList({ page_size: 200 })
      if (res.code === 0) {
        setDeliveryList(res.data.list || [])
      }
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchReportList()
    fetchBinList()
    fetchDeliveryList()
  }, [fetchReportList, fetchBinList, fetchDeliveryList])

  const handleCreate = () => {
    createForm.resetFields()
    setUploadedImages([])
    setCreateVisible(true)
  }

  const handleViewDetail = (record) => {
    setCurrentReport(record)
    setDetailVisible(true)
  }

  const handleOpenHandle = (record) => {
    handleForm.resetFields()
    handleForm.setFieldsValue({ action: 'resolve', remark: '', points_reward: 0 })
    setCurrentReport(record)
    setHandleVisible(true)
  }

  const handleSubmitCreate = async () => {
    try {
      const values = await createForm.validate()
      setSubmitting(true)
      const res = await createInspection({
        bin_id: values.bin_id || null,
        delivery_id: values.delivery_id || null,
        type: values.type,
        description: values.description,
        images: uploadedImages,
        location: values.location || '',
      })
      if (res.code === 0) {
        Message.success('上报成功，等待管理员处理')
        setCreateVisible(false)
        fetchReportList()
      }
    } catch (e) {
      if (e?.errorFields) return
      const responseData = e?.response?.data
      if (responseData && typeof responseData === 'object' && Object.keys(responseData).length > 0) {
        const fieldErrors = Object.entries(responseData).map(([field, msg]) => ({
          name: field,
          errors: [Array.isArray(msg) ? msg[0] : msg],
        }))
        if (fieldErrors.length > 0) {
          createForm.setFields(fieldErrors)
          return
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitHandle = async () => {
    try {
      const values = await handleForm.validate()
      setHandling(true)
      const res = await handleInspection(currentReport.id, {
        action: values.action,
        remark: values.remark || '',
        points_reward: values.points_reward || 0,
      })
      if (res.code === 0) {
        Message.success(res.message || '操作成功')
        setHandleVisible(false)
        fetchReportList()
      }
    } catch (e) {
      if (e?.errorFields) return
    } finally {
      setHandling(false)
    }
  }

  const beforeUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setUploadedImages(prev => {
        if (prev.length >= 9) {
          Message.warning('最多上传9张照片')
          return prev
        }
        return [...prev, dataUrl]
      })
    }
    reader.readAsDataURL(file)
    return false
  }

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '异常类型',
      dataIndex: 'type_name',
      width: 120,
      render: (val, record) => val || getTypeLabel(record.type),
    },
    {
      title: '投放站点',
      dataIndex: 'bin_info',
      width: 160,
      render: (val) => val ? val.name : '-',
    },
    {
      title: '关联投递',
      dataIndex: 'delivery_info',
      width: 120,
      render: (val) => val ? `#${val.id}` : '-',
    },
    {
      title: '上报人',
      dataIndex: 'reporter_info',
      width: 100,
      render: (val) => val ? val.nickname : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (val, record) => record.status_name ? <Tag>{record.status_name}</Tag> : getStatusTag(val),
    },
    {
      title: '奖励积分',
      dataIndex: 'points_reward',
      width: 100,
      render: (val) => val > 0 ? (
        <span style={{ color: '#FF7D00', fontWeight: 500 }}>+{val}</span>
      ) : '-',
    },
    {
      title: '上报时间',
      dataIndex: 'created_at',
      width: 180,
      render: (val) => val ? new Date(val).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size={8}>
          <Button
            type="text"
            size="small"
            icon={<IconEye />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {isAdmin && record.status !== 2 && record.status !== 3 && (
            <Button
              type="text"
              size="small"
              status="success"
              icon={<IconCheck />}
              onClick={() => handleOpenHandle(record)}
            >
              处理
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="placeholder-page">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <Statistic
              title={<span><IconClockCircle style={{ color: '#FF7D00' }} /> 待处理</span>}
              value={stats.pending_count}
              style={{ borderRight: '1px solid var(--color-border-2)', paddingRight: 24 }}
            />
            <Statistic
              title="处理中"
              value={stats.processing_count}
              style={{ borderRight: '1px solid var(--color-border-2)', paddingRight: 24, color: '#165DFF' }}
            />
            <Statistic
              title="已处理"
              value={stats.resolved_count}
              style={{ color: '#00B42A' }}
            />
          </div>
          <Space>
            <Select
              placeholder="状态筛选"
              style={{ width: 140 }}
              allowClear
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPage(1) }}
            >
              <Option value={0}>待处理</Option>
              <Option value={1}>处理中</Option>
              <Option value={2}>已处理</Option>
              <Option value={3}>已驳回</Option>
            </Select>
            {canCreate && (
              <Button type="primary" icon={<IconPlus />} onClick={handleCreate}>
                上报异常
              </Button>
            )}
          </Space>
        </div>

        <Table
          loading={loading}
          columns={columns}
          data={reportList}
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
          empty={<Empty description="暂无上报记录" />}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title="上报异常"
        visible={createVisible}
        onOk={handleSubmitCreate}
        onCancel={() => setCreateVisible(false)}
        confirmLoading={submitting}
        width={600}
        okText="提交上报"
        cancelText="取消"
        unmountOnExit
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            label="异常类型"
            field="type"
            rules={[{ required: true, message: '请选择异常类型' }]}
          >
            <Select placeholder="请选择异常类型">
              {typeOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="关联投放站点" field="bin_id">
            <Select
              placeholder="请选择投放站点（可选）"
              allowClear
              triggerStyle={{ maxHeight: 280 }}
            >
              {binList.map(bin => (
                <Option key={bin.id} value={bin.id}>
                  <div>
                    <div>{bin.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                      {bin.location} · {binCategoryMap[bin.category] || bin.category}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="关联投递记录" field="delivery_id">
            <Select
              placeholder="请选择关联的投递记录（可选）"
              allowClear
              triggerStyle={{ maxHeight: 280 }}
              showSearch
              mode={null}
            >
              {deliveryList.map(d => (
                <Option key={d.id} value={d.id}>
                  <div>
                    <div>#{d.id} · {deliveryCategoryMap[d.category] || d.category} · {d.weight}kg</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                      {d.bin_info?.name || '未知站点'} · {d.created_at ? new Date(d.created_at).toLocaleString('zh-CN') : ''}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="异常描述"
            field="description"
            rules={[
              { required: true, message: '请填写异常描述' },
              { minLength: 5, message: '描述不能少于5个字' },
            ]}
          >
            <TextArea
              placeholder="请详细描述异常情况（至少5个字）"
              autoSize={{ minRows: 3, maxRows: 6 }}
              maxLength={2000}
              showWordLimit
            />
          </Form.Item>

          <Form.Item label="现场照片" field="images">
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {uploadedImages.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: 80,
                      height: 80,
                      borderRadius: 4,
                      overflow: 'hidden',
                      border: '1px solid var(--color-border-2)',
                    }}
                  >
                    <img
                      src={img}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: 20,
                        height: 20,
                        background: 'rgba(0,0,0,0.5)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                      onClick={() => removeImage(idx)}
                    >
                      ×
                    </div>
                  </div>
                ))}
                {uploadedImages.length < 9 && (
                  <Upload
                    beforeUpload={beforeUpload}
                    accept="image/*"
                    multiple
                    showUploadList={false}
                    drag
                    style={{ width: 80, height: 80 }}
                  >
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        border: '1px dashed var(--color-border-3)',
                        borderRadius: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-3)',
                        cursor: 'pointer',
                      }}
                    >
                      <IconImage style={{ fontSize: 24, marginBottom: 4 }} />
                      <span style={{ fontSize: 12 }}>上传</span>
                    </div>
                  </Upload>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                最多上传9张照片，已上传 {uploadedImages.length}/9
              </div>
            </div>
          </Form.Item>

          <Form.Item label="位置说明" field="location">
            <Input placeholder="请输入具体位置信息（可选）" maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上报详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          isAdmin && currentReport && currentReport.status !== 2 && currentReport.status !== 3 && (
            <Button
              key="handle"
              type="primary"
              status="success"
              icon={<IconCheck />}
              onClick={() => { setDetailVisible(false); handleOpenHandle(currentReport) }}
            >
              处理
            </Button>
          ),
          <Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>
        ].filter(Boolean)}
        width={720}
        unmountOnExit
      >
        {currentReport && (
          <div>
            <Descriptions
              column={2}
              title="基本信息"
              data={[
                { label: '上报编号', value: `#${currentReport.id}` },
                { label: '状态', value: currentReport.status_name ? <Tag>{currentReport.status_name}</Tag> : getStatusTag(currentReport.status) },
                { label: '异常类型', value: currentReport.type_name || getTypeLabel(currentReport.type) },
                { label: '上报时间', value: currentReport.created_at ? new Date(currentReport.created_at).toLocaleString('zh-CN') : '-' },
                { label: '上报人', value: currentReport.reporter_info?.nickname || '-' },
                { label: '联系电话', value: currentReport.reporter_info?.phone || '-' },
                { label: '投放站点', value: currentReport.bin_info?.name || '-' },
                { label: '站点地址', value: currentReport.bin_info?.location || '-' },
                { label: '关联投递', value: currentReport.delivery_info ? `#${currentReport.delivery_info.id}` : '-' },
                { label: '奖励积分', value: currentReport.points_reward > 0 ? `+${currentReport.points_reward}` : '-' },
              ]}
              style={{ marginBottom: 20 }}
            />

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>异常描述</div>
              <div style={{
                padding: '12px 16px',
                background: 'var(--color-fill-2)',
                borderRadius: 4,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
              }}>
                {currentReport.description}
              </div>
              {currentReport.location && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-2)' }}>
                  <span style={{ color: 'var(--color-text-3)' }}>位置：</span>{currentReport.location}
                </div>
              )}
            </div>

            {currentReport.images && currentReport.images.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>现场照片</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {currentReport.images.map((img, idx) => (
                    <Image
                      key={idx}
                      src={img}
                      alt={`照片${idx + 1}`}
                      width={100}
                      height={100}
                      style={{
                        borderRadius: 4,
                        objectFit: 'cover',
                        border: '1px solid var(--color-border-2)',
                      }}
                      previewProps={{
                        toolbarRender: () => null,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {(currentReport.status === 2 || currentReport.status === 3) && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>处理结果</div>
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--color-fill-2)',
                    borderRadius: 4,
                  }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: 'var(--color-text-3)' }}>处理人：</span>
                      {currentReport.handler_info?.nickname || '-'}
                      <span style={{ margin: '0 12px', color: 'var(--color-border-3)' }}>|</span>
                      <span style={{ color: 'var(--color-text-3)' }}>处理时间：</span>
                      {currentReport.handled_at ? new Date(currentReport.handled_at).toLocaleString('zh-CN') : '-'}
                    </div>
                    {currentReport.handle_remark && (
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {currentReport.handle_remark}
                      </div>
                    )}
                    {currentReport.points_reward > 0 && (
                      <div style={{ marginTop: 8, color: '#FF7D00', fontWeight: 500 }}>
                        <IconStar style={{ marginRight: 4 }} />
                        奖励积分：+{currentReport.points_reward}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="处理上报"
        visible={handleVisible}
        onOk={handleSubmitHandle}
        onCancel={() => setHandleVisible(false)}
        confirmLoading={handling}
        width={520}
        okText="确认处理"
        cancelText="取消"
        unmountOnExit
      >
        {currentReport && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              padding: '12px 16px',
              background: 'var(--color-fill-2)',
              borderRadius: 4,
              fontSize: 13,
            }}>
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-3)' }}>上报编号：</span>#{currentReport.id}
                <span style={{ margin: '0 12px', color: 'var(--color-border-3)' }}>|</span>
                <span style={{ color: 'var(--color-text-3)' }}>类型：</span>
                {currentReport.type_name || getTypeLabel(currentReport.type)}
              </div>
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-3)' }}>上报人：</span>
                {currentReport.reporter_info?.nickname || '-'}
              </div>
              <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                {currentReport.description}
              </div>
            </div>
          </div>
        )}
        <Form form={handleForm} layout="vertical">
          <Form.Item
            label="处理操作"
            field="action"
            rules={[{ required: true, message: '请选择处理操作' }]}
          >
            <Select placeholder="请选择处理操作">
              {currentReport?.status === 0 && (
                <Option value="start">开始处理</Option>
              )}
              <Option value="resolve">处理完成（可奖励积分）</Option>
              <Option value="reject">驳回</Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.action !== cur.action}
          >
            {({ getFieldValue }) => {
              const action = getFieldValue('action')
              if (action === 'resolve') {
                return (
                  <Form.Item
                    label="奖励积分"
                    field="points_reward"
                    rules={[{ min: 0, message: '积分不能为负数' }]}
                  >
                    <InputNumber
                      placeholder="请输入奖励积分（选填）"
                      style={{ width: '100%' }}
                      min={0}
                      max={10000}
                      step={10}
                    />
                  </Form.Item>
                )
              }
              return null
            }}
          </Form.Item>
          <Form.Item label="处理备注" field="remark">
            <TextArea
              placeholder="请输入处理备注（可选）"
              autoSize={{ minRows: 2, maxRows: 4 }}
              maxLength={1000}
              showWordLimit
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
