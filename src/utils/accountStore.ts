/**
 * 多账号本地存储(仅保存 token 与展示信息, 不保存密码)。
 * 用于"免退出直接切换账号": 最多保留最近 5 个账号, 超出淘汰最旧。
 */

/** 本地保存的账号 */
export interface SavedAccount {
  userId: number
  username: string
  /** 角色: customer 顾客 / merchant 商家 */
  role: string
  avatar: string | null
  token: string
  /** 保存时间(毫秒), 用于淘汰最旧账号 */
  savedAt: number
}

const STORAGE_KEY = 'spark_accounts'
const MAX_ACCOUNTS = 5

function isSavedAccount(v: unknown): v is SavedAccount {
  if (!v || typeof v !== 'object') return false
  const a = v as Record<string, unknown>
  return (
    typeof a.userId === 'number' &&
    typeof a.username === 'string' &&
    typeof a.role === 'string' &&
    typeof a.token === 'string' &&
    typeof a.savedAt === 'number'
  )
}

function persist(list: SavedAccount[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/** 已保存账号列表(最近保存的在前) */
export function listAccounts(): SavedAccount[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSavedAccount).sort((a, b) => b.savedAt - a.savedAt)
  } catch {
    return []
  }
}

/** 保存/更新账号(同一 userId 覆盖), 超过 5 个淘汰最旧 */
export function saveAccount(account: SavedAccount): void {
  const rest = listAccounts().filter((a) => a.userId !== account.userId)
  persist([account, ...rest].slice(0, MAX_ACCOUNTS))
}

/** 移除本地账号记录(仅本地, 不调用后端登出接口, 避免将他人 token 加入黑名单) */
export function removeAccount(userId: number): void {
  persist(listAccounts().filter((a) => a.userId !== userId))
}

/** 当前登录账号(优先按 localStorage 中的 token 匹配, 其次按 userInfo 的 id 匹配) */
export function getCurrent(): SavedAccount | null {
  const list = listAccounts()
  const token = localStorage.getItem('token')
  if (token) {
    const matched = list.find((a) => a.token === token)
    if (matched) return matched
  }
  try {
    const info = JSON.parse(localStorage.getItem('userInfo') || 'null') as { id?: number } | null
    if (info?.id) {
      const matched = list.find((a) => a.userId === info.id)
      if (matched) return matched
    }
  } catch {
    // 忽略损坏的用户信息
  }
  return null
}

/**
 * 解析 JWT payload(只解码不验签, 与路由守卫保持一致)。
 * 解析失败或缺少 exp 视为无效。
 */
function parseJwtPayload(token: string): { exp?: number } | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** token 是否已过期(解析失败或缺 exp 也算过期) */
export function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return true
  return payload.exp * 1000 <= Date.now()
}
