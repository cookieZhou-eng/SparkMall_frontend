<template>
  <div class="page">
    <h2 class="title">退款 / 售后</h2>

    <el-card shadow="never">
      <el-table :data="records" v-loading="loading" stripe>
        <el-table-column prop="refundNo" label="退款单号" min-width="190" />
        <el-table-column label="订单号" min-width="190">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/order/${row.orderId}`)">
              {{ row.orderNo }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{ refundTypeText[row.type] || '-' }}</template>
        </el-table-column>
        <el-table-column label="退款金额" width="120">
          <template #default="{ row }">¥{{ Number(row.amount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="refundStatusType[row.status] || 'info'" size="small">
              {{ refundStatusText[row.status] || '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="退款原因" min-width="150" show-overflow-tooltip />
        <el-table-column label="申请时间" width="170">
          <template #default="{ row }">{{ formatTime(row.applyTime) }}</template>
        </el-table-column>
        <el-table-column label="审核备注" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.auditRemark || '-' }}</template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pager"
        layout="total, prev, pager, next"
        :total="total"
        :page-size="size"
        :current-page="page"
        @current-change="onPageChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getMyRefunds,
  refundStatusText,
  refundStatusType,
  refundTypeText,
  type Refund
} from '@/api/refund'

const router = useRouter()
const records = ref<Refund[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await getMyRefunds(page.value, size.value)
    records.value = data.records
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function onPageChange(value: number) {
  page.value = value
  load()
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
.title {
  margin: 0;
  font-size: 20px;
  color: var(--text-1);
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
