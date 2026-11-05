<template>
  <div class="orders">
    <h2 class="title">📦 我的订单</h2>

    <!-- 状态筛选: 切换时带 status 参数重新请求(1/2/3/4/5, 全部不传) -->
    <el-tabs v-model="activeStatus" class="status-tabs" @tab-change="onStatusChange">
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane label="待付款" name="1" />
      <el-tab-pane label="待发货" name="2" />
      <el-tab-pane label="待收货" name="3" />
      <el-tab-pane label="已完成" name="4" />
      <el-tab-pane label="已取消" name="5" />
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
            ⏳ {{ format(remaining[o.id] ?? 0) }}
          </span>
          <el-tag :type="orderStatusType[o.status]" size="small" class="status-tag">
            {{ orderStatusText[o.status] }}
          </el-tag>
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
            <el-image :src="item.productImage" fit="cover" class="thumb" lazy>
              <template #error>
                <div class="thumb-fallback">🎁</div>
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
            <!-- 已支付订单: 查看物流时间线 -->
            <el-button
              v-if="o.status !== 1 && o.status !== 5"
              type="success"
              link
              @click="openLogistics(o)"
            >查看物流</el-button>
            <!-- 待支付订单: 提供 去支付(模拟) 与 取消订单 -->
            <template v-if="o.status === 1">
              <el-button type="warning" link @click="goPay(o)">去支付</el-button>
              <el-button type="danger" link @click="confirmCancel(o)">取消</el-button>
            </template>
            <!-- 已发货(status=3): 确认收货 -->
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
    <el-dialog v-model="logVisible" title="🚚 物流跟踪" width="520px" @closed="stopLogPolling">
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
import { useRouter } from 'vue-router'
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
import { useCountdown } from '@/composables/useCountdown'
import PaymentDialog from '@/components/PaymentDialog.vue'
import { addToCart } from '@/utils/cart'

const router = useRouter()
const userStore = useUserStore()
const orders = ref<Order[]>([])

/** 当前状态筛选: 'all' 或后端状态值 1/2/3/4/5 */
const activeStatus = ref<string>('all')

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

/** 再次购买: 按原购买数量加入购物车并跳转购物车 */
function buyAgain(item: Order['items'][number]) {
  addToCart(
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
}

/** 去支付: 打开支付弹窗(直接进入支付步骤, 选支付方式模拟支付) */
function goPay(order: any) {
  payingOrder.value = order
  payVisible.value = true
}

/** 取消待支付订单(后端会释放锁定的库存) */
async function confirmCancel(order: any) {
  try {
    await ElMessageBox.confirm('确定取消该订单吗? 已锁定的库存将被释放。', '取消订单', {
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
    await load()
  } catch {
    // 失败提示由拦截器处理
  }
}

/** 切换状态 tab: 重新请求并回到第一页(列表目前不分页, 保留重置语义) */
function onStatusChange() {
  load()
}

async function load() {
  const userId = userStore.userInfo?.id
  if (!userId) return
  const status = activeStatus.value === 'all' ? undefined : Number(activeStatus.value)
  orders.value = await getMyOrders(userId, status)
  // 为所有待支付订单注册倒计时, 实时显示"距自动取消还有多久"
  orders.value.forEach((o) => {
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
  box-shadow: var(--shadow-card);
}
.title {
  position: relative;
  margin: 0 0 12px;
  padding-left: 12px;
  font-size: 20px;
  color: var(--text-1);
}
.title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: var(--brand-primary);
}
.status-tabs {
  margin-bottom: 8px;
}
.status-tabs :deep(.el-tabs__item) {
  font-size: 14px;
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
