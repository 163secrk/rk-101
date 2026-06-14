import React from 'react'
import { Card, Result, Button } from '@arco-design/web-react'
import './Placeholder.less'

export default function Exchange() {
  return (
    <div className="placeholder-page">
      <Card title="积分兑换商城" style={{ minHeight: 600 }}>
        <Result
          status="info"
          title="积分兑换商城模块"
          subTitle="该模块正在开发中，敬请期待。将提供环保周边、生活好物等商品兑换。"
          extra={[
            <Button type="primary" key="browse">浏览商品</Button>,
          ]}
        />
      </Card>
    </div>
  )
}
