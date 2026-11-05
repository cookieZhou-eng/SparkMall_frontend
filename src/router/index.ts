import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页', requiresAuth: true }
      },
      {
        path: 'search',
        name: 'Search',
        component: () => import('@/views/Search.vue'),
        meta: { title: '搜索' }
      },
      {
        path: 'shop/:id',
        name: 'Shop',
        component: () => import('@/views/Shop.vue'),
        meta: { title: '商家主页' }
      },
      {
        path: 'seckill',
        name: 'Seckill',
        component: () => import('@/views/Seckill.vue'),
        meta: { title: '限时秒杀', requiresAuth: true }
      },
      {
        path: 'product/:id',
        name: 'ProductDetail',
        component: () => import('@/views/ProductDetail.vue'),
        meta: { title: '商品详情', requiresAuth: true }
      },
      {
        path: 'cart',
        name: 'Cart',
        component: () => import('@/views/Cart.vue'),
        meta: { title: '购物车', requiresAuth: true }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/OrderList.vue'),
        meta: { title: '我的订单', requiresAuth: true }
      },
      {
        path: 'order/:id',
        name: 'OrderDetail',
        component: () => import('@/views/OrderDetail.vue'),
        meta: { title: '订单详情', requiresAuth: true }
      },
      {
        path: 'address',
        name: 'AddressList',
        component: () => import('@/views/AddressList.vue'),
        meta: { title: '收货地址', requiresAuth: true }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人中心', requiresAuth: true }
      },
      {
        path: 'switch-account',
        name: 'SwitchAccount',
        component: () => import('@/views/SwitchAccount.vue'),
        meta: { title: '切换账号', requiresAuth: true }
      },
      {
        path: 'merchant',
        name: 'Merchant',
        component: () => import('@/views/Merchant.vue'),
        meta: { title: '商家中心', requiresAuth: true, requiresMerchant: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

/**
 * 解析 JWT payload(只解码,不验签——验签是网关/后端的职责)。
 * 前端解码仅为判断 token 是否过期,避免拿着失效 token 被放行。
 */
function parseJwtPayload(token: string): { exp?: number } | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    // base64url → base64,并补齐 padding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    // 处理中文等多字节字符,避免 atob 直接抛错
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

/** 清理本地登录态(token 与用户信息) */
function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
}

/** 从 localStorage 兜底读取用户角色(守卫中避免初始化 Pinia store 的时序问题) */
function getLocalRole(): string | null {
  try {
    const raw = localStorage.getItem('userInfo')
    if (!raw) return null
    return (JSON.parse(raw) as { role?: string }).role ?? null
  } catch {
    return null
  }
}

/**
 * token 是否有效:存在、可解析、且未过期。
 * 无效时顺手清理,避免失效 token 一直卡在本地导致"跳过登录"。
 */
function hasValidToken(): boolean {
  const token = localStorage.getItem('token')
  if (!token) return false
  const payload = parseJwtPayload(token)
  // 解析失败或缺少 exp:按无效处理(后端签发时必定带 exp)
  if (!payload || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    clearAuth()
    return false
  }
  return true
}

// 全局前置守卫:
//  1. 需登录路由(meta.requiresAuth)且 token 缺失/失效 → 跳登录页并携带 redirect
//  2. 商家路由(meta.requiresMerchant)且角色非 merchant → 回首页
//  3. 已登录用户访问登录页 → 直接回首页,避免重复登录
router.beforeEach((to, _from, next) => {
  // 这里直接读 localStorage,避免在守卫中初始化 Pinia store 的时序问题
  const valid = hasValidToken()
  if (to.meta.requiresAuth && !valid) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }
  if (to.meta.requiresMerchant && getLocalRole() !== 'merchant') {
    next({ path: '/home' })
    return
  }
  // 已登录用户访问登录页 → 直接回首页,避免重复登录;
  // 但带 add=1 时是"添加账号"场景, 需放行登录页
  if (to.path === '/login' && valid && to.query.add !== '1') {
    next({ path: '/home' })
    return
  }
  next()
})

export default router
