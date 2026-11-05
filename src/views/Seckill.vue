<template>
  <div v-loading="loading" class="seckill">
    <!-- 顶部横幅 -->
    <div class="banner">
      <div class="banner-title">⚡ 限时秒杀</div>
      <div class="banner-sub">手慢无 · 抢到后请在 30 分钟内完成支付</div>
    </div>

    <!-- 秒杀商品列表 -->
    <div v-if="products.length" class="grid">
      <el-card
        v-for="p in products"
        :key="p.id"
        class="sk-card"
        shadow="hover"
        :body-style="{ padding: 0 }"
      >
        <div class="img-wrap">
          <el-image :src="resolveImageUrl(p.mainImage)" fit="cover" class="img" lazy>
            <template #error>
              <div class="img-fallback">🎁</div>
            </template>
          </el-image>
          <span class="sk-tag">秒杀</span>
        </div>

        <div class="info">
          <h3 class="name" :title="p.name">{{ p.name }}</h3>
          <p class="subtitle" :title="p.subtitle">{{ p.subtitle }}</p>

          <div class="price-row">
            <span class="price">秒杀价 ¥{{ p.price.toFixed(2) }}</span>
            <span v-if="p.originalPrice" class="origin">¥{{ p.originalPrice.toFixed(2) }}</span>
          </div>

          <div class="bottom">
            <!-- 剩余库存实时展示 -->
            <span class="stock">
              剩余
              <b :class="{ danger: remaining[p.id] <= 0 }">{{ remaining[p.id] ?? 0 }}</b>
              件
            </span>
            <el-button
              type="danger"
              size="small"
              :disabled="(remaining[p.id] ?? 0) <= 0 || buyingId === p.id"
              :loading="buyingId === p.id"
              @click="onBuy(p)"
            >
              {{ (remaining[p.id] ?? 0) > 0 ? '立即抢购' : '已抢光' }}
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <el-empty v-else-if="!loading" description="暂无可秒杀商品" />

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
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
const buyingId = ref<number>()
// 当前正在抢购的商品, 用于打开下单弹窗
const payVisible = ref(false)
const payItems = ref<{ productId: number; count: number }[]>([])
const payAmount = ref(0)

/** 定时器: 轮询秒杀剩余库存, 营造"哄抢实时递减"效果 */
let timer: ReturnType<typeof setInterval> | undefined

async function loadProducts() {
  loading.value = true
  try {
    // 演示: 取首页前 4 个商品作为秒杀品
    const res = await getProductList({ page: 1, size: 4 })
    products.value = res.records || []
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

/** 各自刷新每个秒杀商品的剩余库存 */
async function refreshStock() {
  for (const p of products.value) {
    try {
      const v = await getSeckillStock(p.id)
      // TODO 定位后移除调试输出
      console.log('[seckill] stock', p.id, '=', v)
      remaining.value[p.id] = v
    } catch (e) {
      // 单个失败不影响其它; 打印错误便于定位
      console.error('[seckill] stock fail', p.id, e)
    }
  }
}

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
  loadProducts().then(() => {
    refreshStock()
    timer = setInterval(refreshStock, 3000)
  })
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.banner {
  background: linear-gradient(135deg, #ff5f3d, #ff2d55);
  border-radius: 10px;
  color: #fff;
  padding: 28px 32px;
  margin-bottom: 24px;
}
.banner-title {
  font-size: 28px;
  font-weight: 700;
}
.banner-sub {
  margin-top: 8px;
  font-size: 14px;
  opacity: 0.9;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.sk-card {
  border-radius: 10px;
  overflow: hidden;
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
}
.img-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: #f5f5f5;
}
.sk-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #ff2d55;
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
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
  margin-bottom: 10px;
}
.price {
  font-size: 16px;
  color: #ff2d55;
  font-weight: 700;
}
.origin {
  font-size: 12px;
  color: #bbb;
  text-decoration: line-through;
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
}
.stock b.danger {
  color: #999;
}
</style>