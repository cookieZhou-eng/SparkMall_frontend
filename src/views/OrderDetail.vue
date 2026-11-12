<template>
  <div class="detail" v-loading="loading">
    <el-page-header content="订单详情" @back="router.back()" class="header" />

    <template v-if="order">
      <!-- 订单状态卡片 -->
      <el-card class="card status-card" shadow="never">
        <div class="status-row">
          <el-tag :type="orderStatusType[order.status]" size="large">
            {{ orderStatusText[order.status] }}
          </el-tag>
          <span class="order-no">订单号:{{ order.orderNo }}</span>
        </div>
        <div class="meta">
          <span>下单时间:{{ formatTime(order.createTime) }}</span>
        </div>
        <!-- 待支付订单: 实时显示距自动取消的倒计时, 最后 60 秒变红提醒 -->
        <div v-if="order.status === 1" class="meta countdown" :class="{ urgent: remain < 60 }">
          ⏳ 距自动取消还有 {{ format(remain) }}, 超时未支付将自动取消
        </div>
        <!-- 已支付/已发货/已完成且无进行中的退款申请: 可申请退款 -->
        <div v-if="canApplyRefund" class="refund-action">
          <el-button type="warning" plain @click="openRefund">申请退款/退货</el-button>
        </div>
      </el-card>

      <!-- 退款售后记录 -->
      <el-card v-if="refunds.length" class="card" shadow="never">
        <template #header>退款售后</template>
        <div v-for="r in refunds" :key="r.id" class="refund-row">
          <span class="refund-no">退款单号:{{ r.refundNo }}</span>
          <el-tag :type="refundStatusType[r.status]" size="small">
            {{ refundStatusText[r.status] }}
          </el-tag>
          <span>{{ refundTypeText[r.type] }}</span>
          <span>退款金额 ¥{{ Number(r.amount || 0).toFixed(2) }}</span>
          <span class="time">申请时间:{{ formatTime(r.applyTime) }}</span>
          <span v-if="r.auditRemark" class="audit">审核备注:{{ r.auditRemark }}</span>
        </div>
      </el-card>

      <!-- 收货信息 -->
      <el-card class="card" shadow="never">
        <template #header>收货信息</template>
        <div class="receiver">
          <span>{{ order.receiverName }}</span>
          <span>{{ order.receiverPhone }}</span>
          <span class="addr">{{ order.receiverAddr }}</span>
        </div>
        <div v-if="order.remark" class="remark">备注:{{ order.remark }}</div>
      </el-card>

      <!-- 商品明细(快照) -->
      <el-card class="card" shadow="never">
        <template #header>商品明细</template>
        <el-table :data="order.items" border>
          <el-table-column label="商品" min-width="300">
            <template #default="{ row }">
              <div class="prod">
                <el-image :src="resolveImageUrl(row.productImage)" fit="cover" class="thumb" lazy>
                  <template #error>
                    <div class="thumb-fallback">暂无图片</div>
                  </template>
                </el-image>
                <span class="pname">{{ row.productName }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="单价(¥)" width="120">
            <template #default="{ row }">{{ row.price.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="数量" width="90">
            <template #default="{ row }">x{{ row.count }}</template>
          </el-table-column>
          <el-table-column label="小计(¥)" width="130">
            <template #default="{ row }">
              <span class="amount">{{ row.subtotal.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <!-- 已完成订单: 每条明细可评价一次, 已评价置灰 -->
          <el-table-column v-if="order.status === 4" label="操作" width="110">
            <template #default="{ row }">
              <el-button v-if="row.reviewed" size="small" disabled>已评价</el-button>
              <el-button v-else type="primary" size="small" @click="openReview(row)">
                评价
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="total">
          合计:<span class="amount big">¥{{ order.totalAmount.toFixed(2) }}</span>
        </div>
      </el-card>
    </template>

    <!-- 评价弹窗 -->
    <el-dialog v-model="reviewVisible" title="评价商品" width="560px">
      <el-form label-width="80px">
        <el-form-item label="商品">
          <span class="review-product">{{ reviewItem?.productName }}</span>
        </el-form-item>
        <el-form-item label="评分">
          <el-rate v-model="reviewForm.rating" />
        </el-form-item>
        <el-form-item label="评价">
          <el-input
            v-model="reviewForm.content"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="说说这件商品怎么样吧~"
          />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            v-model:file-list="reviewFiles"
            list-type="picture-card"
            :auto-upload="false"
            :limit="3"
            accept="image/*"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="匿名">
          <el-switch v-model="reviewForm.anonymous" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReview">
          提交评价
        </el-button>
      </template>
    </el-dialog>

    <!-- 退款申请弹窗 -->
    <el-dialog v-model="refundVisible" title="申请退款/退货" width="560px">
      <el-form label-width="90px">
        <el-form-item label="退款类型">
          <el-radio-group v-model="refundForm.type">
            <el-radio :value="1">仅退款</el-radio>
            <el-radio :value="2">退货退款</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="退款金额">
          <span class="amount">¥{{ Number(order?.totalAmount || 0).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="退款原因">
          <el-input
            v-model="refundForm.reason"
            maxlength="255"
            placeholder="请填写退款原因(必填)"
          />
        </el-form-item>
        <el-form-item label="问题描述">
          <el-input
            v-model="refundForm.description"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="请描述遇到的问题, 便于商家快速处理"
          />
        </el-form-item>
        <el-form-item label="凭证图片">
          <el-upload
            v-model:file-list="refundFiles"
            list-type="picture-card"
            :auto-upload="false"
            :limit="3"
            accept="image/*"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitRefund">
          提交申请
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import {
  getOrderDetail,
  orderStatusText,
  orderStatusType,
  type Order,
  type OrderItem
} from '@/api/order'
import { createReview } from '@/api/review'
import {
  applyRefund,
  getRefundByOrder,
  refundStatusText,
  refundStatusType,
  refundTypeText,
  type Refund
} from '@/api/refund'
import { uploadImage, resolveImageUrl } from '@/api/upload'
import { useCountdown } from '@/composables/useCountdown'

const route = useRoute()
const router = useRouter()
const order = ref<Order | null>(null)
const loading = ref(false)
const submitting = ref(false)

// 待支付订单倒计时: 每秒递减; 归零触发重载(后端超时已自动取消)
const { remaining, set, start, format } = useCountdown(() => reload())
const remain = computed(() => (order.value ? (remaining[order.value.id] ?? 0) : 0))

function formatTime(t?: string | null): string {
  return t ? t.replace('T', ' ').slice(0, 19) : '-'
}

/** 拉取订单详情并注册倒计时 */
async function reload() {
  order.value = await getOrderDetail(Number(route.params.id))
  if (order.value?.status === 1 && order.value.remainingSeconds != null) {
    set(order.value.id, order.value.remainingSeconds)
  }
  start()
  // 必须先拿到退款记录, 才能判断是否已有进行中的申请
  await loadRefunds()
  maybeOpenRefundFromQuery()
  maybeOpenReviewFromQuery()
}

// ==================== 评价 ====================
const reviewVisible = ref(false)
const reviewItem = ref<OrderItem | null>(null)
const reviewFiles = ref<any[]>([])
const reviewForm = ref({ rating: 5, content: '', anonymous: false })

/** 打开某条明细的评价弹窗; 若该订单已有评价则视为已评价(按钮已置灰) */
function openReview(item: any) {
  reviewItem.value = item
  reviewForm.value = { rating: 5, content: '', anonymous: false }
  reviewFiles.value = []
  reviewVisible.value = true
}

async function submitReview() {
  if (!reviewItem.value) return
  if (!reviewForm.value.rating) {
    ElMessage.warning('请选择评分')
    return
  }
  submitting.value = true
  try {
    const images: string[] = []
    for (const file of reviewFiles.value) {
      if (file.raw) {
        images.push(await uploadImage(file.raw))
      }
    }
    await createReview({
      orderItemId: reviewItem.value.id,
      rating: reviewForm.value.rating,
      content: reviewForm.value.content,
      images,
      anonymous: reviewForm.value.anonymous
    })
    ElMessage.success('评价成功')
    reviewVisible.value = false
    await reload()
  } catch {
    // 错误提示由拦截器处理
  } finally {
    submitting.value = false
  }
}

// ==================== 退款售后 ====================
const refunds = ref<Refund[]>([])
const refundVisible = ref(false)
const refundFiles = ref<any[]>([])
const refundForm = ref({ type: 1, reason: '', description: '' })

/** 进行中的退款申请(待审核/已通过/退款中), 有任意一条时不允许重复申请 */
const activeRefund = computed(() =>
  refunds.value.find((r) => [1, 2, 4].includes(r.status))
)
/** 已支付/已发货/已完成且没有进行中的退款申请时, 才显示"申请退款" */
const canApplyRefund = computed(() => {
  if (!order.value) return false
  return [2, 3, 4].includes(order.value.status) && !activeRefund.value
})

async function loadRefunds() {
  if (!order.value) return
  try {
    refunds.value = await getRefundByOrder(order.value.id)
  } catch {
    refunds.value = []
  }
}

function openRefund() {
  // 未发货(状态2)默认"仅退款"; 已发货/已完成默认"退货退款"
  const defaultType = order.value && order.value.status >= 3 ? 2 : 1
  refundForm.value = { type: defaultType, reason: '', description: '' }
  refundFiles.value = []
  refundVisible.value = true
}

// 从订单列表点"申请退款"跳转过来时(query.refund=1), 自动打开退款弹窗
const autoRefundChecked = ref(false)
function maybeOpenRefundFromQuery() {
  if (autoRefundChecked.value || route.query.refund !== '1') return
  autoRefundChecked.value = true
  if (canApplyRefund.value) {
    openRefund()
  } else {
    ElMessage.info('当前订单不可申请退款, 或已有进行中的退款申请')
  }
}

// 从订单列表点"评价"跳转过来时(query.review=明细id), 自动打开对应商品的评价弹窗
const autoReviewChecked = ref(false)
function maybeOpenReviewFromQuery() {
  if (autoReviewChecked.value || !route.query.review || !order.value) return
  autoReviewChecked.value = true
  if (order.value.status !== 4) {
    ElMessage.info('订单完成后才能评价')
    return
  }
  const itemId = Number(route.query.review)
  const item: any = order.value.items.find((i) => i.id === itemId)
  if (!item) return
  if (item.reviewed) {
    ElMessage.info('该商品已评价')
    return
  }
  openReview(item)
}

async function submitRefund() {
  if (!order.value) return
  if (!refundForm.value.reason.trim()) {
    ElMessage.warning('请填写退款原因')
    return
  }
  submitting.value = true
  try {
    const images: string[] = []
    for (const file of refundFiles.value) {
      if (file.raw) {
        images.push(await uploadImage(file.raw))
      }
    }
    await applyRefund({
      orderId: order.value.id,
      type: refundForm.value.type,
      reason: refundForm.value.reason,
      description: refundForm.value.description,
      images
    })
    ElMessage.success('退款申请已提交, 请等待商家审核')
    refundVisible.value = false
    await loadRefunds()
  } catch {
    // 错误提示由拦截器处理
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await reload()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.detail {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
}
.header {
  margin-bottom: 16px;
}
.card {
  margin-bottom: 16px;
  border-radius: 8px;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.order-no {
  font-family: Consolas, monospace;
  color: #666;
}
.meta {
  margin-top: 8px;
  color: #999;
  font-size: 13px;
}
.countdown {
  font-family: Consolas, monospace;
  font-weight: 700;
  color: var(--spark-primary);
}
.countdown.urgent {
  color: #f56c6c;
  animation: blink 1s infinite;
}
@keyframes blink {
  50% {
    opacity: 0.4;
  }
}
.refund-action {
  margin-top: 12px;
}
.refund-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #666;
  padding: 6px 0;
}
.refund-row + .refund-row {
  border-top: 1px dashed #f0f1f3;
}
.refund-no {
  font-family: Consolas, monospace;
}
.time {
  color: #999;
}
.audit {
  color: #999;
}
.receiver {
  display: flex;
  gap: 24px;
  align-items: center;
}
.addr {
  color: #666;
}
.remark {
  margin-top: 8px;
  color: #999;
  font-size: 13px;
}
.prod {
  display: flex;
  align-items: center;
  gap: 12px;
}
.thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  background: #f5f5f5;
  flex-shrink: 0;
}
.thumb-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.pname {
  font-size: 14px;
}
.amount {
  color: var(--spark-primary);
  font-weight: 700;
}
.total {
  text-align: right;
  margin-top: 16px;
  font-size: 15px;
}
.big {
  font-size: 22px;
  margin-left: 6px;
}
.review-product {
  color: #666;
}
</style>
