import React, { useState } from 'react'
import { Card, Form, Input, Button, Message, Link, Select, Alert } from '@arco-design/web-react'
import {
  IconUser,
  IconPhone,
  IconLock,
  IconEmail,
  IconLocation,
  IconHome,
  IconTag,
  IconSafe,
} from '@arco-design/web-react/icon'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { register } from '../api/user'
import './auth-pages.less'

const FormItem = Form.Item
const Option = Select.Option

const roleOptions = [
  { value: 'resident', label: '居民（默认）', desc: '普通社区居民，可进行垃圾分类投放获取积分' },
  { value: 'collector', label: '收集员', desc: '负责收集和管理垃圾投放，需要邀请码' },
  { value: 'inspector', label: '巡检员', desc: '负责巡检和问题上报，需要邀请码' },
  { value: 'admin', label: '管理员', desc: '系统管理员，拥有全部权限，需要邀请码' },
]

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [selectedRole, setSelectedRole] = useState('resident')

  const needInvitationCode = ['admin', 'inspector', 'collector'].includes(selectedRole)

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      const payload = {
        username: values.username,
        phone: values.phone,
        password: values.password,
        confirm_password: values.confirm_password,
        nickname: values.nickname,
        community: values.community || '',
        address: values.address || '',
        role: values.role || 'resident',
      }
      if (values.email) payload.email = values.email
      if (needInvitationCode && values.invitation_code) {
        payload.invitation_code = values.invitation_code
      }
      const res = await register(payload)
      const { tokens, user } = res.data
      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)
      localStorage.setItem('user_info', JSON.stringify(user))
      Message.success('注册成功，正在跳转...')
      setTimeout(() => navigate('/dashboard', { replace: true }), 500)
    } catch (e) {
      // error handled in interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-header">
        <div className="brand">
          <span className="brand-icon">🌿</span>
          <span className="brand-name">绿踪 GreenTrace</span>
        </div>
        <p className="brand-desc">创建账号，开启您的环保积分之旅</p>
      </div>
      <Card className="auth-card auth-card-large" style={{ borderRadius: 16 }}>
        <h2 className="auth-title">注册新账号</h2>
        <Form
          form={form}
          layout="vertical"
          onSubmit={handleSubmit}
          className="auth-form"
        >
          <div className="form-row">
            <FormItem
              field="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '3-20位字母、数字或下划线' },
              ]}
            >
              <Input
                prefix={<IconUser style={{ color: '#c9cdd4' }} />}
                placeholder="请输入用户名"
                size="large"
              />
            </FormItem>
            <FormItem
              field="nickname"
              label="昵称"
              rules={[{ maxLength: 20, message: '最多20个字符' }]}
            >
              <Input
                prefix={<IconUser style={{ color: '#c9cdd4' }} />}
                placeholder="请输入昵称（可选）"
                size="large"
              />
            </FormItem>
          </div>
          <FormItem
            field="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input
              prefix={<IconPhone style={{ color: '#c9cdd4' }} />}
              placeholder="请输入手机号"
              size="large"
              maxLength={11}
            />
          </FormItem>
          <FormItem
            field="email"
            label="邮箱（可选）"
            rules={[{ type: 'email', message: '邮箱格式不正确' }]}
          >
            <Input
              prefix={<IconEmail style={{ color: '#c9cdd4' }} />}
              placeholder="请输入邮箱"
              size="large"
            />
          </FormItem>
          <div className="form-row">
            <FormItem
              field="community"
              label="所在社区"
            >
              <Input
                prefix={<IconHome style={{ color: '#c9cdd4' }} />}
                placeholder="如：阳光花园社区"
                size="large"
              />
            </FormItem>
            <FormItem
              field="address"
              label="详细地址"
            >
              <Input
                prefix={<IconLocation style={{ color: '#c9cdd4' }} />}
                placeholder="楼栋门牌号（可选）"
                size="large"
              />
            </FormItem>
          </div>
          <FormItem
            field="role"
            label="注册角色"
            initialValue="resident"
          >
            <Select
              prefix={<IconTag style={{ color: '#c9cdd4' }} />}
              placeholder="请选择注册角色"
              size="large"
              onChange={(value) => setSelectedRole(value)}
            >
              {roleOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500 }}>{option.label}</span>
                    <span style={{ fontSize: 12, color: '#86909c' }}>{option.desc}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </FormItem>
          {needInvitationCode && (
            <>
              <Alert
                type="warning"
                content="注册该角色需要有效的邀请码，请向管理员获取"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <FormItem
                field="invitation_code"
                label="邀请码"
                rules={[
                  { required: true, message: '请输入邀请码' },
                ]}
              >
                <Input
                  prefix={<IconSafe style={{ color: '#c9cdd4' }} />}
                  placeholder="请输入邀请码"
                  size="large"
                  maxLength={50}
                />
              </FormItem>
            </>
          )}
          <div className="form-row">
            <FormItem
              field="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { minLength: 6, message: '密码至少6位' },
              ]}
            >
              <Input.Password
                prefix={<IconLock style={{ color: '#c9cdd4' }} />}
                placeholder="请设置密码"
                size="large"
              />
            </FormItem>
            <FormItem
              field="confirm_password"
              label="确认密码"
              rules={[
                { required: true, message: '请再次输入密码' },
              ]}
            >
              <Input.Password
                prefix={<IconLock style={{ color: '#c9cdd4' }} />}
                placeholder="请再次输入密码"
                size="large"
              />
            </FormItem>
          </div>
          <FormItem style={{ marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              long
              size="large"
              loading={loading}
              className="submit-btn"
            >
              立即注册
            </Button>
          </FormItem>
        </Form>
        <div className="auth-footer">
          <span>已有账号？</span>
          <Link>
            <RouterLink to="/login" className="link-text">返回登录</RouterLink>
          </Link>
        </div>
      </Card>
      <div className="auth-copy">
        © 2024 绿踪 GreenTrace · 共建绿色社区
      </div>
    </div>
  )
}
