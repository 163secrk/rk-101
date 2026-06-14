import React, { useState } from 'react'
import { Card, Form, Input, Button, Checkbox, Message, Link } from '@arco-design/web-react'
import { IconUser, IconPhone, IconLock } from '@arco-design/web-react/icon'
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom'
import { login } from '../api/user'
import './auth-pages.less'

const FormItem = Form.Item

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [loginType, setLoginType] = useState('username')
  const [form] = Form.useForm()

  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      const payload = loginType === 'username'
        ? { username: values.account, password: values.password }
        : { phone: values.phone, password: values.password }

      const res = await login(payload)
      const { tokens, user } = res.data
      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)
      localStorage.setItem('user_info', JSON.stringify(user))
      Message.success('登录成功')
      setTimeout(() => navigate(from, { replace: true }), 300)
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
        <p className="brand-desc">垃圾分类积分激励系统 · 让绿色生活更有价值</p>
      </div>
      <Card className="auth-card" style={{ borderRadius: 16 }}>
        <div className="auth-tabs">
          <div
            className={`tab ${loginType === 'username' ? 'active' : ''}`}
            onClick={() => setLoginType('username')}
          >
            账号登录
          </div>
          <div
            className={`tab ${loginType === 'phone' ? 'active' : ''}`}
            onClick={() => setLoginType('phone')}
          >
            手机号登录
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onSubmit={handleSubmit}
          className="auth-form"
        >
          {loginType === 'username' ? (
            <FormItem
              field="account"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<IconUser style={{ color: '#c9cdd4' }} />}
                placeholder="请输入用户名"
                size="large"
              />
            </FormItem>
          ) : (
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
          )}
          <FormItem
            field="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<IconLock style={{ color: '#c9cdd4' }} />}
              placeholder="请输入密码"
              size="large"
            />
          </FormItem>
          <FormItem field="remember">
            <Checkbox>记住登录状态</Checkbox>
          </FormItem>
          <FormItem>
            <Button
              type="primary"
              htmlType="submit"
              long
              size="large"
              loading={loading}
              className="submit-btn"
            >
              登录
            </Button>
          </FormItem>
        </Form>
        <div className="auth-footer">
          <span>还没有账号？</span>
          <Link>
            <RouterLink to="/register" className="link-text">立即注册</RouterLink>
          </Link>
        </div>
      </Card>
      <div className="auth-copy">
        © 2024 绿踪 GreenTrace · 共建绿色社区
      </div>
    </div>
  )
}
