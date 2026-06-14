import React, { useState, useEffect } from 'react'
import {
  Card, Tabs, Grid, Tag, Button, Modal, Form, Input, InputNumber,
  Message, Empty, Spin, Avatar, Descriptions, Statistic, Space
} from '@arco-design/web-react'
import { IconGift, IconStar, IconShoppingCart } from '@arco-design/web-react/icon'
import {
  getGoodsList, getPointAccount, createExchange, getExchangeOrders,
  cancelExchangeOrder
} from '../api/points'
import dayjs from 'dayjs'
import './Exchange.less'

const { Row, Col } = Grid
const TabPane = Tabs.TabPane
const FormItem = Form.Item

export default function Exchange() {
  const [activeTab, setActiveTab] = useState('mall')
  const [goodsType, setGoodsType] = useState('all')
  const [goodsList, setGoodsList] = useState([])
  const [loading, setLoading] = useState(false)
  const [accountInfo, setAccountInfo] = useState(null)
  const [selectedGoods, setSelectedGoods] = useState(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [exchangeVisible, setExchangeVisible] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [form] = Form.useForm()
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  useEffect(() => {
    loadAccountInfo()
    loadGoodsList()
  }, [goodsType])

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders()
    }
  }, [activeTab, page])

  const loadAccountInfo = async () => {
    try {
      const res = await getPointAccount()
      setAccountInfo(res.data)
    } catch (e) {
      console.error('获取积分账户失败', e)
    }
  }

  const loadGoodsList = async () => {
    setLoading(true)
    try {
      const params = {}
      if (goodsType !== 'all') {
        params.type = goodsType
      }
      const res = await getGoodsList(params)
      setGoodsList(res.data.list || [])
    } catch (e) {
      console.error('获取商品列表失败', e)
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    setOrdersLoading(true)
    try {
      const res = await getExchangeOrders({ page, page_size: pageSize })
      setOrders(res.data.list || [])
      setOrdersTotal(res.data.total || 0)
    } catch (e) {
      console.error('获取兑换记录失败', e)
    } finally {
      setOrdersLoading(false)
    }
  }

  const handleViewDetail = (goods) => {
    setSelectedGoods(goods)
    setDetailVisible(true)
  }

  const handleExchange = (goods) => {
    setSelectedGoods(goods)
    setQuantity(1)
    form.resetFields()
    setExchangeVisible(true)
  }

  const handleConfirmExchange = async () => {
    if (!selectedGoods) return

    try {
      const values = await form.validate()
      const data = {
        goods_id: selectedGoods.id,
        quantity: quantity,
      }
      if (selectedGoods.type === 'physical') {
        data.receiver_name = values.receiver_name
        data.receiver_phone = values.receiver_phone
        data.receiver_address = values.receiver_address
      }

      await createExchange(data)
      Message.success('兑换成功！')
      setExchangeVisible(false)
      loadAccountInfo()
      loadGoodsList()
      if (activeTab === 'orders') {
        loadOrders()
      }
    } catch (e) {
      console.error('兑换失败', e)
    }
  }

  const handleCancelOrder = async (order) => {
    Modal.confirm({
      title: '确认取消',
      content: '确定要取消此兑换订单吗？取消后积分将退回。',
      onOk: async () => {
        try {
          await cancelExchangeOrder(order.id)
          Message.success('订单已取消')
          loadOrders()
          loadAccountInfo()
        } catch (e) {
          console.error('取消订单失败', e)
        }
      }
    })
  }

  const getStatusColor = (status) => {
    const colorMap = {
      0: 'orange',
      1: 'blue',
      2: 'green',
      3: 'gray',
      4: 'purple',
    }
    return colorMap[status] || 'gray'
  }

  const getStatusText = (status) => {
    const textMap = {
      0: '待发货',
      1: '已发货',
      2: '已完成',
      3: '已取消',
      4: '待领取',
    }
    return textMap[status] || '未知'
  }

  const renderMallTab = () => (
    <div className="mall-container">
      <div className="mall-header">
        <Card className="points-card">
          <div className="points-info">
            <div className="points-icon">
              <IconStar style={{ fontSize: 32, color: '#FF7D00' }} />
            </div>
            <div className="points-content">
              <div className="points-label">我的积分</div>
              <div className="points-value">
                {accountInfo?.balance || 0}
                <span className="points-unit">积分</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="goods-filter">
        <Space size="medium">
          <Button
            type={goodsType === 'all' ? 'primary' : 'secondary'}
            onClick={() => setGoodsType('all')}
          >
            全部商品
          </Button>
          <Button
            type={goodsType === 'physical' ? 'primary' : 'secondary'}
            onClick={() => setGoodsType('physical')}
          >
            实物商品
          </Button>
          <Button
            type={goodsType === 'virtual' ? 'primary' : 'secondary'}
            onClick={() => setGoodsType('virtual')}
          >
            虚拟券
          </Button>
        </Space>
      </div>

      <Spin loading={loading} style={{ display: 'block' }}>
        {goodsList.length > 0 ? (
          <Row gutter={16}>
            {goodsList.map((goods) => (
              <Col key={goods.id} span={6}>
                <Card
                  className="goods-card"
                  hoverable
                  onClick={() => handleViewDetail(goods)}
                >
                  <div className="goods-image-wrapper">
                    <div className="goods-image-placeholder">
                      <IconGift style={{ fontSize: 48, color: '#86909C' }} />
                    </div>
                    <Tag
                      color={goods.type === 'physical' ? 'blue' : 'purple'}
                      className="goods-type-tag"
                    >
                      {goods.type_name}
                    </Tag>
                  </div>
                  <div className="goods-info">
                    <div className="goods-name">{goods.name}</div>
                    <div className="goods-desc">{goods.description}</div>
                    <div className="goods-footer">
                      <div className="goods-price">
                        <span className="price-value">{goods.points_price}</span>
                        <span className="price-unit">积分</span>
                      </div>
                      <div className="goods-stock">库存: {goods.stock}</div>
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      long
                      disabled={goods.stock <= 0 || (accountInfo?.balance || 0) < goods.points_price}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExchange(goods)
                      }}
                      icon={<IconShoppingCart />}
                    >
                      立即兑换
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="暂无商品" />
        )}
      </Spin>
    </div>
  )

  const renderOrdersTab = () => (
    <div className="orders-container">
      <Spin loading={ordersLoading} style={{ display: 'block' }}>
        {orders.length > 0 ? (
          <div className="orders-list">
            {orders.map((order) => (
              <Card key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <span className="order-no">订单号: {order.order_no}</span>
                    <span className="order-time">{dayjs(order.created_at).format('YYYY-MM-DD HH:mm')}</span>
                  </div>
                  <Tag color={getStatusColor(order.status)}>
                    {getStatusText(order.status)}
                  </Tag>
                </div>
                <div className="order-content">
                  <div className="order-goods">
                    <div className="order-goods-image">
                      <IconGift style={{ fontSize: 32, color: '#86909C' }} />
                    </div>
                    <div className="order-goods-info">
                      <div className="order-goods-name">{order.goods_name}</div>
                      <div className="order-goods-type">
                        <Tag size="small" color={order.goods_type === 'physical' ? 'blue' : 'purple'}>
                          {order.goods_info?.type_name || ''}
                        </Tag>
                        x {order.quantity}
                      </div>
                    </div>
                  </div>
                  <div className="order-points">
                    <span className="order-points-value">-{order.total_points}</span>
                    <span className="order-points-unit">积分</span>
                  </div>
                </div>
                {order.voucher_code && order.status === 4 && (
                  <div className="order-voucher">
                    <div className="voucher-label">兑换码:</div>
                    <div className="voucher-code">{order.voucher_code}</div>
                  </div>
                )}
                {order.receiver_name && (
                  <div className="order-receiver">
                    <div className="receiver-info">
                      <span>收货人: {order.receiver_name}</span>
                      <span>联系电话: {order.receiver_phone}</span>
                    </div>
                    <div className="receiver-address">收货地址: {order.receiver_address}</div>
                  </div>
                )}
                {(order.status === 0 || order.status === 4) && (
                  <div className="order-actions">
                    <Button size="small" status="danger" onClick={() => handleCancelOrder(order)}>
                      取消订单
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="暂无兑换记录" />
        )}
      </Spin>
    </div>
  )

  return (
    <div className="exchange-page">
      <Card>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="mall" title="积分商城" />
          <TabPane key="orders" title="兑换记录" />
        </Tabs>

        {activeTab === 'mall' && renderMallTab()}
        {activeTab === 'orders' && renderOrdersTab()}
      </Card>

      <Modal
        title="商品详情"
        visible={detailVisible}
        onOk={() => setDetailVisible(false)}
        onCancel={() => setDetailVisible(false)}
        okText="立即兑换"
        cancelText="关闭"
        onOkBtnClick={() => {
          setDetailVisible(false)
          handleExchange(selectedGoods)
        }}
        okButtonProps={{
          disabled: selectedGoods?.stock <= 0 || (accountInfo?.balance || 0) < (selectedGoods?.points_price || 0)
        }}
      >
        {selectedGoods && (
          <div className="goods-detail">
            <div className="goods-detail-image">
              <IconGift style={{ fontSize: 80, color: '#86909C' }} />
            </div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="商品名称">{selectedGoods.name}</Descriptions.Item>
              <Descriptions.Item label="商品类型">
                <Tag color={selectedGoods.type === 'physical' ? 'blue' : 'purple'}>
                  {selectedGoods.type_name}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="积分价格">
                <span style={{ color: '#FF7D00', fontWeight: 'bold', fontSize: 18 }}>
                  {selectedGoods.points_price} 积分
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="市场价格">¥{selectedGoods.market_price}</Descriptions.Item>
              <Descriptions.Item label="库存数量">{selectedGoods.stock} 件</Descriptions.Item>
              <Descriptions.Item label="已售数量">{selectedGoods.sold} 件</Descriptions.Item>
              <Descriptions.Item label="商品描述">{selectedGoods.description || '暂无描述'}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      <Modal
        title="确认兑换"
        visible={exchangeVisible}
        onOk={handleConfirmExchange}
        onCancel={() => setExchangeVisible(false)}
        okText="确认兑换"
        confirmLoading={loading}
      >
        {selectedGoods && (
          <div className="exchange-form">
            <div className="exchange-goods-info">
              <div className="exchange-goods-image">
                <IconGift style={{ fontSize: 48, color: '#86909C' }} />
              </div>
              <div className="exchange-goods-detail">
                <div className="exchange-goods-name">{selectedGoods.name}</div>
                <div className="exchange-goods-price">
                  <span style={{ color: '#FF7D00', fontWeight: 'bold' }}>
                    {selectedGoods.points_price}
                  </span> 积分 / 件
                </div>
              </div>
            </div>

            <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
              <FormItem label="兑换数量">
                <InputNumber
                  min={1}
                  max={selectedGoods.stock}
                  value={quantity}
                  onChange={setQuantity}
                  style={{ width: '100%' }}
                />
              </FormItem>

              <div className="exchange-total">
                <span>共需积分:</span>
                <span className="total-points">
                  {selectedGoods.points_price * quantity} 积分
                </span>
              </div>

              {selectedGoods.type === 'physical' && (
                <>
                  <FormItem
                    label="收货人姓名"
                    field="receiver_name"
                    rules={[{ required: true, message: '请输入收货人姓名' }]}
                  >
                    <Input placeholder="请输入收货人姓名" />
                  </FormItem>
                  <FormItem
                    label="联系电话"
                    field="receiver_phone"
                    rules={[{ required: true, message: '请输入联系电话' }]}
                  >
                    <Input placeholder="请输入联系电话" />
                  </FormItem>
                  <FormItem
                    label="收货地址"
                    field="receiver_address"
                    rules={[{ required: true, message: '请输入收货地址' }]}
                  >
                    <Input.TextArea placeholder="请输入详细收货地址" rows={2} />
                  </FormItem>
                </>
              )}
            </Form>

            <div className="exchange-balance">
              <span>当前积分余额:</span>
              <span className="balance-value">{accountInfo?.balance || 0} 积分</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
