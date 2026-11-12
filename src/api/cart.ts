import { http } from './request'

/** 购物车行(后端返回, 商品信息实时来自商品服务) */
export interface CartItemVO {
  /** 购物车行ID(更新/删除用) */
  id: number
  productId: number
  name: string
  mainImage: string
  price: number
  count: number
  /** 1-勾选 0-未勾选 */
  checked: number
  /** 当前可用库存 */
  stock: number
  /** 商品是否有效(存在且上架) */
  valid: boolean
}

/** GET /cart/list 购物车列表 */
export const getCartList = () => http.get<CartItemVO[]>('/cart/list')

/** POST /cart/add 加入购物车(已存在则累加) */
export const addCart = (data: { productId: number; count?: number }) =>
  http.post<CartItemVO>('/cart/add', data)

/** PUT /cart/{id} 更新数量或勾选状态 */
export const updateCart = (id: number, data: { count?: number; checked?: number }) =>
  http.put<CartItemVO>(`/cart/${id}`, data)

/** DELETE /cart/{id} 删除单行 */
export const removeCart = (id: number) => http.delete<null>(`/cart/${id}`)

/** DELETE /cart 清空; 传 productIds 时只删指定商品 */
export const clearCart = (productIds?: number[]) =>
  http.delete<null>('/cart', {
    params: productIds && productIds.length ? { productIds: productIds.join(',') } : undefined
  })

/** PUT /cart/check-all 全选/取消全选 */
export const checkAllCart = (checked: number) =>
  http.put<null>('/cart/check-all', { checked })

/** GET /cart/count 商品总件数(角标) */
export const getCartCountApi = () => http.get<number>('/cart/count')
