<template>
  <div class="page">
    <el-row :gutter="16">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">用户总数</div>
          <div class="stat-value">{{ userStats.totalUsers ?? 0 }}</div>
          <div class="stat-extra">顾客 {{ userStats.customers ?? 0 }} · 商家 {{ userStats.merchants ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">商品总数</div>
          <div class="stat-value">{{ productStats.totalProducts ?? 0 }}</div>
          <div class="stat-extra">上架 {{ productStats.onShelfProducts ?? 0 }} · 下架 {{ productStats.offShelfProducts ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">订单总数</div>
          <div class="stat-value">{{ orderStats.totalOrders ?? 0 }}</div>
          <div class="stat-extra">今日 {{ orderStats.todayOrders ?? 0 }} 单</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">成交总额 (GMV)</div>
          <div class="stat-value accent">{{ money(orderStats.totalAmount) }}</div>
          <div class="stat-extra">今日 {{ money(orderStats.todayAmount) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="orderStats.pendingRefunds" shadow="never" class="section">
      <div class="refund-tip">
        <span>有 <b>{{ orderStats.pendingRefunds }}</b> 笔退款申请待审核</span>
        <el-button link type="primary" @click="router.push('/admin/refunds')">去处理</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="section">
      <template #header>
        <div class="card-header">
          <span>订单状态分布</span>
          <el-button link type="primary" @click="load">刷新</el-button>
        </div>
      </template>
      <div class="status-grid">
        <div v-for="item in statusItems" :key="item.key" class="status-item">
          <div class="status-dot" :style="{ background: item.color }"></div>
          <div class="status-text">{{ item.label }}</div>
          <div class="status-count">{{ orderStats[item.key] ?? 0 }}</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  adminDashboard,
  adminProductCount,
  adminUserCount
} from '@/api/admin'

const router = useRouter()

const userStats = ref<Record<string, number>>({})
const productStats = ref<Record<string, number>>({})
const orderStats = ref<Record<string, number>>({})

const statusItems = computed(() => [
  { key: 'pendingPayment', label: '待支付', color: '#e6a23c' },
  { key: 'pendingShip', label: '待发货', color: '#67c23a' },
  { key: 'shipped', label: '已发货', color: '#409eff' },
  { key: 'completed', label: '已完成', color: '#67c23a' },
  { key: 'cancelled', label: '已取消', color: '#909399' },
  { key: 'refunded', label: '已退款', color: '#f56c6c' }
])

function money(value: number | undefined) {
  return '¥' + Number(value ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function load() {
  const [users, products, orders] = await Promise.all([
    adminUserCount(),
    adminProductCount(),
    adminDashboard()
  ])
  userStats.value = users
  productStats.value = products
  orderStats.value = orders
}

onMounted(load)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stat-card {
  border-radius: 10px;
}
.stat-label {
  color: #909399;
  font-size: 13px;
}
.stat-value {
  font-size: 30px;
  font-weight: 700;
  color: #303133;
  margin: 8px 0 6px;
}
.stat-value.accent {
  color: #e65100;
}
.stat-extra {
  color: #909399;
  font-size: 12px;
}
.section {
  border-radius: 10px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}
.refund-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #606266;
  font-size: 14px;
}
.refund-tip b {
  color: #e65100;
  font-size: 18px;
}
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}
.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #fafafa;
  border-radius: 8px;
}
.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.status-text {
  flex: 1;
  color: #606266;
  font-size: 14px;
}
.status-count {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}
</style>
