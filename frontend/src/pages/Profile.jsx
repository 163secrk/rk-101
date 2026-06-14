import React, { useState, useEffect } from 'react'
import { Card, Descriptions, Avatar, Button, Divider, Tag, Form, Input, Message, Tabs, Table, Modal, DatePicker, Select } from '@arco-design/web-react'
import { IconEdit, IconPlus, IconDelete } from '@arco-design/web-react/icon'
import { useLocation, useNavigate } from 'react-router-dom'
import { getProfile, updateProfile, getInvitationCodes, createInvitationCode, deleteInvitationCode } from '../api/user'
import dayjs from 'dayjs'

const TabPane = Tabs.TabPane
const FormItem = Form.Item
const Option = Select.Option

export default function Profile() {
  const location = useLocation()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState({})
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState(new URLSearchParams(location.search).get('tab') || 'profile')
  const [invitationCodes, setInvitationCodes] = useState([])
  const [codesLoading, setCodesLoading] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createForm] = Form.useForm()

  const isAdmin = userInfo.role === 'admin'

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab') || 'profile'
    setActiveTab(tab)
  }, [location.search])

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (activeTab === 'invitations' && isAdmin) {
      loadInvitationCodes()
    }
  }, [activeTab, isAdmin])

  const loadProfile = async () => {
    try {
      const res = await getProfile()
      setUserInfo(res.data)
    } catch (e) {
      try {
        setUserInfo(JSON.parse(localStorage.getItem('user_info') || '{}'))
      } catch {}
    }
  }

  const loadInvitationCodes = async () => {
    setCodesLoading(true)
    try {
      const res = await getInvitationCodes()
      setInvitationCodes(res.data)
    } finally {
      setCodesLoading(false)
    }
  }

  const handleEdit = () => {
    form.setFieldsValue(userInfo)
    setEditing(true)
  }

  const handleSave = async () => {
    const values = await form.validate()
    setLoading(true)
    try {
      const res = await updateProfile(values)
      setUserInfo(res.data)
      localStorage.setItem('user_info', JSON.stringify(res.data))
      Message.success('更新成功')
      setEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (key) => {
    setActiveTab(key)
    navigate(`/profile?tab=${key}`, { replace: true })
  }

  const handleCreateInvitation = async () => {
    const values = await createForm.validate()
    setLoading(true)
    try {
      await createInvitationCode({
        code: values.code,
        role: values.role,
        expires_at: values.expires_at.toISOString(),
      })
      Message.success('邀请码创建成功')
      setCreateModalVisible(false)
      createForm.resetFields()
      loadInvitationCodes()
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCode = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个邀请码吗？删除后无法恢复。',
      onOk: async () => {
        try {
          await deleteInvitationCode(id)
          Message.success('删除成功')
          loadInvitationCodes()
        } catch (e) {
          // error handled
        }
      },
    })
  }

  const invitationColumns = [
    {
      title: '邀请码',
      dataIndex: 'code',
      width: 160,
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 100,
      render: (value) => {
        const roleMap = {
          admin: { color: 'red', text: '管理员' },
          inspector: { color: 'orange', text: '巡检员' },
          collector: { color: 'blue', text: '收集员' },
        }
        const role = roleMap[value] || { color: 'default', text: value }
        return <Tag color={role.color}>{role.text}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'is_valid',
      width: 100,
      render: (value, record) => {
        if (record.is_used) {
          return <Tag color="gray">已使用</Tag>
        }
        if (!value) {
          return <Tag color="red">已过期</Tag>
        }
        return <Tag color="green">有效</Tag>
      },
    },
    {
      title: '创建人',
      dataIndex: 'created_by_name',
      width: 120,
    },
    {
      title: '使用人',
      dataIndex: 'used_by_name',
      width: 120,
      render: (value) => value || '--',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (value) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--',
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      width: 180,
      render: (value) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--',
    },
    {
      title: '使用时间',
      dataIndex: 'used_at',
      width: 180,
      render: (value) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--',
    },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        !record.is_used ? (
          <Button
            type="text"
            status="danger"
            icon={<IconDelete />}
            onClick={() => handleDeleteCode(record.id)}
          >
            删除
          </Button>
        ) : null
      ),
    },
  ]

  const renderProfileTab = () => (
    <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
      <div style={{ textAlign: 'center' }}>
        <Avatar size={96} style={{ backgroundColor: '#00B42A', fontSize: 36 }}>
          {userInfo.nickname ? userInfo.nickname.charAt(0) : '🌱'}
        </Avatar>
        <h3 style={{ marginTop: 16, marginBottom: 8 }}>{userInfo.nickname || '--'}</h3>
        <div>
          <Tag color="green" bordered>
            {userInfo.role === 'admin' ? '管理员' : userInfo.role === 'collector' ? '收集员' : userInfo.role === 'inspector' ? '巡检员' : '居民用户'}
          </Tag>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {editing ? (
          <Form form={form} layout="vertical" style={{ maxWidth: 520 }}>
            <Form.Item field="nickname" label="昵称">
              <Input placeholder="请输入昵称" />
            </Form.Item>
            <Form.Item field="email" label="邮箱">
              <Input placeholder="请输入邮箱" />
            </Form.Item>
            <Form.Item field="gender" label="性别" initialValue={0}>
              <Input placeholder="0:未知 1:男 2:女" />
            </Form.Item>
            <Form.Item field="community" label="所在社区">
              <Input placeholder="请输入社区" />
            </Form.Item>
            <Form.Item field="address" label="详细地址">
              <Input placeholder="请输入详细地址" />
            </Form.Item>
            <div style={{ marginTop: 16 }}>
              <Button type="primary" loading={loading} onClick={handleSave} style={{ marginRight: 12 }}>保存</Button>
              <Button onClick={() => setEditing(false)}>取消</Button>
            </div>
          </Form>
        ) : (
          <>
            <Descriptions column={1} labelStyle={{ width: 120 }}>
              <Descriptions.Item label="用户名">{userInfo.username || '--'}</Descriptions.Item>
              <Descriptions.Item label="手机号">{userInfo.phone || '--'}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{userInfo.email || '--'}</Descriptions.Item>
              <Descriptions.Item label="性别">
                {userInfo.gender === 1 ? '男' : userInfo.gender === 2 ? '女' : '未知'}
              </Descriptions.Item>
              <Descriptions.Item label="身份码">{userInfo.identity_code || '未生成'}</Descriptions.Item>
              <Descriptions.Item label="所属社区">{userInfo.community || '--'}</Descriptions.Item>
              <Descriptions.Item label="详细地址">{userInfo.address || '--'}</Descriptions.Item>
            </Descriptions>
            <Divider />
            <Descriptions column={1} labelStyle={{ width: 120 }}>
              <Descriptions.Item label="可用积分">
                <span style={{ color: '#00B42A', fontWeight: 600, fontSize: 18 }}>
                  {userInfo.available_points || 0}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="累计积分">{userInfo.total_points || 0}</Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {userInfo.created_at ? new Date(userInfo.created_at).toLocaleString() : '--'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </div>
    </div>
  )

  const renderInvitationsTab = () => (
    <div>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<IconPlus />}
          onClick={() => setCreateModalVisible(true)}
        >
          创建邀请码
        </Button>
      </div>
      <Table
        columns={invitationColumns}
        data={invitationCodes}
        loading={codesLoading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="创建邀请码"
        visible={createModalVisible}
        onOk={handleCreateInvitation}
        onCancel={() => {
          setCreateModalVisible(false)
          createForm.resetFields()
        }}
        confirmLoading={loading}
      >
        <Form form={createForm} layout="vertical">
          <FormItem
            field="code"
            label="邀请码"
            rules={[{ required: true, message: '请输入邀请码' }]}
          >
            <Input placeholder="请输入邀请码，如：ADMIN001" maxLength={50} />
          </FormItem>
          <FormItem
            field="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">管理员</Option>
              <Option value="inspector">巡检员</Option>
              <Option value="collector">收集员</Option>
            </Select>
          </FormItem>
          <FormItem
            field="expires_at"
            label="过期时间"
            rules={[{ required: true, message: '请选择过期时间' }]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="请选择过期时间"
              minDate={dayjs().add(1, 'day').toDate()}
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  )

  const getCardExtra = () => {
    if (activeTab === 'profile' && !editing) {
      return <Button icon={<IconEdit />} type="outline" onClick={handleEdit}>编辑资料</Button>
    }
    return null
  }

  return (
    <div className="placeholder-page">
      <Card
        title="个人中心"
        extra={getCardExtra()}
        style={{ minHeight: 600 }}
      >
        {isAdmin ? (
          <Tabs activeTab={activeTab} onChange={handleTabChange}>
            <TabPane key="profile" title="个人资料">
              {renderProfileTab()}
            </TabPane>
            <TabPane key="invitations" title="邀请码管理">
              {renderInvitationsTab()}
            </TabPane>
          </Tabs>
        ) : (
          renderProfileTab()
        )}
      </Card>
    </div>
  )
}
