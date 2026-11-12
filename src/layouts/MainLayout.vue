<template>
  <el-container class="layout">
    <el-header class="header">
      <div class="header-inner">
        <div class="logo" @click="router.push('/home')">
          <span class="logo-mark">星</span>
          <span>星火商城</span>
        </div>

        <!-- 全局搜索入口: 回车/点搜索按钮跳搜索结果页(区分商品/商家) -->
        <el-input
          v-model="searchKeyword"
          class="header-search"
          placeholder="搜索商品 / 商家"
          clearable
          @keyup.enter="goSearch"
        >
          <template #append>
            <el-button :icon="Search" aria-label="搜索" @click="goSearch" />
          </template>
        </el-input>

        <el-menu
          mode="horizontal"
          :default-active="activeMenu"
          class="nav-menu"
          :ellipsis="false"
          router
        >
          <el-menu-item index="/home">首页</el-menu-item>
          <el-menu-item index="/seckill">限时秒杀</el-menu-item>
          <el-menu-item index="/cart" class="cart-menu">
            购物车
            <el-badge
              v-if="cartCount > 0"
              :value="cartCount"
              :max="99"
              class="cart-badge"
            />
          </el-menu-item>
          <el-menu-item index="/orders" class="badge-menu">
            <span>我的订单</span>
            <el-badge v-if="orderBadge > 0" :value="orderBadge" :max="99" class="nav-badge" />
          </el-menu-item>
          <el-menu-item index="/address">收货地址</el-menu-item>
          <el-menu-item v-if="userStore.isMerchant" index="/merchant" class="badge-menu">
            <span>商家中心</span>
            <el-badge v-if="merchantBadge > 0" :value="merchantBadge" :max="99" class="nav-badge" />
          </el-menu-item>
        </el-menu>

        <div class="user-area">
          <template v-if="userStore.isLoggedIn">
            <el-dropdown @command="onCommand">
              <span class="user-trigger">
                <el-avatar :src="resolveImageUrl(userStore.userInfo?.avatar) || undefined" :size="32">
                  {{ avatarText }}
                </el-avatar>
                <span class="nickname">{{ userStore.userInfo?.nickname || userStore.userInfo?.username || '用户' }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="switch">切换账号</el-dropdown-item>
                  <el-dropdown-item command="refunds">退款/售后</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <el-button v-else type="primary" @click="router.push('/login')">登录</el-button>
        </div>
      </div>
    </el-header>

    <el-main class="main">
      <div class="container">
        <router-view />
      </div>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, Search } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { resolveImageUrl } from '@/api/upload'
import { getCartCount } from '@/utils/cart'
import { getMyOrders, getMerchantStats } from '@/api/order'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const searchKeyword = ref('')
const cartCount = ref(0)
/** 我的订单角标: 待付款 + 待发货 + 待收货 的订单数 */
const orderBadge = ref(0)
/** 商家中心角标: 待发货明细数 */
const merchantBadge = ref(0)

/** 购物车角标: 未登录不请求(否则 401 会触发跳登录); 路由变化后刷新 */
async function refreshCartCount() {
  if (!userStore.isLoggedIn) {
    cartCount.value = 0
    return
  }
  cartCount.value = await getCartCount()
}

/** 订单类角标: 路由变化时刷新, 保证下单/支付/发货后回到任意页都能看到最新数量 */
async function refreshOrderBadges() {
  if (!userStore.isLoggedIn || !userStore.userInfo?.id) {
    orderBadge.value = 0
    merchantBadge.value = 0
    return
  }
  try {
    const [orders, stats] = await Promise.all([
      getMyOrders(userStore.userInfo.id),
      userStore.isMerchant ? getMerchantStats() : Promise.resolve(null)
    ])
    orderBadge.value = orders.filter((o) => [1, 2, 3].includes(o.status)).length
    merchantBadge.value = stats?.pendingShipCount ?? 0
  } catch {
    // 角标失败不打断页面主流程
  }
}

watch(() => route.fullPath, refreshCartCount)
watch(() => route.fullPath, refreshOrderBadges)
watch(() => userStore.isLoggedIn, refreshCartCount)
watch(() => userStore.isLoggedIn, refreshOrderBadges)

/** 跳转搜索结果页(区分商品/商家 tab) */
function goSearch() {
  const kw = searchKeyword.value.trim()
  router.push({ path: '/search', query: kw ? { keyword: kw } : {} })
}

// 高亮当前菜单项
const activeMenu = computed(() => route.path)

// 头像占位文字(无图片时显示昵称首字)
const avatarText = computed(() => {
  const name = userStore.userInfo?.nickname || userStore.userInfo?.username || 'U'
  return name.charAt(0).toUpperCase()
})

// 已登录但本地无用户信息时,拉取一次(刷新场景)
onMounted(async () => {
  if (userStore.isLoggedIn && !userStore.userInfo) {
    try {
      await userStore.fetchUserInfo()
    } catch {
      // 拉取失败(token 失效等)由响应拦截器统一处理
    }
  }
  refreshCartCount()
  refreshOrderBadges()
})

// el-dropdown 的 command 事件载荷类型为 string | number | object
function onCommand(cmd: string | number | object) {
  const command = String(cmd)
  if (command === 'logout') {
    userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'switch') {
    router.push('/switch-account')
  } else if (command === 'refunds') {
    router.push('/refunds')
  }
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
}
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0;
  background: var(--bg-card);
  border-bottom: 1px solid #eceef1;
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 19px;
  font-weight: 700;
  color: var(--text-1);
  cursor: pointer;
  white-space: nowrap;
  margin-right: 24px;
  transition: opacity var(--transition-base);
}
.logo:hover {
  opacity: 0.85;
}
/* 文字标识代替 emoji, 更接近真实商城的品牌 logo */
.logo-mark {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--brand-primary);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}
.header-search {
  width: 260px;
  margin-right: 20px;
  flex-shrink: 0;
}
.nav-menu {
  flex: 1;
  border-bottom: none;
}
/* 导航项: hover 浅色底 + 激活主色下划线 */
.nav-menu :deep(.el-menu-item) {
  border-radius: 8px 8px 0 0;
  margin: 0 2px;
  transition: color var(--transition-base), background-color var(--transition-base);
}
.nav-menu :deep(.el-menu-item:hover) {
  background-color: var(--brand-primary-bg);
}
.nav-menu :deep(.el-menu-item.is-active) {
  border-bottom: 2px solid var(--brand-primary);
}
.cart-menu {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.cart-badge {
  margin-left: 2px;
}
.cart-badge :deep(.el-badge__content) {
  transform: translateY(-10px);
}
/* 导航角标: 订单/商家中心, 用小号红点数字, 不撑高菜单 */
.badge-menu {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.nav-badge {
  display: inline-flex;
  align-items: center;
}
.nav-badge :deep(.el-badge__content) {
  position: static;
  transform: none;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  background: var(--brand-danger);
}
.user-area {
  display: flex;
  align-items: center;
}
.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
  padding: 4px 8px;
  border-radius: 999px;
  transition: background-color var(--transition-base);
}
.user-trigger:hover {
  background-color: var(--bg-soft);
}
/* 头像圆形 + 悬浮描边阴影 */
.user-trigger :deep(.el-avatar) {
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(255, 107, 53, 0.35);
  transition: box-shadow var(--transition-base), transform var(--transition-base);
}
.user-trigger:hover :deep(.el-avatar) {
  box-shadow: 0 2px 10px rgba(255, 107, 53, 0.4);
  transform: translateY(-1px);
}
.nickname {
  font-size: 14px;
  color: var(--text-1);
}
.main {
  padding: 24px 0 40px;
}
</style>
