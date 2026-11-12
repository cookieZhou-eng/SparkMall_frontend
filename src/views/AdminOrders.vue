<template>
  <div class="page">
    <el-card shadow="never" class="toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="订单号">
          <el-input v-model="orderNo" placeholder="输入订单号" clearable style="width: 240px" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="用户ID">
          <el-input v-model="userIdInput" placeholder="用户ID" clearable style="width: 120px" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="status" placeholder="全部状态" clearable style="width: 140px">
            <el-option v-for="(item, key) in ORDER_STATUS_MAP" :key="key" :label="item.text" :value="Number(key)" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table :data="records" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" min-width="190" />
        <el-table-column prop="userId" label="用户ID" width="90" />
        <el-table-column label="订单金额" width="120">
          <template #default="{ row }">¥{{ Number(row.totalAmount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="totalCount" label="件数" width="80" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusMeta(row.status).type" size="small">{{ statusMeta(row.status).text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="收货人" min-width="130">
          <template #default="{ row }">{{ row.receiverName }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row as AdminOrder)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pager"
        layout="total, sizes, prev, pager, next"
        :total="total"
        :page-size="size"
        :current-page="page"
        :page-sizes="[10, 20, 50]"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" title="订单详情" width="820px">
      <div v-if="currentOrder" class="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusMeta(currentOrder.status).text }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ currentOrder.userId }}</el-descriptions-item>
          <el-descriptions-item label="订单金额">¥{{ Number(currentOrder.totalAmount).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="收货人">{{ currentOrder.receiverName }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentOrder.receiverPhone }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">{{ currentOrder.receiverAddr }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(currentOrder.createTime) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ formatTime(currentOrder.payTime) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentOrder.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="items-title">商品明细</div>
        <el-table :data="currentOrder.items || []" size="small" border>
          <el-table-column label="商品" min-width="240">
            <template #default="{ row }">
              <div class="item-cell">
                <el-image :src="resolveImageUrl(row.productImage)" fit="cover" class="item-img" />
                <span>{{ row.productName }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="单价" width="100">
            <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="count" label="数量" width="70" />
          <el-table-column label="小计" width="110">
            <template #default="{ row }">¥{{ Number(row.subtotal).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="物流" width="100">
            <template #default="{ row }">{{ logisticsText(row.logisticsStatus) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  adminOrderDetail,
  adminOrderList,
  ORDER_STATUS_MAP,
  type AdminOrder
} from '@/api/admin'
import { resolveImageUrl } from '@/api/upload'

const records = ref<AdminOrder[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const loading = ref(false)

const orderNo = ref('')
const userIdInput = ref('')
const status = ref<number | undefined>(undefined)

const dialogVisible = ref(false)
const currentOrder = ref<AdminOrder | null>(null)

async function load() {
  loading.value = true
  try {
    const userId = userIdInput.value ? Number(userIdInput.value) : undefined
    const data = await adminOrderList({
      orderNo: orderNo.value || undefined,
      userId: Number.isNaN(userId as number) ? undefined : userId,
      status: status.value,
      page: page.value,
      size: size.value
    })
    records.value = data.records
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

function reset() {
  orderNo.value = ''
  userIdInput.value = ''
  status.value = undefined
  page.value = 1
  load()
}

function onPageChange(value: number) {
  page.value = value
  load()
}

function onSizeChange(value: number) {
  size.value = value
  page.value = 1
  load()
}

async function openDetail(row: AdminOrder) {
  currentOrder.value = await adminOrderDetail(row.id)
  dialogVisible.value = true
}

function statusMeta(value: number) {
  return ORDER_STATUS_MAP[value] || { text: '未知', type: 'info' as const }
}

function logisticsText(value: number) {
  return { 0: '待发货', 1: '已发货', 2: '已送达' }[value] || '-'
}

function formatTime(value: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-'
}

onMounted(load)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.toolbar {
  border-radius: 10px;
}
.toolbar :deep(.el-form-item) {
  margin-bottom: 0;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
.items-title {
  margin: 18px 0 10px;
  font-weight: 600;
  color: #303133;
}
.item-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.item-img {
  width: 40px;
  height: 40px;
  border-radius: 4px;
}
</style>
