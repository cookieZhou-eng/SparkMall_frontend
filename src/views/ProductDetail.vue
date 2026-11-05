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

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const product = ref<Product | null>(null)
const quantity = ref(1)
const loading = ref(false)
const payVisible = ref(false)
const merchant = ref<MerchantVO | null>(null)
const merchantVisible = ref(false)

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
  } catch {
    // 静默
  } finally {
    loading.value = false
  }
}

function onAddCart() {
  if (!product.value) return
  addToCart(
    {
      id: product.value.id,
      name: product.value.name,
      mainImage: product.value.mainImage,
      price: product.value.price
    },
    quantity.value
  )
  ElMessage.success('已加入购物车')
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
</style>
