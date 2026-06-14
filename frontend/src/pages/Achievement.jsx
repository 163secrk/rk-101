import React from 'react'
import { Card, Result, Button } from '@arco-design/web-react'
import './Placeholder.less'

export default function Achievement() {
  return (
    <div className="placeholder-page">
      <Card title="绿色成就" style={{ minHeight: 600 }}>
        <Result
          status="info"
          title="绿色成就与大盘模块"
          subTitle="该模块正在开发中，敬请期待。将展示成就墙、排行榜、社区环保大盘数据。"
          extra={[
            <Button type="primary" key="rank">查看排行</Button>,
          ]}
        />
      </Card>
    </div>
  )
}
