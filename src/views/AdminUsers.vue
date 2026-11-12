<template>
  <div class="page">
    <el-card shadow="never" class="toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="关键词">
          <el-input v-model="keyword" placeholder="用户名 / 昵称 / 手机号" clearable style="width: 220px" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="roleFilter" placeholder="全部角色" clearable style="width: 140px">
            <el-option label="顾客" value="customer" />
            <el-option label="商家" value="merchant" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
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
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="32" :src="resolveImageUrl(row.avatar) || undefined">{{ (row.nickname || row.username || '?').slice(0, 1) }}</el-avatar>
              <div>
                <div class="name">{{ row.nickname || row.username }}</div>
                <div class="sub">{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)" size="small">{{ roleText(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="shopName" label="店铺名" min-width="140">
          <template #default="{ row }">{{ row.shopName || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              :disabled="row.role === 'admin'"
              @change="(val: string | number | boolean) => changeStatus(row as AdminUser, val === true)"
            />
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="180">
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
  adminUpdateUserStatus,
  adminUserList,
  type AdminUser
} from '@/api/admin'
import { resolveImageUrl } from '@/api/upload'

const records = ref<AdminUser[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const loading = ref(false)

const keyword = ref('')
const roleFilter = ref<string>('')
const status = ref<number | undefined>(undefined)

async function load() {
  loading.value = true
  try {
    const data = await adminUserList({
      keyword: keyword.value || undefined,
      roleFilter: roleFilter.value || undefined,
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
  roleFilter.value = ''
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

async function changeStatus(row: AdminUser, enabled: boolean) {
  try {
    await adminUpdateUserStatus(row.id, enabled ? 1 : 0)
    row.status = enabled ? 1 : 0
    ElMessage.success(enabled ? '已启用该用户' : '已禁用该用户')
  } catch {
    // 失败提示由响应拦截器统一处理, 重新拉取保证展示与后端一致
    load()
  }
}

function roleText(role: string) {
  return { customer: '顾客', merchant: '商家', admin: '管理员' }[role] || role
}

function roleTagType(role: string) {
  return role === 'admin' ? 'danger' : role === 'merchant' ? 'warning' : 'info'
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
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
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
