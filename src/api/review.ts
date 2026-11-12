import { http } from './request'
import type { PageData } from './product'

/** 订单评价 */
export interface Review {
  id: number
  orderItemId: number
  orderId: number
  productId: number
  /** 匿名评价时后端会置空, 前端展示"匿名用户" */
  userId: number | null
  merchantId: number | null
  /** 1-5 星 */
  rating: number
  content: string
  /** 逗号分隔的图片地址 */
  images: string | null
  /** 是否匿名: 1-匿名 0-实名 */
  anonymous: boolean
  /** 展示用昵称(后端脱敏回填, 虚拟默认好评也带; 为空时前端兜底"已购用户") */
  username?: string | null
  createTime: string
}

/** 商品评价统计 */
export interface ReviewStats {
  avgRating: number
  total: number
}

/** 提交评价参数 */
export interface ReviewCreateParams {
  orderItemId: number
  rating: number
  content?: string
  images?: string[]
  anonymous?: boolean
}

/** POST /review 提交订单评价(需登录) */
export const createReview = (data: ReviewCreateParams) =>
  http.post<Review>('/review', data)

/** GET /review/order/{orderId} 某订单的评价(本人) */
export const getOrderReviews = (orderId: number) =>
  http.get<Review[]>(`/review/order/${orderId}`)

/** GET /review/product/{productId} 商品评价分页(公开) */
export const getProductReviews = (productId: number, page = 1, size = 10) =>
  http.get<PageData<Review>>(`/review/product/${productId}`, { page, size })

/** GET /review/product/{productId}/stats 商品评价统计(公开) */
export const getProductReviewStats = (productId: number) =>
  http.get<ReviewStats>(`/review/product/${productId}/stats`)

/** 评价图片字段 → 数组 */
export function reviewImages(images?: string | null): string[] {
  return images ? images.split(',').filter(Boolean) : []
}
