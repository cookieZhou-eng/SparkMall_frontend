import { http } from './request'
import type { PageData } from './product'

/** 订单详情(商品快照) */
export interface OrderItem {
  id: number
  orderId: number
  orderNo: string
  productId: number
  productName: string
  productImage: string
  price: number
  count: number
  subtotal: number
  /** 商家用户ID(下单时从商品快照写入) */
  merchantId?: number | null
  /** 物流状态: 0-待发货 1-已发货 2-已送达 */
  logisticsStatus?: number
  /** 发货时间 */
  shipTime?: string | null
  /** 送达时间 */
  deliveryTime?: string | null
}

/** 订单 */
export interface Order {
  id: number
  orderNo: string
  userId: number
  totalAmount: number
  totalCount: number
  status: number
  receiverName: string
  receiverPhone: string
  receiverAddr: string
  remark: string
  payTime: string | null
  createTime: string
  items: OrderItem[]
  /** 待支付剩余秒数(仅 status=1 时有值, 服务端按 createTime+超时时间计算, 前端据此倒计时) */
  remainingSeconds?: number | null
}

/** 下单请求参数 */
export interface CreateOrderParams {
  userId: number
  receiverName: string
  receiverPhone: string
  receiverAddr: string
  remark?: string
  items: { productId: number; count: number }[]
}

/** POST /order/create 创建订单(后端按商家拆分为多个订单) */
export const createOrder = (data: CreateOrderParams) =>
  http.post<Order[]>('/order/create', data)

/** 支付流水 */
export interface Payment {
  id: number
  paymentNo: string
  orderNo: string
  userId: number
  amount: number
  channel: string
  status: number
  tradeNo: string
  payTime: string
}

/** 支付请求参数 */
export interface PayOrderParams {
  orderNo: string
  userId: number
  channel: string
}

/** POST /order/pay 模拟支付 */
export const payOrder = (data: PayOrderParams) =>
  http.post<Payment>('/order/pay', data)

/** POST /order/cancel 取消订单(释放锁定的库存) */
export const cancelOrder = (data: { orderNo: string; userId: number }) =>
  http.post('/order/cancel', data)

/**
 * 模拟支付渠道列表(演示用)
 * 真实项目会接入微信/支付宝等 SDK, 前端只需选一种渠道发到后端即可
 */
export const payChannels = [
  { value: 'alipay', label: '支付宝', desc: '推荐使用, 无需输密' },
  { value: 'wechat', label: '微信支付', desc: '微信扫码/自动扣款' },
  { value: 'unionpay', label: '银联卡', desc: '支持各大银行卡' },
  { value: 'mock', label: '模拟支付', desc: '演示专用, 一键成功' }
]

/** GET /order/my 我的订单列表(status 可选: 1待支付/2已支付/3已发货/4已完成/5已取消, 不传=全部) */
export const getMyOrders = (userId: number, status?: number) =>
  http.get<Order[]>('/order/my', { userId, status })

/** PUT /order/confirm 确认收货(body {orderNo}, 需登录) */
export const confirmOrder = (orderNo: string) =>
  http.put<null>('/order/confirm', { orderNo })

/** GET /order/{id} 订单详情 */
export const getOrderDetail = (id: number) =>
  http.get<Order>(`/order/${id}`)

/** 订单状态 → 文案 */
export const orderStatusText: Record<number, string> = {
  1: '待支付',
  2: '已支付',
  3: '已发货',
  4: '已签收',
  5: '已取消'
}

/** 订单状态 → el-tag 类型(颜色) */
export const orderStatusType: Record<number, 'warning' | 'success' | 'primary' | 'info' | 'danger'> = {
  1: 'warning',
  2: 'success',
  3: 'primary',
  4: 'success',
  5: 'info'
}

// ==================== 商家卖出订单 ====================

/** 商家卖出订单-商品明细(订单快照 + 物流信息) */
export interface MerchantSoldItem {
  itemId: number
  productId: number
  productName: string
  productImage: string
  price: number
  count: number
  subtotal: number
  /** 物流状态: 0-待发货 1-已发货 2-已送达 */
  logisticsStatus: number
  shipTime: string | null
  deliveryTime: string | null
}

/** 商家卖出订单(一行 = 一个订单组, items 为当前商家在该订单中的明细) */
export interface MerchantSoldOrder {
  orderId: number
  orderNo: string
  createTime: string
  orderStatus: number
  payTime: string | null
  receiverName: string | null
  receiverPhone: string | null
  receiverAddr: string | null
  totalAmount: number
  items: MerchantSoldItem[]
}

/** 商家经营统计 */
export interface MerchantStats {
  /** 总销售额(已支付订单商品金额合计) */
  totalSales: number
  /** 卖出商品总件数 */
  soldItemCount: number
  /** 待发货明细数 */
  pendingShipCount: number
  /** 已支付订单数 */
  paidOrderCount: number
}

/** GET /order/merchant/sold 商家卖出订单(按明细分页, 同一订单多明细合并) */
export const getSoldOrders = (page = 1, size = 10) =>
  http.get<PageData<MerchantSoldOrder>>('/order/merchant/sold', { page, size })

/** PUT /order/merchant/item/{id}/ship 商家发货(明细 待发货→已发货) */
export const shipOrderItem = (itemId: number) =>
  http.put<null>(`/order/merchant/item/${itemId}/ship`)

/** PUT /order/merchant/item/{id}/deliver 商家确认送达(明细 已发货→已送达) */
export const deliverOrderItem = (itemId: number) =>
  http.put<null>(`/order/merchant/item/${itemId}/deliver`)

/** GET /order/merchant/stats 商家经营统计 */
export const getMerchantStats = () => http.get<MerchantStats>('/order/merchant/stats')

/** 物流状态 → 文案 */
export const logisticsStatusText: Record<number, string> = {
  0: '待发货',
  1: '已发货',
  2: '已送达'
}

/** 物流状态 → el-tag 类型(圆点 tag 颜色: 待发货 warning / 已发货 primary / 已送达 success) */
export const logisticsStatusType: Record<number, 'warning' | 'primary' | 'success'> = {
  0: 'warning',
  1: 'primary',
  2: 'success'
}
