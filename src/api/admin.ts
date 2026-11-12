import { http } from './request'

/** 分页结构 */
export interface PageData<T> {
  total: number
  records: T[]
}

/** 管理端用户 */
export interface AdminUser {
  id: number
  username: string
  nickname: string | null
  phone: string | null
  email: string | null
  avatar: string | null
  gender: number | null
  role: string
  status: number | null
  shopName: string | null
  shopDesc: string | null
  createTime: string | null
}

/** 管理端商品 */
export interface AdminProduct {
  id: number
  categoryId: number
  name: string
  subtitle: string
  mainImage: string
  price: number
  originalPrice: number
  sales: number
  status: number
  merchantId: number | null
  createTime: string
}

/** 订单明细 */
export interface AdminOrderItem {
  id: number
  productId: number
  productName: string
  productImage: string
  price: number
  count: number
  subtotal: number
  merchantId: number | null
  logisticsStatus: number
}

/** 管理端订单 */
export interface AdminOrder {
  id: number
  orderNo: string
  userId: number
  totalAmount: number
  totalCount: number
  status: number
  receiverName: string
  receiverPhone: string
  receiverAddr: string
  remark: string | null
  createTime: string
  payTime: string | null
  remainingSeconds?: number | null
  items?: AdminOrderItem[]
}

/** 订单状态文案与标签颜色 */
export const ORDER_STATUS_MAP: Record<number, { text: string; type: 'primary' | 'warning' | 'success' | 'info' | 'danger' }> = {
  1: { text: '待支付', type: 'warning' },
  2: { text: '待发货', type: 'success' },
  3: { text: '已发货', type: 'primary' },
  4: { text: '已完成', type: 'info' },
  5: { text: '已取消', type: 'danger' },
  6: { text: '已退款', type: 'danger' }
}

// ==================== 用户管理 ====================

export const adminUserList = (params: {
  keyword?: string
  roleFilter?: string
  status?: number
  page?: number
  size?: number
}) => http.get<PageData<AdminUser>>('/admin/user/list', params)

export const adminUserCount = () =>
  http.get<Record<string, number>>('/admin/user/count')

export const adminUpdateUserStatus = (id: number, status: number) =>
  http.put<null>(`/admin/user/${id}/status`, { status })

// ==================== 商品管理 ====================

export const adminProductList = (params: {
  keyword?: string
  status?: number
  page?: number
  size?: number
}) => http.get<PageData<AdminProduct>>('/admin/product/list', params)

export const adminProductCount = () =>
  http.get<Record<string, number>>('/admin/product/count')

export const adminUpdateProductStatus = (id: number, status: number) =>
  http.put<null>(`/admin/product/${id}/status`, { status })

// ==================== 订单管理 ====================

export const adminOrderList = (params: {
  status?: number
  orderNo?: string
  userId?: number
  page?: number
  size?: number
}) => http.get<PageData<AdminOrder>>('/admin/order/list', params)

export const adminDashboard = () =>
  http.get<Record<string, number>>('/admin/order/dashboard')

export const adminOrderDetail = (id: number) =>
  http.get<AdminOrder>(`/admin/order/${id}`)
