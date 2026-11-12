<template>
  <div v-loading="loading" class="detail">
    <div v-if="product" class="content">
      <div class="img-box">
        <el-image :src="resolveImageUrl(product.mainImage)" fit="cover" class="img" hide-on-click-modal>
          <template #error>
            <div class="img-fallback">🎁</div>
          </template>
        </el-image>
      </div>

      <div class="info">
        <h1 class="name">{{ product.name }}</h1>
        <p class="subtitle">{{ product.subtitle }}</p>

        <div v-if="product.merchantId" class="merchant-row">
          <span class="merchant-label">商家</span>
          <el-link type="primary" :underline="false" @click="goShop">
            🏪 {{ merchant?.shopName || '进入店铺' }}
          </el-link>
          <el-button text type="primary" size="small" @click="merchantVisible = true">
            商家信息
          </el-button>
        </div>

        <div class="price-box">
          <span class="price">¥{{ product.price.toFixed(2) }}</span>
          <span v-if="product.originalPrice" class="origin">
            ¥{{ product.originalPrice.toFixed(2) }}
          </span>
        </div>

        <div class="sales">销量 {{ product.sales }}</div>

        <div class="quantity-row">
          <span class="label">数量</span>
          <el-input-number v-model="quantity" :min="1" :max="99" />
        </div>

        <div class="actions">
          <el-button type="warning" size="large" @click="buyNow">立即购买</el-button>
          <el-button type="primary" size="large" @click="onAddCart">加入购物车</el-button>
        </div>
      </div>
    </div>

    <!-- 商品评价: 平均分 + 分页列表(公开接口) -->
    <div v-if="product" class="review-card">
      <div class="review-head">
        <h3>商品评价</h3>
        <div v-if="reviewStats.total > 0" class="review-summary">
          <el-rate :model-value="reviewStats.avgRating" disabled allow-half />
          <span class="avg">{{ reviewStats.avgRating.toFixed(1) }}</span>
          <span class="count">共 {{ reviewStats.total }} 条</span>
        </div>
        <span v-else class="no-review">暂无评价</span>
      </div>

      <div v-for="r in reviews" :key="r.id" class="review-item">
        <div class="review-top">
          <span class="review-user">{{ r.username || (r.anonymous ? '匿名用户' : '已购用户') }}</span>
          <el-rate :model-value="r.rating" disabled size="small" />
          <span class="review-type" :class="typeClass(r.rating)">{{ typeText(r.rating) }}</span>
          <span class="review-time">{{ formatTime(r.createTime) }}</span>
        </div>
        <p v-if="r.content" class="review-content">{{ r.content }}</p>
        <!-- 未写文字评价: 系统默认好评(后端虚拟生成, 星数即用户真实评分, 无默认低星) -->
        <p v-else class="review-default">默认好评, 用户未填写文字评价</p>
        <div v-if="splitImages(r.images).length" class="review-imgs">
          <el-image
            v-for="(img, idx) in splitImages(r.images)"
            :key="img + idx"
            :src="resolveImageUrl(img)"
            fit="cover"
            class="review-img"
            :preview-src-list="splitImages(r.images).map(resolveImageUrl)"
            :initial-index="idx"
            preview-teleported
          />
        </div>
      </div>

      <el-empty
        v-if="reviews.length === 0"
        :image-size="60"
        description="还没有评价, 购买后来说两句吧"
      />
      <el-pagination
        v-if="reviewStats.total > reviewPageSize"
        class="review-pager"
        layout="prev, pager, next"
        :current-page="reviewPage"
        :page-size="reviewPageSize"
        :total="reviewStats.total"
        @current-change="onReviewPage"
      />
    </div>

    <el-empty v-else-if="!loading" description="商品不存在" />

    <!-- 商家信息弹窗 -->
    <el-dialog v-model="merchantVisible" title="商家信息" width="420px">
      <div v-if="merchant" class="merchant-box">
        <div class="merchant-top">
          <el-avatar :src="resolveImageUrl(merchant.avatar) || undefined" :size="56">
            {{ (merchant.shopName || merchant.username || '店').charAt(0) }}
          </el-avatar>
          <div class="merchant-title">
            <div class="shop-name">{{ merchant.shopName || '未命名店铺' }}</div>
            <div class="shop-owner">店主:{{ merchant.username }}</div>
          </div>
        </div>
        <p class="shop-desc">{{ merchant.shopDesc || '商家暂未填写店铺简介' }}</p>
        <div class="shop-time">开店时间:{{ merchant.createTime || '—' }}</div>
      </div>
      <el-empty v-else description="加载中或商家信息不存在" :image-size="80" />
      <template #footer>
        <el-button @click="merchantVisible = false">关闭</el-button>
        <el-button type="primary" @click="goShop">进店逛逛</el-button>
      </template>
    </el-dialog>

    <!-- 立即购买: 复用通用支付弹窗(选地址 + 支付方式 + 模拟支付) -->
    <PaymentDialog
      v-model="payVisible"
      :items="[{ productId: product?.id ?? 0, count: quantity }]"
      :amount="(product?.price ?? 0) * quantity"
      @paid="onPaid"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProductDetail, type Product } from '@/api/product'
import { getMerchantInfo, type MerchantVO } from '@/api/user'
import { resolveImageUrl } from '@/api/upload'
import { addToCart } from '@/utils/cart'
import { useUserStore } from '@/stores/user'
import PaymentDialog from '@/components/PaymentDialog.vue'
import {
  getProductReviews,
  getProductReviewStats,
  reviewImages as splitImages,
  type Review,
  type ReviewStats
} from '@/api/review'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const product = ref<Product | null>(null)
const quantity = ref(1)
const loading = ref(false)
const payVisible = ref(false)
const merchant = ref<MerchantVO | null>(null)
const merchantVisible = ref(false)

// 商品评价
const reviewStats = ref<ReviewStats>({ avgRating: 0, total: 0 })
const reviews = ref<Review[]>([])
const reviewPage = ref(1)
const reviewPageSize = 5

async function load() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    product.value = await getProductDetail(id)
    // 商品带商家 id 时,顺带拉取店铺公开信息用于展示(失败静默,不影响主流程)
    if (product.value?.merchantId) {
      getMerchantInfo(product.value.merchantId)
        .then((info) => (merchant.value = info))
        .catch(() => undefined)
    }
    if (product.value) {
      loadReviews()
    }
  } catch {
    // 静默
  } finally {
    loading.value = false
  }
}

/** 加载评价统计 + 当前页评价(公开接口, 失败不阻断商品展示) */
async function loadReviews() {
  const id = Number(route.params.id)
  try {
    const [stats, page] = await Promise.all([
      getProductReviewStats(id),
      getProductReviews(id, reviewPage.value, reviewPageSize)
    ])
    reviewStats.value = stats || { avgRating: 0, total: 0 }
    reviews.value = page?.records || []
  } catch {
    reviewStats.value = { avgRating: 0, total: 0 }
    reviews.value = []
  }
}

function onReviewPage(page: number) {
  reviewPage.value = page
  loadReviews()
}

function formatTime(time?: string | null) {
  if (!time) return ''
  return new Date(time).toLocaleDateString()
}

/** 加购改为后端接口: 未登录先引导登录, 业务错误由 axios 拦截器统一提示 */
async function onAddCart() {
  if (!product.value) return
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  try {
    await addToCart(
      {
        id: product.value.id,
        name: product.value.name,
        mainImage: product.value.mainImage,
        price: product.value.price
      },
      quantity.value
    )
    ElMessage.success('已加入购物车')
  } catch {
    // 错误提示由请求拦截器统一处理(如库存不足/已下架)
  }
}

function buyNow() {
  if (!product.value) return
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  // 打开通用支付弹窗: 选收货地址 -> 生成待支付订单(锁定库存) -> 选支付方式模拟支付
  payVisible.value = true
}

/** 支付成功后跳转订单列表 */
function onPaid() {
  router.push('/orders')
}

/** 进入商家主页(店铺名链接/弹窗"进店逛逛"共用) */
function goShop() {
  if (product.value?.merchantId) {
    router.push(`/shop/${product.value.merchantId}`)
  }
}

/** 星级 → 评价类型文案(主流电商口径: 4~5 星好评, 3 星中评, 1~2 星差评) */
function typeText(rating: number): string {
  if (rating >= 4) return '好评'
  if (rating === 3) return '中评'
  return '差评'
}
function typeClass(rating: number): string {
  if (rating >= 4) return 'is-good'
  if (rating === 3) return 'is-mid'
  return 'is-bad'
}

onMounted(load)
</script>

<style scoped>
.content {
  display: flex;
  gap: 32px;
  background: var(--bg-card);
  padding: var(--space-4);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.img-box {
  width: 420px;
  height: 420px;
  flex-shrink: 0;
  background: var(--bg-soft);
  border-radius: var(--radius-control);
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
  font-size: 120px;
  background: var(--bg-soft);
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.name {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-1);
  line-height: 1.4;
}
.subtitle {
  margin: 0 0 20px;
  font-size: 14px;
  color: var(--text-3);
}
.merchant-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}
.merchant-label {
  color: var(--text-3);
}
.merchant-box {
  padding: 4px 0;
}
.merchant-top {
  display: flex;
  align-items: center;
  gap: 12px;
}
.merchant-title {
  flex: 1;
}
.shop-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-1);
}
.shop-owner {
  font-size: 13px;
  color: var(--text-3);
  margin-top: 4px;
}
.shop-desc {
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.6;
  background: var(--bg-soft);
  border-radius: var(--radius-control);
  padding: var(--space-2);
  margin: 16px 0;
}
.shop-time {
  font-size: 13px;
  color: var(--text-3);
}
/* 价格区: 主色渐变浅底, 醒目 */
.price-box {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(90deg, #fff3ec 0%, #fff9f5 100%);
  border-radius: var(--radius-control);
  margin-bottom: 16px;
}
.price {
  font-size: 30px;
  color: var(--brand-primary);
  font-weight: 700;
}
.origin {
  font-size: 16px;
  color: #c0c4cc;
  text-decoration: line-through;
}
.sales {
  font-size: 13px;
  color: var(--text-3);
  margin-bottom: 24px;
}
.quantity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}
.label {
  font-size: 14px;
  color: var(--text-2);
}
/* 按钮组: 等宽对齐 */
.actions {
  display: flex;
  gap: var(--space-2);
  margin-top: auto;
}
.actions :deep(.el-button) {
  flex: 1;
}
/* 商品评价 */
.review-card {
  margin-top: var(--space-3);
  background: var(--bg-card);
  padding: var(--space-4);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.review-head {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 12px;
}
.review-head h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-1);
}
.review-summary {
  display: flex;
  align-items: center;
  gap: 8px;
}
.avg {
  font-size: 20px;
  font-weight: 700;
  color: var(--brand-primary);
}
.count,
.no-review {
  font-size: 13px;
  color: var(--text-3);
}
.review-item {
  padding: 12px 0;
  border-top: 1px solid #f0f1f3;
}
.review-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.review-user {
  font-size: 13px;
  color: var(--text-2);
}
/* 评价类型标签: 好评/中评/差评 */
.review-type {
  font-size: 12px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.review-type.is-good {
  color: #1a9c6b;
  background: #e6f7f0;
}
.review-type.is-mid {
  color: #d48806;
  background: #fff7e6;
}
.review-type.is-bad {
  color: #d43030;
  background: #fdeaea;
}
.review-time {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-3);
}
.review-content {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-1);
  word-break: break-all;
}
/* 默认好评: 灰色斜体弱化展示 */
.review-default {
  margin: 8px 0 0;
  font-size: 12px;
  font-style: italic;
  color: #a3a8b0;
}
.review-imgs {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.review-img {
  width: 84px;
  height: 84px;
  border-radius: 6px;
  background: var(--bg-soft);
  cursor: pointer;
}
.review-pager {
  justify-content: center;
  margin-top: 12px;
}
</style>
