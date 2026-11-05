<template>
  <el-dialog
    :model-value="modelValue"
    :title="step === 'pay' ? '模拟支付' : step === 'split' ? '拆分订单支付' : '确认订单'"
    :width="step === 'pay' ? '500px' : '620px'"
    @update:model-value="onClose"
    @closed="reset"
  >
    <!-- 步骤一: 确认订单(选择收货地址 + 金额) -->
    <template v-if="step === 'confirm'">
      <!-- 有地址: 卡片网格点选, 默认选中默认地址 -->
      <div v-if="addresses.length" class="addr-section">
        <div class="addr-header">
          <span class="addr-title">选择收货地址</span>
          <el-button link type="primary" @click="router.push('/address')">管理收货地址</el-button>
        </div>
        <div class="addr-list">
          <div
            v-for="a in addresses"
            :key="a.id"
            class="addr-card"
            :class="{ selected: a.id === selectedAddressId }"
            @click="selectedAddressId = a.id"
          >
            <div class="addr-top">
              <b class="addr-name">{{ a.receiverName }}</b>
              <el-tag v-if="a.isDefault === 1" type="danger" size="small">默认</el-tag>
              <el-icon v-if="a.id === selectedAddressId" class="addr-check"><CircleCheckFilled /></el-icon>
            </div>
            <div class="addr-line"><el-icon><Phone /></el-icon><span>{{ a.receiverPhone }}</span></div>
            <div class="addr-line"><el-icon><Location /></el-icon><span class="addr-text">{{ a.receiverAddr }}</span></div>
          </div>
        </div>
      </div>
      <!-- 没有地址: 引导去添加 -->
      <el-empty v-else description="暂无收货地址,请先添加" :image-size="80">
        <el-button type="primary" @click="router.push('/address')">去添加地址</el-button>
      </el-empty>

      <el-form label-width="50px" class="remark-form">
        <el-form-item label="备注">
          <el-input v-model="remark" placeholder="选填" />
        </el-form-item>
      </el-form>

      <div class="order-summary">
        <div class="row"><span>商品件数</span><span>{{ itemCount }} 件</span></div>
        <div class="row total"><span>应付金额</span><span class="amount">¥{{ (amount ?? 0).toFixed(2) }}</span></div>
      </div>
    </template>

    <!-- 拆单步骤: 多个商家订单需分别支付 -->
    <template v-else-if="step === 'split'">
      <el-alert
        class="split-tip"
        type="info"
        :closable="false"
        show-icon
        :title="`本次按商家拆分为 ${splitOrders.length} 个订单, 不同商家的商品由不同商家发货, 需分别支付`"
      />
      <div class="split-list">
        <div
          v-for="s in splitOrders"
          :key="s.order.orderNo"
          class="split-item"
          :class="s.status"
        >
          <div class="si-main">
            <span class="order-no">{{ s.order.orderNo }}</span>
            <span class="si-count">共 {{ s.order.totalCount }} 件</span>
          </div>
          <div class="si-side">
            <span class="amount">¥{{ s.order.totalAmount.toFixed(2) }}</span>
            <el-tag size="small" :type="splitStatusType[s.status]">{{ splitStatusText[s.status] }}</el-tag>
          </div>
        </div>
      </div>

      <!-- 支付方式选择(模拟) -->
      <div class="pay-channels">
        <div
          v-for="c in payChannels"
          :key="c.value"
          class="pay-channel"
          :class="{ selected: channel === c.value }"
          @click="channel = c.value"
        >
          <div class="pc-head">
            <b>{{ c.label }}</b>
            <span class="pc-desc">{{ c.desc }}</span>
          </div>
          <el-icon v-if="channel === c.value" class="pc-check"><CircleCheckFilled /></el-icon>
        </div>
      </div>

      <div class="timeout-note">⏱️ 订单待支付 30 分钟内未支付将自动关闭并释放锁定的库存</div>
    </template>

    <!-- 步骤二: 选择支付方式并支付 -->
    <template v-else-if="currentOrder">
      <div class="pay-meta">
        <div class="row"><span>订单号</span><span class="order-no">{{ currentOrder.orderNo }}</span></div>
        <div class="row"><span>应付金额</span><span class="amount big">¥{{ currentOrder.totalAmount.toFixed(2) }}</span></div>
      </div>

      <!-- 支付方式选择(模拟) -->
      <div class="pay-channels">
        <div
          v-for="c in payChannels"
          :key="c.value"
          class="pay-channel"
          :class="{ selected: channel === c.value }"
          @click="channel = c.value"
        >
          <div class="pc-head">
            <b>{{ c.label }}</b>
            <span class="pc-desc">{{ c.desc }}</span>
          </div>
          <el-icon v-if="channel === c.value" class="pc-check"><CircleCheckFilled /></el-icon>
        </div>
      </div>

      <div class="timeout-note">⏱️ 订单待支付 30 分钟内未支付将自动关闭并释放锁定的库存</div>
    </template>

    <!-- 底部按钮 -->
    <template #footer>
      <template v-if="step === 'confirm'">
        <el-button @click="onClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAndGoPay">提交订单并去支付</el-button>
      </template>
      <template v-else-if="step === 'split'">
        <div class="pay-total">
          共 {{ splitOrders.length }} 单, 合计:<span class="amount">¥{{ splitTotal.toFixed(2) }}</span>
        </div>
        <el-button @click="abandon">放弃支付</el-button>
        <el-button type="success" :loading="submitting" @click="paySequentially">
          {{ hasFailed ? '重试未支付订单' : '按顺序逐个支付' }}
        </el-button>
      </template>
      <template v-else-if="currentOrder">
        <div class="pay-total">应付:<span class="amount">¥{{ currentOrder.totalAmount.toFixed(2) }}</span></div>
        <el-button @click="abandon">放弃支付</el-button>
        <el-button type="success" :loading="submitting" @click="confirmPay">立即支付</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CircleCheckFilled, Location, Phone } from '@element-plus/icons-vue'
import { createOrder, payOrder, payChannels, type Order } from '@/api/order'
import { createSeckillOrder } from '@/api/seckill'
import { getAddressList, type UserAddress } from '@/api/address'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  /** 弹窗可见性(v-model) */
  modelValue: boolean
  /** 待下单商品条目, 用于 立即购买/购物车结算 首先生成订单 */
  items?: { productId: number; count: number }[]
  /** 应付金额(用于确认订单步骤展示) */
  amount?: number
  /** 是否为秒杀下单: true 时提交走 /order/seckillCreate */
  seckill?: boolean
  /** 已存在的待支付订单(订单列表"去支付"时传入, 直接进入支付步骤) */
  existingOrder?: Order | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  /** 支付成功, 携带本次已完成支付的订单(拆单时可能为多个) */
  (e: 'paid', orders: Order[]): void
  /** 放弃支付(订单已创建但未支付, 处于待支付态) */
  (e: 'abandoned', orders: Order[]): void
}>()

const router = useRouter()
const userStore = useUserStore()

type SplitStatus = 'pending' | 'paying' | 'paid' | 'failed'
interface SplitOrder {
  order: Order
  status: SplitStatus
}

const step = ref<'confirm' | 'pay' | 'split'>('confirm')
const addresses = ref<UserAddress[]>([])
const selectedAddressId = ref<number>()
const remark = ref('')
const channel = ref(payChannels[0].value) // 默认选第一个支付方式
const currentOrder = ref<Order | null>(null)
// 拆单后的多个订单及其支付状态(按顺序逐个支付)
const splitOrders = ref<SplitOrder[]>([])
const submitting = ref(false)
// 标记该订单是否已发生"支付成功/放弃支付", 防止关闭弹窗时重复上报
const finished = ref(false)

const userId = computed(() => userStore.userInfo?.id)
const itemCount = computed(() => props.items?.reduce((s, i) => s + i.count, 0) ?? 0)
const splitTotal = computed(() =>
  splitOrders.value.reduce((sum, s) => sum + s.order.totalAmount, 0)
)
const hasFailed = computed(() => splitOrders.value.some((s) => s.status === 'failed'))

const splitStatusText: Record<SplitStatus, string> = {
  pending: '待支付',
  paying: '支付中',
  paid: '已支付',
  failed: '支付失败'
}
const splitStatusType: Record<SplitStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'info',
  paying: 'warning',
  paid: 'success',
  failed: 'danger'
}

// 弹窗打开时初始化状态
watch(
  () => props.modelValue,
  async (visible) => {
    if (visible) await open()
  }
)

async function open() {
  finished.value = false
  channel.value = 'alipay'
  remark.value = ''
  submitting.value = false
  // 已有订单(订单列表"去支付"): 直接进入支付步骤, 无需再建订单/选地址
  if (props.existingOrder) {
    currentOrder.value = props.existingOrder
    step.value = 'pay'
    return
  }
  // 新下单: 先进入"确认订单 + 选地址"步骤
  currentOrder.value = null
  splitOrders.value = []
  step.value = 'confirm'
  addresses.value = userId.value ? await getAddressList(userId.value) : []
  const def = addresses.value.find((a) => a.isDefault === 1)
  selectedAddressId.value = def ? def.id : addresses.value[0]?.id
}

/** 步骤一提交: 用选中的地址生成待支付订单, 再进入支付步骤 */
async function submitAndGoPay() {
  if (!userId.value) {
    ElMessage.warning('请先登录')
    return
  }
  const addr = addresses.value.find((a) => a.id === selectedAddressId.value)
  if (!addr) {
    ElMessage.warning('请先选择收货地址')
    return
  }
  submitting.value = true
  try {
    // 后端: 生成订单 + 锁定库存(status=1 待支付)
    const orderData = {
      userId: userId.value,
      receiverName: addr.receiverName,
      receiverPhone: addr.receiverPhone,
      receiverAddr: addr.receiverAddr,
      remark: remark.value,
      items: props.items ?? []
    }
    // 后端: 生成订单 + 锁定库存(status=1 待支付), 可能按商家拆分为多个订单
    const created: Order[] = props.seckill
      ? [await createSeckillOrder(orderData)]
      : await createOrder(orderData)
    if (!created?.length) {
      ElMessage.warning('订单创建失败, 请稍后重试')
      return
    }
    if (created.length === 1) {
      // 单一订单: 维持原有"进入支付步骤"流程
      currentOrder.value = created[0]
      step.value = 'pay'
    } else {
      // 拆单: 展示订单列表, 由用户确认后逐个支付
      splitOrders.value = created.map((order) => ({ order, status: 'pending' as SplitStatus }))
      step.value = 'split'
    }
  } catch {
    // 失败提示已由响应拦截器统一处理(如"库存不足")
  } finally {
    submitting.value = false
  }
}

/** 步骤二支付: 模拟支付成功 -> 通知父组件 */
async function confirmPay() {
  if (!userId.value || !currentOrder.value) return
  submitting.value = true
  try {
    await payOrder({
      orderNo: currentOrder.value.orderNo,
      userId: userId.value,
      channel: channel.value
    })
    ElMessage.success('支付成功')
    finished.value = true
    const order = currentOrder.value
    close()
    emit('paid', [order])
  } catch {
    // 失败(如订单已超时/已取消)由拦截器提示
  } finally {
    submitting.value = false
  }
}

/**
 * 拆单支付: 按顺序逐个调用支付接口。
 * 已支付的跳过; 任一失败则标记该订单为"支付失败"并停止后续支付,
 * 用户可点击"重试未支付订单"继续。全部成功后关闭弹窗并通知父组件刷新订单列表。
 */
async function paySequentially() {
  if (!userId.value) return
  submitting.value = true
  try {
    for (const item of splitOrders.value) {
      if (item.status === 'paid') continue
      item.status = 'paying'
      try {
        await payOrder({
          orderNo: item.order.orderNo,
          userId: userId.value,
          channel: channel.value
        })
        item.status = 'paid'
      } catch {
        // 单笔失败(如已超时/已取消)不影响已完成支付的其他订单
        item.status = 'failed'
        break
      }
    }
  } finally {
    submitting.value = false
  }
  const failed = splitOrders.value.filter((i) => i.status === 'failed' || i.status === 'pending')
  if (failed.length) {
    ElMessage.error(
      `订单 ${failed.map((f) => f.order.orderNo).join('、')} 支付失败, 请重试未支付订单`
    )
    return
  }
  const orders = splitOrders.value.map((i) => i.order)
  ElMessage.success(`已逐个支付 ${orders.length} 个订单`)
  finished.value = true
  close()
  emit('paid', orders)
}

/** 放弃支付: 订单保持待支付状态(30 分钟内可去订单列表支付) */
function abandon() {
  finished.value = true
  const orders = unpaidOrders()
  close()
  if (orders.length) emit('abandoned', orders)
}

/** 尚未支付成功的已创建订单 */
function unpaidOrders(): Order[] {
  if (step.value === 'split') {
    return splitOrders.value.filter((i) => i.status !== 'paid').map((i) => i.order)
  }
  return currentOrder.value ? [currentOrder.value] : []
}

/** 关闭弹窗(点×/遮罩/取消)。若已建单未支付且未上报, 视为放弃支付 */
function onClose() {
  if (!finished.value && (step.value === 'pay' || step.value === 'split')) {
    const orders = unpaidOrders()
    if (orders.length) {
      finished.value = true
      emit('abandoned', orders)
    }
  }
  close()
}

function close() {
  emit('update:modelValue', false)
}

/** 弹窗完全关闭后清空内部状态, 保证下次打开是干净的 */
function reset() {
  step.value = 'confirm'
  currentOrder.value = null
  splitOrders.value = []
  addresses.value = []
  selectedAddressId.value = undefined
}
</script>

<style scoped>
/* ============ 步骤一: 地址选择 ============ */
.addr-section {
  margin-bottom: 16px;
}
.addr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.addr-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.addr-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  max-height: 240px;
  overflow-y: auto;
  padding: 2px;
}
.addr-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.addr-card:hover {
  border-color: #c6e2ff;
}
.addr-card.selected {
  border-color: var(--spark-primary);
  box-shadow: 0 0 0 1px var(--spark-primary);
  background: rgba(64, 158, 255, 0.05);
}
.addr-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.addr-name {
  font-size: 15px;
}
.addr-check {
  margin-left: auto;
  color: var(--spark-primary);
  font-size: 16px;
}
.addr-line {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: #666;
  font-size: 13px;
  margin-top: 4px;
}
.addr-line .el-icon {
  margin-top: 2px;
  flex-shrink: 0;
}
.addr-text {
  line-height: 1.5;
  word-break: break-all;
}
.remark-form {
  margin-bottom: 8px;
}
.order-summary {
  border-top: 1px dashed #ebeef5;
  padding-top: 12px;
}
.pay-meta {
  margin-bottom: 16px;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}
.row.total {
  color: #333;
  font-weight: 600;
}
.order-no {
  font-family: Consolas, monospace;
  color: #333;
}
.amount {
  color: var(--spark-primary);
  font-weight: 700;
}
.amount.big {
  font-size: 24px;
}
/* ============ 拆单支付 ============ */
.split-tip {
  margin-bottom: 12px;
}
.split-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
  max-height: 220px;
  overflow-y: auto;
}
.split-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 14px;
}
.split-item.failed {
  border-color: var(--brand-danger);
  background: #fef0f0;
}
.split-item.paid {
  border-color: #c2e7d3;
  background: #f0f9eb;
}
.si-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.si-count {
  font-size: 12px;
  color: #999;
}
.si-side {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* ============ 步骤二: 支付方式 ============ */
.pay-channels {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pay-channel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.pay-channel:hover {
  border-color: #c6e2ff;
}
.pay-channel.selected {
  border-color: var(--spark-primary);
  box-shadow: 0 0 0 1px var(--spark-primary);
  background: rgba(64, 158, 255, 0.05);
}
.pc-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pc-desc {
  font-size: 12px;
  color: #999;
}
.pc-check {
  color: var(--spark-primary);
  font-size: 18px;
}
.timeout-note {
  margin-top: 14px;
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  border: 1px solid #f5dab1;
  border-radius: 6px;
  padding: 8px 12px;
}
.pay-total {
  float: left;
  line-height: 32px;
  font-size: 14px;
}
</style>