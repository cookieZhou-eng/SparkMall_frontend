/**
 * 购物车工具(后端化版本)。
 *
 * 数据统一存到 order-service 的 t_cart 表, 这里保留原来的函数名,
 * 让 ProductCard / ProductDetail / OrderList / Cart 的调用方式尽量少改。
 * 注意所有函数都变成异步, 调用方需要 await。
 */
import {
  addCart,
  checkAllCart,
  clearCart,
  getCartList,
  getCartCountApi,
  updateCart,
  removeCart,
  type CartItemVO
} from '@/api/cart'

/** 前端展示用购物车行(quantity 保持旧字段名, 减少页面改动) */
export interface CartItem {
  /** 购物车行ID(更新/删除用) */
  id: number
  /** 商品ID(下单/加购用) */
  productId: number
  name: string
  mainImage: string
  price: number
  quantity: number
  checked: number
  stock: number
  valid: boolean
}

/** 加购入参: 只需要商品ID, 其余字段可选(兼容旧调用方传完整商品对象) */
export interface AddCartProduct {
  id: number
  name?: string
  mainImage?: string
  price?: number
}

function toCartItem(vo: CartItemVO): CartItem {
  return {
    id: vo.id,
    productId: vo.productId,
    name: vo.name,
    mainImage: vo.mainImage,
    price: vo.price,
    quantity: vo.count,
    checked: vo.checked,
    stock: vo.stock,
    valid: vo.valid
  }
}

/** 读取购物车(未登录/接口异常时返回空数组, 不阻断页面渲染) */
export async function getCart(): Promise<CartItem[]> {
  try {
    const list = await getCartList()
    return (list || []).map(toCartItem)
  } catch {
    return []
  }
}

/** 购物车商品数量(角标用) */
export async function getCartCount(): Promise<number> {
  try {
    return (await getCartCountApi()) || 0
  } catch {
    return 0
  }
}

/**
 * 加入购物车: 后端已存在则数量累加, 并校验上架状态与库存。
 * product 只取商品ID, 其它字段仅用于兼容旧调用方。
 */
export async function addToCart(product: AddCartProduct, quantity = 1): Promise<void> {
  await addCart({ productId: product.id, count: quantity })
}

/** 更新数量 */
export async function updateCartItemCount(id: number, count: number): Promise<void> {
  await updateCart(id, { count })
}

/** 更新勾选状态 */
export async function updateCartItemChecked(id: number, checked: boolean): Promise<void> {
  await updateCart(id, { checked: checked ? 1 : 0 })
}

/** 删除单行 */
export async function deleteCartItem(id: number): Promise<void> {
  await removeCart(id)
}

/** 全选 / 取消全选 */
export async function checkAll(checked: boolean): Promise<void> {
  await checkAllCart(checked ? 1 : 0)
}

/**
 * 批量移除购物车商品(按商品 id, 用于结算成功后只清掉已下单的商品)
 */
export async function removeCartItems(ids: number[]): Promise<void> {
  if (!ids.length) return
  await clearCart(ids)
}
