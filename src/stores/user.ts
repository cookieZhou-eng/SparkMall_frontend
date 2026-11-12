import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  getProfile,
  login as loginApi,
  type LoginParams,
  type UserVO
} from '@/api/user'
import { getCurrent, removeAccount, saveAccount } from '@/utils/accountStore'

/**
 * 用户状态:token + 用户信息(含 role 角色)。
 * 使用 setup 风格 store,并通过手动读写 localStorage 实现持久化(避免引入额外持久化插件)。
 */
export const useUserStore = defineStore('user', () => {
  // 初始化时从 localStorage 恢复,实现"刷新不掉登录"
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<UserVO | null>(
    parseJSON<UserVO>(localStorage.getItem('userInfo'))
  )

  const isLoggedIn = computed(() => !!token.value)
  /** 是否商家角色(菜单/路由守卫用) */
  const isMerchant = computed(() => userInfo.value?.role === 'merchant')
  /** 是否管理员角色(后台入口/路由守卫用) */
  const isAdmin = computed(() => userInfo.value?.role === 'admin')

  /** 登录:调接口拿 token,持久化,并拉取完整用户信息(含 role) */
  async function login(params: LoginParams) {
    const res = await loginApi(params)
    token.value = res.token
    localStorage.setItem('token', res.token)
    // token 已写入 localStorage,后续请求拦截器会自动带上
    const info = await fetchUserInfo()
    // 保存到多账号列表,便于免退出直接切换账号
    saveAccount({
      userId: info.id,
      username: info.username,
      role: info.role,
      avatar: info.avatar,
      token: res.token,
      savedAt: Date.now()
    })
    return res
  }

  /** 拉取并持久化用户信息(role 随 userInfo 一并存入 localStorage) */
  async function fetchUserInfo() {
    const info = await getProfile()
    userInfo.value = info
    localStorage.setItem('userInfo', JSON.stringify(info))
    return info
  }

  /** 退出:清空内存状态与本地存储, 并从多账号列表移除当前账号 */
  function logout() {
    const current = getCurrent()
    const currentId = current?.userId ?? userInfo.value?.id
    if (currentId != null) removeAccount(currentId)
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return { token, userInfo, isLoggedIn, isMerchant, isAdmin, login, fetchUserInfo, logout }
})

/** 安全的 JSON 解析工具,null/异常都返回 null */
function parseJSON<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}
