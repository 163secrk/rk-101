import React from 'react'
import { Card, Result, Button } from '@arco-design/web-react'
import './Placeholder.less'

export default function Points() {
  return (
    <div className="placeholder-page">
      <Card title="积分中心" style={{ minHeight: 600 }}>
        <Result
          status="info"
          title="积分中心模块"
          subTitle="该模块正在开发中，敬请期待。将展示积分明细、积分等级、积分核算规则等。"
          extra={[
            <Button type="primary" key="detail">查看流水</Button>,
          ]}
        />
      </Card>
    </div>
  )
}
