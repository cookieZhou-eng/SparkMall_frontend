<template>
  <el-container class="layout">
    <el-header class="header">
      <div class="header-inner">
        <div class="logo" @click="router.push('/home')">🔥 星火商城</div>

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
          <el-menu-item index="/cart">购物车</el-menu-item>
          <el-menu-item index="/orders">我的订单</el-menu-item>
          <el-menu-item index="/address">收货地址</el-menu-item>
          <el-menu-item v-if="userStore.isMerchant" index="/merchant">商家中心</el-menu-item>
        </el-menu>

        <div class="user-area">
          <template v-if="userStore.isLoggedIn">
            <el-dropdown @command="onCommand">
              <span class="user-trigger">
                <el-avatar :src="userStore.userInfo?.avatar || undefined" :size="32">
                  {{ avatarText }}
                </el-avatar>
                <span class="nickname">{{ userStore.userInfo?.nickname || '用户' }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
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
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, Search } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const searchKeyword = ref('')

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
  box-shadow: var(--shadow-card);
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
  font-size: 20px;
  font-weight: 700;
  color: var(--brand-primary);
  cursor: pointer;
  white-space: nowrap;
  margin-right: 24px;
  transition: opacity var(--transition-base);
}
.logo:hover {
  opacity: 0.85;
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
