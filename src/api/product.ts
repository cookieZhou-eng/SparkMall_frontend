import { http } from './request'

/** 商品分类(树形,一级分类 parentId = 0) */
export interface Category {
  id: number
  parentId: number
  name: string
  sort: number
  icon: string
  status: number
  children: Category[]
}

/** 商品 */
export interface Product {
  id: number
  categoryId: number
  name: string
  subtitle: string
  mainImage: string
  price: number
  originalPrice: number
  sales: number
  status: number
  /** 商家 id(商品详情返回,用于展示店铺信息) */
  merchantId?: number
}

/** 商家端商品(含下架商品,可能带库存/详情图) */
export interface MerchantProduct {
  id: number
  categoryId: number
  name: string
  subtitle: string
  mainImage: string
  price: number
  originalPrice: number
  sales: number
  /** 1 上架 / 0 下架 */
  status: number
  stock?: number
  detailImages?: string
}

/** 商家新增/编辑商品请求参数 */
export interface MerchantProductParams {
  name: string
  subtitle: string
  categoryId: number
  price: number
  originalPrice: number
  mainImage: string
  detailImages: string
  stock?: number
}

/** 分页返回数据 */
export interface PageData<T> {
  total: number
  records: T[]
}

/** 商品列表排序方式: 不传按最新 */
export type ProductSort = 'sales' | 'priceAsc' | 'priceDesc'

/** 商品列表查询参数 */
export interface ProductQuery {
  categoryId?: number
  /** 搜索关键词: 商品名称/副标题模糊匹配 */
  keyword?: string
  /** 排序: sales 销量 / priceAsc 价格升序 / priceDesc 价格降序 / 不传按最新 */
  sort?: ProductSort
  page: number
  size: number
}

/** GET /product/categories 获取分类树 */
export const getCategories = () => http.get<Category[]>('/product/categories')

/** GET /product/list 分页查询商品列表 */
export const getProductList = (query: ProductQuery) =>
  http.get<PageData<Product>>('/product/list', query)

/** GET /product/{id} 获取商品详情 */
export const getProductDetail = (id: number) =>
  http.get<Product>(`/product/${id}`)

/** GET /product/merchant/{id} 按商家查上架商品(商家主页, 创建时间倒序) */
export const getProductsByMerchant = (id: number) =>
  http.get<Product[]>(`/product/merchant/${id}`)

/** GET /merchant/product/list 商家商品列表(含下架商品,需商家登录), 返回分页数据(total/records) */
export const getMerchantProductList = () =>
  http.get<PageData<MerchantProduct>>('/merchant/product/list')

/** POST /merchant/product 商家新增商品 */
export const addMerchantProduct = (data: MerchantProductParams) =>
  http.post<null>('/merchant/product', data)

/** PUT /merchant/product 商家编辑商品 */
export const updateMerchantProduct = (data: MerchantProductParams & { id: number }) =>
  http.put<null>('/merchant/product', data)

/** PUT /merchant/product/{id}/status 商家上架/下架商品 */
export const updateMerchantProductStatus = (id: number, status: 0 | 1) =>
  http.put<null>(`/merchant/product/${id}/status`, { status })

/** DELETE /merchant/product/{id} 商家删除商品 */
export const deleteMerchantProduct = (id: number) =>
  http.delete<null>(`/merchant/product/${id}`)
