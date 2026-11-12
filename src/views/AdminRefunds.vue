<template>
  <div class="page">
    <el-card shadow="never" class="toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="退款单号">
          <el-input
            v-model="refundNo"
            placeholder="输入退款单号"
            clearable
            style="width: 220px"
            @keyup.enter="search"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="status" placeholder="全部状态" clearable style="width: 150px">
            <el-option
              v-for="(text, key) in refundStatusText"
              :key="key"
              :label="text"
              :value="Number(key)"
            />
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
        <el-table-column prop="refundNo" label="退款单号" min-width="190" />
        <el-table-column prop="orderNo" label="订单号" min-width="190" />
        <el-table-column prop="userId" label="用户ID" width="90" />
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
        <el-table-column label="申请时间" width="170">
          <template #default="{ row }">{{ formatTime(row.applyTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openAudit(row as Refund)">
              {{ row.status === 1 ? '审核' : '查看' }}
            </el-button>
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

    <!-- 审核弹窗 -->
    <el-dialog v-model="dialogVisible" title="退款审核" width="720px">
      <div v-if="current" class="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="退款单号">{{ current.refundNo }}</el-descriptions-item>
          <el-descriptions-item label="订单号">{{ current.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ current.userId }}</el-descriptions-item>
          <el-descriptions-item label="退款金额">
            ¥{{ Number(current.amount || 0).toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="退款类型">
            {{ refundTypeText[current.type] || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="refundStatusType[current.status] || 'info'" size="small">
              {{ refundStatusText[current.status] || '未知' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="退款原因" :span="2">
            {{ current.reason || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="问题描述" :span="2">
            {{ current.description || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatTime(current.applyTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="审核时间">
            {{ formatTime(current.auditTime) }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="currentImages.length" class="images">
          <div class="images-title">凭证图片</div>
          <div class="image-list">
            <el-image
              v-for="(img, idx) in currentImages"
              :key="img + idx"
              :src="resolveImageUrl(img)"
              fit="cover"
              class="proof-img"
              :preview-src-list="currentImages.map(resolveImageUrl)"
              :initial-index="idx"
              preview-teleported
            />
          </div>
        </div>

        <!-- 只有待审核状态才显示操作区, 其他状态仅查看 -->
        <template v-if="current.status === 1">
          <div class="audit-title">审核操作</div>
          <el-radio-group v-model="approved">
            <el-radio :value="true">通过并退款</el-radio>
            <el-radio :value="false">拒绝申请</el-radio>
          </el-radio-group>
          <el-input
            v-model="remark"
            type="textarea"
            :rows="3"
            maxlength="255"
            show-word-limit
            class="remark"
            :placeholder="approved ? '审核备注(选填)' : '请填写拒绝原因(建议填写)'"
          />
        </template>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button
          v-if="current && current.status === 1"
          type="primary"
          :loading="submitting"
          @click="submitAudit"
        >
          提交审核
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  adminAuditRefund,
  adminGetRefundDetail,
  adminGetRefunds,
  refundImages,
  refundStatusText,
  refundStatusType,
  refundTypeText,
  type Refund
} from '@/api/refund'
import { resolveImageUrl } from '@/api/upload'

const records = ref<Refund[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const loading = ref(false)

const refundNo = ref('')
const status = ref<number | undefined>(undefined)

const dialogVisible = ref(false)
const current = ref<Refund | null>(null)
const approved = ref(true)
const remark = ref('')
const submitting = ref(false)

const currentImages = computed(() => refundImages(current.value?.images))

async function load() {
  loading.value = true
  try {
    const data = await adminGetRefunds({
      refundNo: refundNo.value || undefined,
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
  refundNo.value = ''
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

async function openAudit(row: Refund) {
  current.value = await adminGetRefundDetail(row.id)
  approved.value = true
  remark.value = ''
  dialogVisible.value = true
}

async function submitAudit() {
  if (!current.value) return
  if (!approved.value && !remark.value.trim()) {
    ElMessage.warning('拒绝退款时请填写拒绝原因')
    return
  }
  if (approved.value) {
    try {
      await ElMessageBox.confirm(
        '通过后将立即退款给用户, 并将订单置为已退款, 是否继续?',
        '确认退款',
        { type: 'warning' }
      )
    } catch {
      return
    }
  }
  submitting.value = true
  try {
    await adminAuditRefund(current.value.id, {
      approved: approved.value,
      remark: remark.value
    })
    ElMessage.success(approved.value ? '退款已通过' : '已拒绝该退款申请')
    dialogVisible.value = false
    await load()
  } catch {
    // 错误提示由拦截器处理
  } finally {
    submitting.value = false
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
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
.images {
  margin-top: 16px;
}
.images-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.image-list {
  display: flex;
  gap: 10px;
}
.proof-img {
  width: 96px;
  height: 96px;
  border-radius: 6px;
  background: #f5f7fa;
  cursor: pointer;
}
.audit-title {
  margin: 18px 0 10px;
  font-weight: 600;
  color: #303133;
}
.remark {
  margin-top: 12px;
}
</style>
