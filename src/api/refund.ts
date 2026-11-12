import { http } from './request'
import type { PageData } from './product'

/** 退款售后申请 */
export interface Refund {
  id: number
  refundNo: string
  orderId: number
  orderNo: string
  userId: number
  amount: number
  /** 1-仅退款 2-退货退款 */
  type: number
  reason: string | null
  description: string | null
  /** 逗号分隔的图片地址 */
  images: string | null
  /** 1-待审核 2-已通过 3-已拒绝 4-退款中 5-已退款 */
  status: number
  auditRemark: string | null
  applyTime: string
  auditTime: string | null
  refundTime: string | null
}

/** 申请退款参数 */
export interface RefundApplyParams {
  orderId: number
  type: number
  reason?: string
  description?: string
  images?: string[]
}

/** POST /refund/apply 申请退款(需登录) */
export const applyRefund = (data: RefundApplyParams) =>
  http.post<Refund>('/refund/apply', data)

/** GET /refund/my 我的退款申请分页 */
export const getMyRefunds = (page = 1, size = 10) =>
  http.get<PageData<Refund>>('/refund/my', { page, size })

/** GET /refund/order/{orderId} 某订单的退款记录 */
export const getRefundByOrder = (orderId: number) =>
  http.get<Refund[]>(`/refund/order/${orderId}`)

/** GET /admin/refund/list 管理端退款分页 */
export const adminGetRefunds = (params: {
  page?: number
  size?: number
  status?: number
  refundNo?: string
}) => http.get<PageData<Refund>>('/admin/refund/list', params)

/** GET /admin/refund/{id} 管理端退款详情 */
export const adminGetRefundDetail = (id: number) =>
  http.get<Refund>(`/admin/refund/${id}`)

/** PUT /admin/refund/{id}/audit 管理端审核退款 */
export const adminAuditRefund = (id: number, data: { approved: boolean; remark?: string }) =>
  http.put<null>(`/admin/refund/${id}/audit`, data)

// ==================== 商家端退款审核 ====================

/** GET /order/merchant/refund/list 商家退款申请分页(只含当前商家订单的退款) */
export const merchantGetRefunds = (params: {
  page?: number
  size?: number
  status?: number
  refundNo?: string
}) => http.get<PageData<Refund>>('/order/merchant/refund/list', params)

/** GET /order/merchant/refund/{id} 商家退款详情 */
export const merchantGetRefundDetail = (id: number) =>
  http.get<Refund>(`/order/merchant/refund/${id}`)

/** PUT /order/merchant/refund/{id}/audit 商家审核退款 */
export const merchantAuditRefund = (id: number, data: { approved: boolean; remark?: string }) =>
  http.put<null>(`/order/merchant/refund/${id}/audit`, data)

/** 退款状态 → 文案 */
export const refundStatusText: Record<number, string> = {
  1: '待审核',
  2: '已通过',
  3: '已拒绝',
  4: '退款中',
  5: '已退款'
}

/** 退款状态 → el-tag 类型 */
export const refundStatusType: Record<number, 'warning' | 'success' | 'danger' | 'primary' | 'info'> = {
  1: 'warning',
  2: 'success',
  3: 'danger',
  4: 'primary',
  5: 'success'
}

/** 退款类型 → 文案 */
export const refundTypeText: Record<number, string> = {
  1: '仅退款',
  2: '退货退款'
}

/** 退款图片字段 → 数组 */
export function refundImages(images?: string | null): string[] {
  return images ? images.split(',').filter(Boolean) : []
}
