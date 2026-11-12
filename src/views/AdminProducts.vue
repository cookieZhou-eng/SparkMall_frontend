<template>
  <div class="page">
    <el-card shadow="never" class="toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="关键词">
          <el-input v-model="keyword" placeholder="商品名称 / 副标题" clearable style="width: 220px" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="上架" :value="1" />
            <el-option label="下架" :value="0" />
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
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="商品" min-width="260">
          <template #default="{ row }">
            <div class="product-cell">
              <el-image :src="resolveImageUrl(row.mainImage)" fit="cover" class="thumb" :preview-src-list="[resolveImageUrl(row.mainImage)]" preview-teleported />
              <div>
                <div class="name">{{ row.name }}</div>
                <div class="sub">{{ row.subtitle || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="价格" width="110">
          <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="merchantId" label="商家ID" width="100">
          <template #default="{ row }">{{ row.merchantId ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="sales" label="销量" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '上架中' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              active-text="上架"
              inactive-text="下架"
              inline-prompt
              @change="(val: string | number | boolean) => changeStatus(row as AdminProduct, val === true)"
            />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  adminProductList,
  adminUpdateProductStatus,
  type AdminProduct
} from '@/api/admin'
import { resolveImageUrl } from '@/api/upload'

const records = ref<AdminProduct[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const loading = ref(false)

const keyword = ref('')
const status = ref<number | undefined>(undefined)

async function load() {
  loading.value = true
  try {
    const data = await adminProductList({
      keyword: keyword.value || undefined,
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
  keyword.value = ''
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

async function changeStatus(row: AdminProduct, onShelf: boolean) {
  try {
    await adminUpdateProductStatus(row.id, onShelf ? 1 : 0)
    row.status = onShelf ? 1 : 0
    ElMessage.success(onShelf ? '商品已上架' : '商品已下架')
  } catch {
    load()
  }
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
.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  flex-shrink: 0;
}
.name {
  font-weight: 600;
  color: #303133;
}
.sub {
  font-size: 12px;
  color: #909399;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
