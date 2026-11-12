<template>
  <div v-loading="loading" class="seckill">
    <!-- 顶部横幅: 深红渐变 + 斜纹 + 翻牌倒计时(参考京东秒杀场次设计) -->
    <div class="banner">
      <span class="banner-bolt">⚡</span>
      <div class="banner-main">
        <div class="banner-title">限时秒杀</div>
        <div class="banner-sub">
          全场低至 <b class="fold">{{ minFold }}</b> 折起 · 手慢无, 抢到后请在 30 分钟内完成支付
        </div>
      </div>
      <div class="countdown">
        <div class="cd-label">
          {{ cdText }}
          <span class="cd-session">{{ sessionText }}</span>
        </div>
        <div class="cd-cells" :aria-label="`距本场结束 ${cdText}`">
          <span class="cd-cell">{{ cd.h }}</span>
          <i class="cd-colon">:</i>
          <span class="cd-cell">{{ cd.m }}</span>
          <i class="cd-colon">:</i>
          <span class="cd-cell">{{ cd.s }}</span>
        </div>
      </div>
    </div>

    <!-- 实时战报: 竖向轮播伪造"刚刚有人抢到"的哄抢氛围 -->
    <div v-if="notices.length" class="notice-bar">
      <span class="notice-horn">📣 实时战报</span>
      <div class="notice-window">
        <Transition name="notice" mode="out-in">
          <span :key="noticeIdx" class="notice-text">{{ notices[noticeIdx] }}</span>
        </Transition>
      </div>
    </div>

    <!-- 秒杀商品列表 -->
    <div v-if="products.length" class="grid">
      <el-card
        v-for="p in products"
        :key="p.id"
        class="sk-card"
        :class="{ 'is-hot': isHot(p.id), 'is-out': isOut(p.id) }"
        shadow="hover"
        :body-style="{ padding: 0 }"
      >
        <div class="img-wrap">
          <el-image :src="resolveImageUrl(p.mainImage)" fit="cover" class="img" lazy>
            <template #error>
              <div class="img-fallback">暂无图片</div>
            </template>
          </el-image>
          <!-- 角标: 闪电 + 折扣(按秒杀价/原价计算) -->
          <span v-if="discount(p)" class="sk-tag">⚡ {{ discount(p) }} 折</span>
          <span v-else class="sk-tag">⚡ 秒杀</span>
          <!-- 售罄蒙层 -->
          <div v-if="isOut(p.id)" class="out-mask">
            <span class="out-text">已抢光</span>
          </div>
        </div>

        <div class="info">
          <h3 class="name" :title="p.name">{{ p.name }}</h3>
          <p class="subtitle" :title="p.subtitle">{{ p.subtitle }}</p>

          <div class="price-row">
            <span class="price">¥{{ p.price.toFixed(2) }}</span>
            <span v-if="p.originalPrice" class="origin">¥{{ p.originalPrice.toFixed(2) }}</span>
            <span v-if="p.originalPrice" class="save">省 ¥{{ (p.originalPrice - p.price).toFixed(2) }}</span>
          </div>

          <!-- 已抢进度条: 首次加载的库存为基准, 逼近售罄时闪烁 -->
          <div class="rush-bar">
            <div class="rush-track">
              <div
                class="rush-fill"
                :class="{ flash: soldPct(p.id) >= 85 }"
                :style="{ width: soldPct(p.id) + '%' }"
              />
            </div>
            <span class="rush-text" :class="{ danger: soldPct(p.id) >= 85 }">
              已抢 {{ soldPct(p.id) }}%
            </span>
          </div>

          <div class="bottom">
            <span class="stock">
              <template v-if="isOut(p.id)">明日再来</template>
              <template v-else>仅剩 <b :class="{ danger: isHot(p.id) }">{{ remaining[p.id] ?? 0 }}</b> 件</template>
            </span>
            <el-button
              type="danger"
              size="small"
              class="buy-btn"
              :class="{ pulse: isHot(p.id) }"
              :disabled="isOut(p.id) || buyingId === p.id"
              :loading="buyingId === p.id"
              @click="onBuy(p)"
            >
              {{ isOut(p.id) ? '已抢光' : isHot(p.id) ? '手慢无!' : '立即抢购' }}
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <el-empty v-else-if="!loading" description="本场已结束, 下一场即将开始" />

    <!-- 秒杀下单(选地址 + 模拟支付), 与普通购买共用弹窗, 提交走 seckillCreate -->
    <PaymentDialog
      v-model="payVisible"
      seckill
      :items="payItems"
      :amount="payAmount"
      @paid="onPaid"
      @abandoned="onAbandoned"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getProductList, type Product } from '@/api/product'
import { resolveImageUrl } from '@/api/upload'
import { getSeckillStock, buySeckill } from '@/api/seckill'
import { useUserStore } from '@/stores/user'
import PaymentDialog from '@/components/PaymentDialog.vue'

const router = useRouter()
const userStore = useUserStore()

const products = ref<Product[]>([])
const loading = ref(false)
/** 每个商品的剩余秒杀库存: key = productId, value = 库存 */
const remaining = ref<Record<number, number>>({})
/** 各商品的本场初始库存基准(首次轮询值), 用于计算"已抢 x%" */
const initialStock = ref<Record<number, number>>({})
const buyingId = ref<number>()
const payVisible = ref(false)
const payItems = ref<{ productId: number; count: number }[]>([])
const payAmount = ref(0)

// ============ 倒计时: 每 2 小时一场(0/2/.../22 点), 当前场 = 最近一个已开始的偶数整点 ============
const now = ref(Date.now())
let cdTimer: ReturnType<typeof setInterval> | undefined

/** 当前场次的结束时间戳: hour=14 → 16 点(14 点场), hour=13 → 14 点(12 点场收尾) */
const sessionEnd = computed(() => {
  const d = new Date(now.value)
  const h = d.getHours()
  const endHour = h % 2 === 0 ? h + 2 : h + 1
  d.setHours(endHour, 0, 0, 0)
  return d.getTime()
})

/** 剩余时分秒, 翻牌块展示 */
const cd = computed(() => {
  const diff = Math.max(0, sessionEnd.value - now.value)
  const total = Math.floor(diff / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    h: pad(Math.floor(total / 3600)),
    m: pad(Math.floor((total % 3600) / 60)),
    s: pad(total % 60),
    done: diff <= 0
  }
})

const cdText = computed(() => `${cd.value.h}:${cd.value.m}:${cd.value.s}`)

/** 场次文案: "14:00 场 · 疯抢中" */
const sessionText = computed(() => {
  const start = new Date(sessionEnd.value - 2 * 3600 * 1000)
  const fmt = (x: Date) => `${String(x.getHours()).padStart(2, '0')}:00`
  return `${fmt(start)} 场 · 疯抢中`
})

// ============ 实时战报: 商品加载后随机生成"刚抢到"消息并轮播 ============
const notices = ref<string[]>([])
const noticeIdx = ref(0)
let noticeTimer: ReturnType<typeof setInterval> | undefined

function buildNotices() {
  const names = products.value.map((p) => p.name).filter(Boolean)
  if (!names.length) return
  const mask = () => `1${String(Math.floor(Math.random() * 9000000000 + 1000000000)).slice(0, 3)}****${Math.floor(Math.random() * 9000 + 1000)}`
  notices.value = Array.from({ length: 6 }, () => {
    const name = names[Math.floor(Math.random() * names.length)]
    return `用户 ${mask()} 刚刚抢到了「${name}」, 仅剩库存正在飞速减少`
  })
  noticeIdx.value = 0
}

function startNotice() {
  stopNotice()
  noticeTimer = setInterval(() => {
    noticeIdx.value = (noticeIdx.value + 1) % notices.value.length
  }, 2500)
}
function stopNotice() {
  if (noticeTimer) {
    clearInterval(noticeTimer)
    noticeTimer = undefined
  }
}

// ============ 商品/库存 ============
let stockTimer: ReturnType<typeof setInterval> | undefined

async function loadProducts() {
  loading.value = true
  try {
    // 演示: 取首页前 4 个商品作为秒杀品
    const res = await getProductList({ page: 1, size: 4 })
    products.value = res.records || []
    initialStock.value = {}
    buildNotices()
    startNotice()
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

async function refreshStock() {
  for (const p of products.value) {
    try {
      const v = await getSeckillStock(p.id)
      remaining.value[p.id] = v
      // 首次拉到的值作为"已抢百分比"的基准
      if (initialStock.value[p.id] === undefined) initialStock.value[p.id] = v
    } catch {
      // 单个失败不影响其它
    }
  }
}

/** 折扣(如 5.2): 秒杀价/原价, 无原价时不展示 */
function discount(p: Product): string | null {
  if (!p.originalPrice || p.originalPrice <= p.price) return null
  const d = (p.price / p.originalPrice) * 10
  return d.toFixed(1).replace(/\.0$/, '')
}

/** 已抢百分比: 1 - 剩余/初始, 兜底 0~100 */
function soldPct(id: number): number {
  const init = initialStock.value[id]
  const left = remaining.value[id]
  if (!init || init <= 0 || left === undefined) return 0
  return Math.min(100, Math.max(0, Math.round(((init - left) / init) * 100)))
}

/** 库存告急(1~3 件): 卡片呼吸红光 + 按钮"手慢无" */
function isHot(id: number): boolean {
  const v = remaining.value[id]
  return v !== undefined && v > 0 && v <= 3
}
/** 已售罄 */
function isOut(id: number): boolean {
  return (remaining.value[id] ?? 0) <= 0
}

/** 最低折扣(横幅文案用) */
const minFold = computed(() => {
  const ds = products.value
    .map((p) => (p.originalPrice && p.originalPrice > p.price ? (p.price / p.originalPrice) * 10 : null))
    .filter((v): v is number => v !== null)
  return ds.length ? Math.min(...ds).toFixed(1).replace(/\.0$/, '') : '5'
})

/** 立即抢购: 先 Redis 原子扣减判资格, 抢到再弹下单弹窗 */
async function onBuy(p: Product) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  buyingId.value = p.id
  try {
    const ok = await buySeckill(p.id, 1)
    if (!ok) {
      // 未抢到/已售罄, 同步一次最新库存
      remaining.value[p.id] = await getSeckillStock(p.id)
      ElMessage.warning('手慢了, 已被抢光')
      return
    }
    // 抢到资格: 打开秒杀下单弹窗
    remaining.value[p.id] = (remaining.value[p.id] ?? 1) - 1
    payItems.value = [{ productId: p.id, count: 1 }]
    payAmount.value = p.price
    payVisible.value = true
  } catch {
    // 失败由拦截器提示
  } finally {
    buyingId.value = undefined
  }
}

function onPaid() {
  router.push('/orders')
}

/** 放弃支付/超时: 该秒杀单保持待支付, 可去订单列表支付或等超时释放 */
function onAbandoned() {
  ElMessage.info('已生成待支付订单, 30 分钟内可在我的订单完成支付')
}

onMounted(() => {
  loadProducts().then(() => refreshStock())
  stockTimer = setInterval(refreshStock, 3000)
  cdTimer = setInterval(() => {
    now.value = Date.now()
    // 本场倒计时走完: 换场重拉商品与库存
    if (cd.value.done) {
      loadProducts().then(() => refreshStock())
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (stockTimer) clearInterval(stockTimer)
  if (cdTimer) clearInterval(cdTimer)
  stopNotice()
})
</script>

<style scoped>
/* ---------- 顶部横幅: 深红渐变 + 斜纹 + 跳动闪电 ---------- */
.banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 26px 32px;
  margin-bottom: 14px;
  border-radius: var(--radius-card, 10px);
  background:
    repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.06) 0 10px, transparent 10px 22px),
    linear-gradient(120deg, #d3161f, #ff2d55 55%, #ff5f3d);
  color: #fff;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(255, 45, 85, 0.25);
}
.banner-bolt {
  position: absolute;
  right: 30px;
  bottom: -18px;
  font-size: 96px;
  line-height: 1;
  opacity: 0.28;
  animation: boltJump 1.6s ease-in-out infinite;
  pointer-events: none;
}
@keyframes boltJump {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.08); }
}
.banner-main {
  flex: 1;
  min-width: 0;
}
.banner-title {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 2px;
}
.banner-sub {
  margin-top: 8px;
  font-size: 14px;
  opacity: 0.95;
}
.fold {
  font-size: 18px;
  font-weight: 800;
  color: #ffe04b;
  padding: 0 2px;
}

/* 倒计时翻牌块(黑底 + 等宽数字, 京东风) */
.countdown {
  flex-shrink: 0;
  text-align: right;
}
.cd-label {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  font-size: 13px;
  opacity: 0.95;
  margin-bottom: 8px;
}
.cd-session {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.32);
  font-weight: 600;
}
.cd-cells {
  display: flex;
  align-items: center;
  gap: 5px;
}
.cd-cell {
  min-width: 44px;
  padding: 7px 6px;
  border-radius: 7px;
  background: rgba(20, 8, 8, 0.82);
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.12);
}
.cd-colon {
  font-size: 20px;
  font-weight: 800;
  animation: colonBlink 1s steps(1) infinite;
}
@keyframes colonBlink {
  50% { opacity: 0.25; }
}

/* ---------- 实时战报通知条(竖向轮播) ---------- */
.notice-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 16px;
  margin-bottom: 18px;
  border-radius: var(--radius-control, 6px);
  background: linear-gradient(90deg, #fff3f0, #fff7f7 60%, #fff);
  border: 1px solid #ffe1dc;
  overflow: hidden;
}
.notice-horn {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: #ff2d55;
}
.notice-window {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.notice-text {
  font-size: 13px;
  color: #a8433a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.notice-enter-active,
.notice-leave-active {
  transition: all 0.35s ease;
}
.notice-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.notice-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* ---------- 商品网格 ---------- */
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.sk-card {
  border-radius: 10px;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
/* 库存告急: 红色呼吸光圈 */
.sk-card.is-hot {
  animation: hotRing 1.4s ease-in-out infinite;
}
@keyframes hotRing {
  0%, 100% { box-shadow: 0 0 0 1px rgba(255, 45, 85, 0.55); }
  50% { box-shadow: 0 0 0 3px rgba(255, 45, 85, 0.85); }
}
.sk-card.is-out {
  filter: grayscale(0.65);
  opacity: 0.82;
}
.img-wrap {
  position: relative;
  width: 100%;
  height: 220px;
  background: #fafafa;
  overflow: hidden;
}
.img {
  width: 100%;
  height: 100%;
  transition: transform 0.35s ease;
}
.sk-card:hover .img {
  transform: scale(1.06);
}
.img-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #bbb;
  background: #f5f5f5;
}
/* 角标: 闪电折扣 */
.sk-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  background: linear-gradient(120deg, #ff2d55, #ff5f3d);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(255, 45, 85, 0.4);
}
/* 售罄蒙层 */
.out-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.55);
}
.out-text {
  padding: 6px 18px;
  border: 2px solid #999;
  border-radius: 8px;
  color: #777;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 4px;
  background: rgba(255, 255, 255, 0.9);
}

.info {
  padding: 12px;
}
.name {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.subtitle {
  margin: 0 0 10px;
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}
.price {
  font-size: 18px;
  color: #ff2d55;
  font-weight: 800;
}
.origin {
  font-size: 12px;
  color: #bbb;
  text-decoration: line-through;
}
.save {
  font-size: 11px;
  color: #ff7a45;
  background: #fff1e6;
  padding: 1px 6px;
  border-radius: 4px;
}

/* 已抢进度条(京东风) */
.rush-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.rush-track {
  flex: 1;
  height: 7px;
  border-radius: 4px;
  background: #ffe3e8;
  overflow: hidden;
}
.rush-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #ff9a3d, #ff2d55);
  transition: width 0.6s ease;
}
.rush-fill.flash {
  animation: fillFlash 1.2s ease-in-out infinite;
}
@keyframes fillFlash {
  50% { filter: brightness(1.35); }
}
.rush-text {
  flex-shrink: 0;
  font-size: 11px;
  color: #999;
  font-variant-numeric: tabular-nums;
}
.rush-text.danger {
  color: #ff2d55;
  font-weight: 700;
}

.bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.stock {
  font-size: 12px;
  color: #999;
}
.stock b {
  color: #ff2d55;
  font-size: 14px;
}
.stock b.danger {
  animation: numBlink 1s steps(2) infinite;
}
@keyframes numBlink {
  50% { opacity: 0.35; }
}
/* 手慢无按钮: 呼吸缩放 */
.buy-btn.pulse {
  animation: btnPulse 1.1s ease-in-out infinite;
}
@keyframes btnPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.07); }
}

/* 窄屏: 网格降列 + 倒计时压缩 */
@media (max-width: 1100px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 820px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
  .banner { flex-direction: column; align-items: flex-start; }
  .countdown { width: 100%; text-align: left; }
  .cd-label { justify-content: flex-start; }
}
</style>
