import React from 'react'
import { Card, Result, Button } from '@arco-design/web-react'
import './Placeholder.less'

export default function Inspection() {
  return (
    <div className="placeholder-page">
      <Card title="巡检异常上报" style={{ minHeight: 600 }}>
        <Result
          status="info"
          title="巡检异常上报模块"
          subTitle="该模块正在开发中，敬请期待。将支持分类错误、设备故障等异常上报处理流程。"
          extra={[
            <Button type="primary" key="report">我要上报</Button>,
          ]}
        />
      </Card>
    </div>
  )
}
