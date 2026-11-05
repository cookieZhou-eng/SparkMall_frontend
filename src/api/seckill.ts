import { http } from './request'
import type { CreateOrderParams, Order } from './order'

/**
 * 秒杀相关 API。
 * 秒杀设计: 先调 buySeckill 扣减 Redis 库存判定"抢到资格", 再调 createSeckillOrder 落库下单。
 */

/** GET /seckill/stock/{id} 查询某商品实时剩余秒杀库存(读 Redis) */
export const getSeckillStock = (productId: number) =>
  http.get<number>(`/seckill/stock/${productId}`)

/** POST /seckill/buy/{id}?count= 秒杀抢购: 原子扣减 Redis 库存, 返回是否抢到资格 */
export const buySeckill = (productId: number, count = 1) =>
  http.post<boolean>(`/seckill/buy/${productId}`, undefined, { params: { count } })

/** POST /order/seckillCreate 秒杀下单(抢到资格后落库, 内部确认一人一单+DB锁定库存) */
export const createSeckillOrder = (data: CreateOrderParams) =>
  http.post<Order>('/order/seckillCreate', data)