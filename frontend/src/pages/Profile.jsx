import React, { useState, useEffect } from 'react'
import { Card, Result, Descriptions, Avatar, Button, Divider, Tag, Form, Input, Message } from '@arco-design/web-react'
import { IconEdit } from '@arco-design/web-react/icon'
import { getProfile, updateProfile } from '../api/user'

export default function Profile() {
  const [userInfo, setUserInfo] = useState({})
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadProfile()
  }, [])

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

  return (
    <div className="placeholder-page">
      <Card
        title="个人中心"
        extra={!editing ? <Button icon={<IconEdit />} type="outline" onClick={handleEdit}>编辑资料</Button> : null}
        style={{ minHeight: 600 }}
      >
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
                <Divider />
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
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
