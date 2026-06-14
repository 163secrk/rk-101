import React from 'react'
import { Card, Empty, Button, Result } from '@arco-design/web-react'
import { IconPlus } from '@arco-design/web-react/icon'
import './Placeholder.less'

export default function Delivery() {
  return (
    <div className="placeholder-page">
      <Card title="投放管理" style={{ minHeight: 600 }}>
        <Result
          status="info"
          title="智能投放管理模块"
          subTitle="该模块正在开发中，敬请期待。将支持投放记录、称重交易、智能设备联动等功能。"
          extra={[
            <Button type="primary" key="create" icon={<IconPlus />}>
              登记投放
            </Button>,
          ]}
        />
      </Card>
    </div>
  )
}
