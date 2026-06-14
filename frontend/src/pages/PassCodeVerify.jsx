import React, { useState } from 'react'
import { Card, Button, Input, Space, Tag, Typography, Message, Form, Descriptions, Result, Divider } from '@arco-design/web-react'
import { IconScan, IconCheck, IconClose, IconSearch } from '@arco-design/web-react/icon'
import { verifyPassCode } from '../api/points'
import './PassCodeVerify.less'

const { Title, Text } = Typography

export default function PassCodeVerify() {
  const [qrContent, setQrContent] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifyStatus, setVerifyStatus] = useState(null) // 'success' | 'error' | null

  const handleVerify = async () => {
    if (!qrContent.trim()) {
      Message.warning('请输入通行码内容')
      return
    }

    setVerifying(true)
    setVerifyResult(null)
    setVerifyStatus(null)

    try {
      const res = await verifyPassCode({ qr_content: qrContent.trim() })
      if (res.code === 0) {
        setVerifyResult(res.data)
        setVerifyStatus('success')
        Message.success('验证成功')
      }
    } catch (e) {
      setVerifyStatus('error')
      setVerifyResult({
        message: e.message || '验证失败'
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleReset = () => {
    setQrContent('')
    setVerifyResult(null)
    setVerifyStatus(null)
  }

  const roleMap = {
    resident: '居民',
    collector: '收集员',
    inspector: '巡检员',
    admin: '管理员',
  }

  return (
    <div className="passcode-verify-page">
      <Card
        className="verify-card"
        title={
          <Space>
            <IconScan style={{ color: '#165DFF', fontSize: 20 }} />
            <span>通行码验证</span>
          </Space>
        }
      >
        <div className="verify-form">
          <Form layout="vertical">
            <Form.Item label="通行码内容">
              <Input.TextArea
                value={qrContent}
                onChange={setQrContent}
                placeholder="请输入或粘贴通行码内容"
                style={{ minHeight: 100 }}
                autoSize={{ minRows: 3, maxRows: 6 }}
              />
            </Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<IconScan />}
                onClick={handleVerify}
                loading={verifying}
                long
              >
                验证通行码
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form>
        </div>

        <Divider />

        <div className="verify-result">
          {verifyStatus === 'success' && verifyResult && (
            <Result
              status="success"
              title="验证成功"
              subTitle="该通行码有效，用户身份已确认"
              icon={<IconCheck style={{ color: '#00B42A', fontSize: 48 }} />}
            >
              <div className="result-detail">
                <Descriptions
                  column={1}
                  title="用户信息"
                  data={[
                    {
                      label: '用户昵称',
                      value: verifyResult.user?.nickname || '-',
                    },
                    {
                      label: '用户名',
                      value: verifyResult.user?.username || '-',
                    },
                    {
                      label: '用户角色',
                      value: (
                        <Tag color="green">
                          {roleMap[verifyResult.user?.role] || verifyResult.user?.role}
                        </Tag>
                      ),
                    },
                    {
                      label: '身份码',
                      value: verifyResult.user?.identity_code || '-',
                    },
                    {
                      label: '所属社区',
                      value: verifyResult.user?.community || '-',
                    },
                    {
                      label: '验证时间',
                      value: verifyResult.verified_at
                        ? new Date(verifyResult.verified_at).toLocaleString('zh-CN')
                        : '-',
                    },
                  ]}
                />
              </div>
            </Result>
          )}

          {verifyStatus === 'error' && (
            <Result
              status="error"
              title="验证失败"
              subTitle={verifyResult?.message || '通行码无效或已过期'}
              icon={<IconClose style={{ color: '#F53F3F', fontSize: 48 }} />}
            />
          )}

          {!verifyStatus && (
            <div className="empty-result">
              <div className="empty-icon"><IconSearch style={{ fontSize: 48, color: '#c9cdd4' }} /></div>
              <Text type="secondary">请输入通行码内容进行验证</Text>
            </div>
          )}
        </div>
      </Card>

      <Card
        className="tips-card"
        title="使用说明"
        style={{ marginTop: 16 }}
      >
        <ul className="tips-list">
          <li>请确保通行码在有效期内（默认5分钟）</li>
          <li>每个通行码只能使用一次，验证后即失效</li>
          <li>验证时请确认用户身份与通行码信息一致</li>
          <li>如遇异常情况请及时上报管理员</li>
        </ul>
      </Card>
    </div>
  )
}
