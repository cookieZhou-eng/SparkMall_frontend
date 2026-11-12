<template>
  <div class="orders">
    <div class="head">
      <h2 class="title">我的订单</h2>
      <p class="head-desc">查看订单状态与物流进度</p>
    </div>

    <!-- 状态筛选: 全部订单一次加载, 前端筛选并统计各状态数量(用于红点角标) -->
    <el-tabs v-model="activeStatus" class="status-tabs">
      <el-tab-pane name="all">
        <template #label><span class="tab-label">全部</span></template>
      </el-tab-pane>
      <el-tab-pane name="1">
        <template #label>
          <span class="tab-label">
            待付款<el-badge v-if="statusCount[1]" :value="statusCount[1]" class="tab-badge" />
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="2">
        <template #label>
          <span class="tab-label">
            待发货<el-badge v-if="statusCount[2]" :value="statusCount[2]" class="tab-badge" />
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="3">
        <template #label>
          <span class="tab-label">
            待收货<el-badge v-if="statusCount[3]" :value="statusCount[3]" class="tab-badge" />
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="4">
        <template #label><span class="tab-label">已完成</span></template>
      </el-tab-pane>
      <el-tab-pane name="5">
        <template #label><span class="tab-label">已取消</span></template>
      </el-tab-pane>
      <el-tab-pane name="6">
        <template #label><span class="tab-label">已退款</span></template>
      </el-tab-pane>
    </el-tabs>

    <div v-if="orders.length" class="order-list">
      <div v-for="o in orders" :key="o.id" class="order-card">
        <!-- 卡片头: 订单号 + 下单时间 + 状态 -->
        <div class="card-head">
          <span class="order-no">订单号:{{ o.orderNo }}</span>
          <span class="create-time">{{ formatTime(o.createTime) }}</span>
          <!-- 待支付订单实时显示"距自动取消"倒计时, 最后 60 秒变红提醒 -->
          <span
            v-if="o.status === 1"
            class="countdown"
            :class="{ urgent: (remaining[o.id] ?? 0) < 60 }"
          >
            {{ format(remaining[o.id] ?? 0) }}
          </span>
          <el-tag :type="orderStatusType[o.status]" size="small" class="status-tag">
            {{ orderStatusText[o.status] }}
          </el-tag>
          <!-- 售后进度: 订单本身仍是原状态, 这里额外展示最近一次退款申请状态 -->
          <el-tag
            v-if="o.refundStatus && o.status !== 6"
            :type="refundStatusType[o.refundStatus] || 'info'"
            size="small"
            effect="plain"
            class="refund-tag"
          >售后·{{ refundStatusText[o.refundStatus] }}</el-tag>
        </div>

        <!-- 商品明细(含每件商品的物流状态) -->
        <div class="card-goods">
          <div
            v-for="item in o.items"
            :key="item.id"
            class="goods-row clickable"
            title="查看商品详情"
            @click="goProduct(item)"
          >
            <el-image :src="resolveImageUrl(item.productImage)" fit="cover" class="thumb" lazy>
              <template #error>
                <div class="thumb-fallback">暂无图片</div>
              </template>
            </el-image>
            <div class="goods-info">
              <span class="gname">{{ item.productName }}</span>
              <span class="gmeta">¥{{ item.price.toFixed(2) }} × {{ item.count }}</span>
            </div>
            <el-button
              type="primary"
              link
              size="small"
              class="buy-again"
              @click.stop="buyAgain(item)"
            >再次购买</el-button>
            <!-- 已完成订单: 每件商品提供评价入口, 已评价展示标签 -->
            <el-button
              v-if="o.status === 4 && !item.reviewed"
              type="primary"
              link
              size="small"
              class="eval-btn"
              @click.stop="goReview(o, item)"
            >评价</el-button>
            <el-tag
              v-else-if="o.status === 4 && item.reviewed"
              type="success"
              size="small"
              effect="plain"
              class="eval-tag"
            >已评价</el-tag>
            <el-tag
              :type="logisticsStatusType[item.logisticsStatus ?? 0] ?? 'info'"
              size="small"
              effect="light"
              round
              class="log-tag"
            >
              <span class="status-dot" />
              {{ logisticsStatusText[item.logisticsStatus ?? 0] ?? '未知' }}
            </el-tag>
          </div>
        </div>

        <!-- 卡片底: 金额 + 操作 -->
        <div class="card-foot">
          <div class="foot-total">
            共 <b>{{ o.totalCount }}</b> 件, 合计
            <span class="amount">¥{{ o.totalAmount.toFixed(2) }}</span>
          </div>
          <div class="foot-ops">
            <el-button type="primary" link @click="goDetail(o)">详情</el-button>
            <!-- 已支付/已发货/已完成订单: 查看物流时间线(已取消/已退款不展示) -->
            <el-button
              v-if="[2, 3, 4].includes(o.status)"
              type="success"
              link
              @click="openLogistics(o)"
            >查看物流</el-button>
            <!-- 待支付订单: 提供 去支付(模拟) 与 取消订单 -->
            <template v-if="o.status === 1">
              <el-button type="warning" link @click="goPay(o)">去支付</el-button>
              <el-button type="danger" link @click="confirmCancel(o)">取消</el-button>
            </template>
            <!-- 已支付/已发货/已完成: 没有进行中的退款申请时可申请退款(退货) -->
            <el-button
              v-if="[2, 3, 4].includes(o.status) && !isRefundActive(o)"
              type="warning"
              link
              @click="goRefund(o)"
            >退款/退货</el-button>
            <!-- 有进行中的退款申请: 引导到退款记录页查看进度, 避免重复提交 -->
            <el-button
              v-else-if="isRefundActive(o)"
              type="warning"
              link
              @click="goRefundList"
            >退款进度</el-button>
            <!-- 已退款订单: 查看退款记录 -->
            <el-button v-if="o.status === 6" type="info" link @click="goRefundList">
              退款详情
            </el-button>
            <el-button
              v-if="o.status === 3"
              type="success"
              link
              @click="confirmReceive(o)"
            >确认收货</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-else description="还没有订单,快去下单吧~" />

    <!-- 待支付订单"去支付": 复用通用支付弹窗(已建单, 直接进支付步骤) -->
    <PaymentDialog
      v-model="payVisible"
      :existing-order="payingOrder"
      @paid="onPaid"
    />

    <!-- 物流时间线弹窗: 打开后每 10 秒轮询刷新, 关闭即清除定时器 -->
    <el-dialog v-model="logVisible" title="物流跟踪" width="520px" @closed="stopLogPolling">
      <template v-if="logOrder">
        <el-steps :active="logStep" align-center finish-status="success">
          <el-step title="提交订单" :description="formatTime(logOrder.createTime)" />
          <el-step title="付款" :description="formatTime(logOrder.payTime)" />
          <el-step title="商家发货" :description="shipTimeText" />
          <el-step title="确认收货" :description="deliveryTimeText" />
        </el-steps>
        <div class="log-items">
          <div v-for="item in logOrder.items" :key="item.id" class="log-item">
            <el-tag
              :type="logisticsStatusType[item.logisticsStatus ?? 0] ?? 'info'"
              size="small"
              effect="light"
              round
            >{{ logisticsStatusText[item.logisticsStatus ?? 0] ?? '未知' }}</el-tag>
            <span class="log-item-name">{{ item.productName }} x{{ item.count }}</span>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getMyOrders,
  cancelOrder,
  confirmOrder,
  getOrderDetail,
  orderStatusText,
  orderStatusType,
  logisticsStatusText,
  logisticsStatusType,
  type Order
} from '@/api/order'
import { useUserStore } from '@/stores/user'
import { resolveImageUrl } from '@/api/upload'
import { useCountdown } from '@/composables/useCountdown'
import PaymentDialog from '@/components/PaymentDialog.vue'
import { addToCart } from '@/utils/cart'
import { refundStatusText, refundStatusType } from '@/api/refund'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

/** 全部订单(一次性加载, 各状态页签在前端筛选, 同时用于角标统计) */
const allOrders = ref<Order[]>([])

/** 当前状态筛选: 'all' 或后端状态值 1/2/3/4/5(支持 ?status= 携带进入, 如个人中心概览点击) */
const activeStatus = ref<string>(
  ['all', '1', '2', '3', '4', '5', '6'].includes(String(route.query.status))
    ? String(route.query.status)
    : 'all'
)

/** 当前页签展示的订单 */
const orders = computed(() =>
  activeStatus.value === 'all'
    ? allOrders.value
    : allOrders.value.filter((o) => o.status === Number(activeStatus.value))
)

/** 各状态订单数: 待付款/待发货/待收货等页签右上角红点角标 */
const statusCount = computed<Record<number, number>>(() => {
  const count: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  allOrders.value.forEach((o) => {
    if (count[o.status] !== undefined) count[o.status]++
  })
  return count
})

// "去支付"状态: 记录要支付的待支付订单
const payingOrder = ref<Order | null>(null)
const payVisible = ref(false)

// 待支付订单倒计时: 每秒递减; 归零触发 onExpire 重新拉取(后端超时已自动取消)
const { remaining, set, start, format } = useCountdown(() => load())

function formatTime(t: string | null | undefined): string {
  return t ? t.replace('T', ' ').slice(0, 19) : '-'
}

function goDetail(order: any) {
  router.push(`/order/${order.id}`)
}

/** 点击订单中的商品: 进入对应商品详情页, 可再次选购 */
function goProduct(item: Order['items'][number]) {
  router.push(`/product/${item.productId}`)
}

/**
 * 是否有进行中的退款申请(待审核/已通过/退款中)。
 * 数据来自后端订单列表的 refundStatus 字段(一次查询批量填充), 有则不再显示"申请退款"。
 */
function isRefundActive(order: Order) {
  return order.refundStatus != null && [1, 2, 4].includes(order.refundStatus)
}

/** 申请退款: 跳转到订单详情并自动打开退款弹窗(详情页复用完整的申请/图片上传逻辑) */
function goRefund(order: Order) {
  router.push({ path: `/order/${order.id}`, query: { refund: '1' } })
}

/** 查看退款记录 */
function goRefundList() {
  router.push('/refunds')
}

/** 评价: 跳转订单详情并自动打开对应商品的评价弹窗(详情页复用上传/提交逻辑) */
function goReview(order: Order, item: Order['items'][number]) {
  router.push({ path: `/order/${order.id}`, query: { review: String(item.id) } })
}

/** 再次购买: 按原购买数量加入购物车(后端接口)并跳转购物车 */
async function buyAgain(item: Order['items'][number]) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  try {
    await addToCart(
      {
        id: item.productId,
        name: item.productName,
        mainImage: item.productImage,
        price: item.price
      },
      item.count
    )
    ElMessage.success('已加入购物车')
    router.push('/cart')
  } catch {
    // 错误提示由拦截器处理(如已下架/库存不足)
  }
}

/** 去支付: 打开支付弹窗(直接进入支付步骤, 选支付方式模拟支付) */
function goPay(order: any) {
  payingOrder.value = order
  payVisible.value = true
}

/** 取消待支付订单(后端会释放锁定的库存) */
async function confirmCancel(order: any) {
  try {
    await ElMessageBox.confirm('确定取消该订单吗?', '取消订单', {
      type: 'warning'
    })
  } catch {
    return // 用户点了取消
  }
  try {
    await cancelOrder({ orderNo: order.orderNo, userId: userStore.userInfo!.id })
    ElMessage.success('订单已取消')
    await load()
  } catch {
    // 失败提示由拦截器处理
  }
}

/** 确认收货: 仅已发货(status=3)可用, 二次确认后调用 PUT /order/confirm */
async function confirmReceive(order: any) {
  try {
    await ElMessageBox.confirm('确认已收到该订单的商品吗?', '确认收货', {
      type: 'warning'
    })
  } catch {
    return // 用户点了取消
  }
  try {
    await confirmOrder(order.orderNo)
    ElMessage.success('已确认收货')
    // 收货后订单进入"已完成", 自动切到该 tab 便于用户立即评价
    activeStatus.value = '4'
    await load()
  } catch {
    // 失败提示由拦截器处理
  }
}

async function load() {
  const userId = userStore.userInfo?.id
  if (!userId) return
  allOrders.value = await getMyOrders(userId)
  // 为所有待支付订单注册倒计时, 实时显示"距自动取消还有多久"
  allOrders.value.forEach((o) => {
    if (o.status === 1 && o.remainingSeconds != null) set(o.id, o.remainingSeconds)
  })
  start()
}

/** 支付成功后刷新订单列表 */
function onPaid() {
  load()
}

// ============ 物流跟踪弹窗(打开后每 10 秒轮询, 关闭清除定时器) ============
const logVisible = ref(false)
const logOrder = ref<Order | null>(null)
let logTimer: number | undefined

function openLogistics(order: any) {
  logOrder.value = order as Order
  logVisible.value = true
  startLogPolling()
}

/** 轮询刷新: 重拉订单详情(含明细物流字段), 失败静默保留上次数据 */
async function refreshLogOrder() {
  const current = logOrder.value
  if (!current) return
  try {
    logOrder.value = await getOrderDetail(current.id)
  } catch {
    // 静默
  }
}

function startLogPolling() {
  stopLogPolling()
  logTimer = window.setInterval(refreshLogOrder, 10000)
}

function stopLogPolling() {
  if (logTimer) {
    clearInterval(logTimer)
    logTimer = undefined
  }
}

// 组件销毁时兜底清除定时器(弹窗关闭由 @closed 处理)
onUnmounted(stopLogPolling)

/** 时间线进度: 提交(1) -> 付款(2) -> 发货(3) -> 收货(4), 按最早发货/最晚送达明细判断 */
const logStep = computed(() => {
  const o = logOrder.value
  if (!o) return 0
  if (o.items?.some((i) => i.deliveryTime)) return 4
  if (o.items?.some((i) => i.shipTime)) return 3
  if (o.status !== 1) return 2 // 已支付(非待支付/取消)
  return 1
})

/** 发货时间 = 最早发货的明细时间(多明细时取最早的) */
const shipTimeText = computed(() => {
  const times = (logOrder.value?.items ?? [])
    .map((i) => i.shipTime)
    .filter((t): t is string => !!t)
    .sort()
  return times.length ? formatTime(times[0]) : ''
})

/** 送达时间 = 最晚送达的明细时间 */
const deliveryTimeText = computed(() => {
  const times = (logOrder.value?.items ?? [])
    .map((i) => i.deliveryTime)
    .filter((t): t is string => !!t)
    .sort()
  return times.length ? formatTime(times[times.length - 1]) : ''
})

onMounted(load)
</script>

<style scoped>
.orders {
  background: var(--bg-card);
  padding: var(--space-4);
  border-radius: var(--radius-card);
  border: 1px solid #eceef1;
  box-shadow: var(--shadow-card);
}
.head {
  margin-bottom: 18px;
}
.title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-1);
}
.head-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-3);
}
.status-tabs {
  margin-bottom: 8px;
}
.status-tabs :deep(.el-tabs__item) {
  font-size: 14px;
}
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tab-badge :deep(.el-badge__content) {
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
.order-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.order-card {
  border: 1px solid #f0f1f3;
  border-radius: var(--radius-control);
  overflow: hidden;
  transition: box-shadow var(--transition-base);
}
.order-card:hover {
  box-shadow: var(--shadow-card);
}
.card-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 10px 16px;
  background: var(--bg-soft);
  font-size: 13px;
  color: var(--text-2);
}
.order-no {
  font-family: Consolas, monospace;
  color: var(--text-2);
}
.create-time {
  color: var(--text-3);
}
.countdown {
  font-family: Consolas, monospace;
  color: var(--brand-primary);
  font-weight: 700;
}
.countdown.urgent {
  color: var(--brand-danger);
  animation: blink 1s infinite;
}
.card-head .status-tag {
  margin-left: auto;
}
.card-head .refund-tag {
  margin-left: 4px;
}
.card-goods {
  padding: 8px 16px;
}
.goods-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.goods-row + .goods-row {
  border-top: 1px dashed #f0f1f3;
}
/* 商品行可点击(跳商品详情), hover 浅色底提示可交互 */
.goods-row.clickable {
  cursor: pointer;
  border-radius: 8px;
  transition: background-color var(--transition-base);
}
.goods-row.clickable:hover {
  background-color: var(--bg-soft);
}
.buy-again {
  flex-shrink: 0;
}
/* 已完成的订单: 评价入口/已评价标签不参与压缩 */
.eval-btn,
.eval-tag {
  flex-shrink: 0;
}
.thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--bg-soft);
  flex-shrink: 0;
}
.thumb-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.goods-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.gname {
  font-size: 14px;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gmeta {
  font-size: 12px;
  color: var(--text-3);
}
.log-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  border-top: 1px solid #f0f1f3;
}
.foot-total {
  font-size: 13px;
  color: var(--text-2);
}
.amount {
  color: var(--brand-primary);
  font-weight: 700;
  font-size: 16px;
}
.foot-ops {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
/* 物流弹窗明细列表 */
.log-items {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-light, #ebeef5);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.log-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.log-item-name {
  font-size: 13px;
  color: var(--text-2);
}
@keyframes blink {
  50% {
    opacity: 0.4;
  }
}
</style>
