import { http } from './request'

/** 登录请求参数 */
export interface LoginParams {
  username: string
  password: string
}

/** 登录返回结果 */
export interface LoginResult {
  token: string
  userInfo: UserVO
}

/** 用户信息(个人中心 UserVO) */
export interface UserVO {
  id: number
  username: string
  nickname: string | null
  phone: string | null
  email: string | null
  avatar: string | null
  /** 0 保密 / 1 男 / 2 女(兼容后端返回字符串数字) */
  gender: number | string | null
  /** 角色:customer 顾客 / merchant 商家 */
  role: string
  shopName: string | null
  shopDesc: string | null
  createTime: string | null
}

/** 注册请求参数 */
export interface RegisterParams {
  username: string
  password: string
  phone: string
  role: 'customer' | 'merchant'
  shopName?: string
  shopDesc?: string
}

/** 修改资料请求参数 */
export interface UpdateProfileParams {
  nickname?: string
  email?: string
  avatar?: string
  gender?: number
  shopName?: string
  shopDesc?: string
}

/** 修改密码请求参数 */
export interface ChangePasswordParams {
  oldPassword: string
  newPassword: string
}

/** 重置密码请求参数(无需登录) */
export interface ResetPasswordParams {
  phone: string
  code: string
  newPassword: string
}

/** 商家公开信息(GET /user/merchant/{id}) */
export interface MerchantVO {
  id: number
  username: string
  shopName: string | null
  shopDesc: string | null
  avatar: string | null
  createTime: string | null
  /** 累计销售额(仅商家信息接口返回, 已支付订单商品金额合计) */
  totalSales?: number | null
  /** 累计销售量(仅商家信息接口返回, 已支付订单商品件数合计) */
  totalSalesCount?: number | null
  /** 好评率(百分比 0~100, 全部商品评价中 4~5 星占比; 无评价时为 null) */
  positiveRate?: number | null
}

/** POST /user/register 注册 */
export const register = (data: RegisterParams) =>
  http.post<null>('/user/register', data)

/** POST /user/login 登录 */
export const login = (data: LoginParams) =>
  http.post<LoginResult>('/user/login', data)

/** GET /user/profile 获取当前登录用户信息(需登录) */
export const getProfile = () => http.get<UserVO>('/user/profile')

/** PUT /user/profile 修改个人资料 */
export const updateProfile = (data: UpdateProfileParams) =>
  http.put<UserVO>('/user/profile', data)

/** PUT /user/password 修改密码(需登录) */
export const updatePassword = (data: ChangePasswordParams) =>
  http.put<null>('/user/password', data)

/** POST /user/sms/send 发送短信验证码(验证码打印在后端控制台) */
export const sendSmsCode = (phone: string) =>
  http.post<null>('/user/sms/send', { phone })

/** POST /user/password/reset 重置密码(无需登录) */
export const resetPassword = (data: ResetPasswordParams) =>
  http.post<null>('/user/password/reset', data)

/** GET /user/merchant/{id} 获取商家公开信息 */
export const getMerchantInfo = (id: number) =>
  http.get<MerchantVO>(`/user/merchant/${id}`)

/** GET /user/merchant/search 搜索商家(keyword 为空返回前 20 个商家, 便于"逛店铺") */
export const searchMerchants = (keyword?: string) =>
  http.get<MerchantVO[]>('/user/merchant/search', { keyword })

/** 已收藏商家(个人中心"收藏的商家"列表项) */
export interface FollowedMerchantVO {
  merchantId: number
  username: string
  shopName: string | null
  shopDesc: string | null
  avatar: string | null
  followTime: string | null
}

/** POST /user/follow/{merchantId} 收藏商家(幂等, 重复收藏不报错) */
export const followMerchant = (merchantId: number) =>
  http.post<null>(`/user/follow/${merchantId}`)

/** DELETE /user/follow/{merchantId} 取消收藏(幂等) */
export const unfollowMerchant = (merchantId: number) =>
  http.delete<null>(`/user/follow/${merchantId}`)

/** GET /user/follow/{merchantId}/status 是否已收藏该商家(未登录返回 false) */
export const isFollowedMerchant = (merchantId: number) =>
  http.get<boolean>(`/user/follow/${merchantId}/status`)

/** GET /user/follow/list 我的收藏商家列表(按收藏时间倒序) */
export const getFollowedMerchants = () =>
  http.get<FollowedMerchantVO[]>('/user/follow/list')
