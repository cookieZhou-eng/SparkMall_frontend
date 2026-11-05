import { http } from './request'

/** 收货地址 */
export interface UserAddress {
  id: number
  userId: number
  receiverName: string
  receiverPhone: string
  receiverAddr: string
  isDefault: number
  createTime: string
}

/** 新增/编辑地址表单 */
export interface AddressForm {
  id?: number
  userId?: number
  receiverName: string
  receiverPhone: string
  receiverAddr: string
}

/** GET /user/address 地址列表(默认地址排最前) */
export const getAddressList = (userId: number) =>
  http.get<UserAddress[]>('/user/address', { userId })

/** POST /user/address 新增地址 */
export const addAddress = (data: AddressForm) =>
  http.post<UserAddress>('/user/address', data)

/** PUT /user/address 修改地址 */
export const updateAddress = (data: AddressForm) =>
  http.put('/user/address', data)

/** PUT /user/address/{id}/default 设为默认 */
export const setDefaultAddress = (id: number, userId: number) =>
  http.put(`/user/address/${id}/default`, undefined, { params: { userId } })

/** DELETE /user/address/{id} 删除地址 */
export const deleteAddress = (id: number, userId: number) =>
  http.delete(`/user/address/${id}`, { params: { userId } })
