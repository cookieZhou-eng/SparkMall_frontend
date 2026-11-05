/**
 * 购物车本地存储工具(演示版,数据存 localStorage,未对接后端下单接口)。
 * 抽到独立工具文件,避免 ProductCard / ProductDetail / Cart 之间重复逻辑与交叉 import。
 */

export interface CartItem {
  id: number
  name: string
  mainImage: string
  price: number
  quantity: number
}

const CART_KEY = 'spark_cart'

/** 读取购物车 */
export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]') as CartItem[]
  } catch {
    return []
  }
}

/** 保存购物车 */
export function saveCart(list: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(list))
}

/** 购物车商品数量(角标用) */
export function getCartCount(): number {
  return getCart().reduce((sum, i) => sum + i.quantity, 0)
}

/**
 * 加入购物车:已存在则数量累加,否则新增一条。
 * product 只取展示所需的最小字段集合。
 */
export function addToCart(
  product: Pick<CartItem, 'id' | 'name' | 'mainImage' | 'price'>,
  quantity = 1
): void {
  const list = getCart()
  const existing = list.find((item) => item.id === product.id)
  if (existing) {
    existing.quantity += quantity
  } else {
    list.push({ ...product, quantity })
  }
  saveCart(list)
}

/**
 * 批量移除购物车商品(按商品 id, 用于结算成功后只清掉已下单的商品)
 */
export function removeCartItems(ids: number[]): void {
  if (!ids.length) return
  const idSet = new Set(ids)
  saveCart(getCart().filter((item) => !idSet.has(item.id)))
}
