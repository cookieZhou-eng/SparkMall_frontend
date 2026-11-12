<template>
  <el-container class="admin-layout">
    <el-aside width="220px" class="aside">
      <div class="brand">
        <span class="logo">🔥</span>
        <div>
          <div class="brand-name">星火商城</div>
          <div class="brand-sub">管理后台</div>
        </div>
      </div>
      <el-menu :default-active="route.path" router class="menu" background-color="#1f2d3d" text-color="#bfcbd9" active-text-color="#ffd04b">
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>数据看板</span>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/products">
          <el-icon><Goods /></el-icon>
          <span>商品管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/orders">
          <el-icon><List /></el-icon>
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/refunds">
          <el-icon><RefreshLeft /></el-icon>
          <span>退款审核</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-title">{{ route.meta.title || '管理后台' }}</div>
        <div class="header-right">
          <el-button link @click="router.push('/home')">返回商城</el-button>
          <el-dropdown @command="onCommand">
            <span class="user-trigger">
              <el-avatar :size="28">{{ avatarText }}</el-avatar>
              <span class="nickname">{{ userStore.userInfo?.nickname || '管理员' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, DataLine, Goods, List, RefreshLeft, User } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const avatarText = computed(() => {
  const name = userStore.userInfo?.nickname || userStore.userInfo?.username || '管'
  return name.slice(0, 1).toUpperCase()
})

function onCommand(command: string) {
  if (command === 'logout') {
    userStore.logout()
    router.replace('/login')
  }
}
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
}
.aside {
  background: #1f2d3d;
  display: flex;
  flex-direction: column;
}
.brand {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.logo {
  font-size: 24px;
}
.brand-name {
  font-size: 16px;
  font-weight: 700;
}
.brand-sub {
  font-size: 12px;
  color: #bfcbd9;
}
.menu {
  border-right: none;
  flex: 1;
}
.header {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.header-title {
  font-size: 17px;
  font-weight: 600;
  color: #303133;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #303133;
}
.nickname {
  font-size: 14px;
}
.main {
  background: #f5f7fa;
  padding: 20px;
}
</style>
