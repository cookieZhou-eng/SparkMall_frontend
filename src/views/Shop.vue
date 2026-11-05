<template>
  <div v-loading="loading" class="shop">
    <!-- 店铺头部横幅(复用个人中心渐变横幅风格) -->
    <div v-if="merchant" class="banner">
      <el-avatar
        :src="resolveImageUrl(merchant.avatar) || undefined"
        :size="88"
        class="banner-avatar"
      >
        {{ avatarText }}
      </el-avatar>
      <div class="banner-meta">
        <div class="shop-name">{{ merchant.shopName || '未命名店铺' }}</div>
        <div class="meta-line">店主:{{ merchant.username }}</div>
        <div class="meta-line shop-desc" :title="merchant.shopDesc || ''">
          {{ merchant.shopDesc || '商家暂未填写店铺简介' }}
        </div>
        <div class="meta-line">开店时间:{{ merchant.createTime || '—' }}</div>
        <div class="meta-line sales-line">
          累计销售额:<span class="sales-num">¥{{ formatSales(merchant.totalSales) }}</span>
        </div>
      </div>
    </div>
    <el-empty v-else-if="!loading" description="商家不存在" />

    <!-- 全部商品 -->
    <template v-if="merchant">
      <h3 class="section-title">全部商品</h3>
      <div v-loading="productsLoading" class="grid-wrap">
        <div v-if="products.length" class="grid">
          <ProductCard v-for="p in products" :key="p.id" :product="p" />
        </div>
        <el-empty v-else-if="!productsLoading" description="该商家暂无上架商品" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ProductCard from '@/components/ProductCard.vue'
import { getProductsByMerchant, type Product } from '@/api/product'
import { getMerchantInfo, type MerchantVO } from '@/api/user'
import { resolveImageUrl } from '@/api/upload'

const route = useRoute()
const merchant = ref<MerchantVO | null>(null)
const products = ref<Product[]>([])
const loading = ref(false)
const productsLoading = ref(false)

const avatarText = computed(
  () => (merchant.value?.shopName || merchant.value?.username || '店').charAt(0)
)

/** 累计销售额格式化(后端 BigDecimal 可能以数字返回, 统一转数字再保留两位小数) */
function formatSales(v: number | string | null | undefined): string {
  return Number(v ?? 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

async function loadMerchant() {
  loading.value = true
  try {
    merchant.value = await getMerchantInfo(Number(route.params.id))
  } catch {
    // 拦截器已弹错误,这里静默(商家不存在时展示空状态)
  } finally {
    loading.value = false
  }
}

async function loadProducts() {
  productsLoading.value = true
  try {
    products.value = (await getProductsByMerchant(Number(route.params.id))) || []
  } catch {
    // 静默
  } finally {
    productsLoading.value = false
  }
}

// 店铺 id 变化(从别的商家主页直接跳转)时重新加载
watch(
  () => route.params.id,
  (id, old) => {
    if (id && id !== old) {
      loadMerchant()
      loadProducts()
    }
  }
)

onMounted(() => {
  loadMerchant()
  loadProducts()
})
</script>

<style scoped>
.shop {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
/* ---------- 渐变横幅(与 Profile.vue 一致) ---------- */
.banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px 32px;
  border-radius: var(--radius-card);
  background: var(--brand-gradient);
  overflow: hidden;
  color: #fff;
}
/* 柔光装饰 */
.banner::after {
  content: '';
  position: absolute;
  right: -60px;
  top: -80px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  pointer-events: none;
}
.banner-avatar {
  flex-shrink: 0;
  border: 3px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-size: 32px;
  background: rgba(255, 255, 255, 0.25);
}
.banner-meta {
  flex: 1;
  min-width: 0;
}
.shop-name {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-line {
  font-size: 13px;
  opacity: 0.92;
  line-height: 1.9;
}
.shop-desc {
  max-width: 560px;
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 累计销售额: 横幅内白色高亮展示 */
.sales-line {
  margin-top: 2px;
}
.sales-num {
  margin-left: 4px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}
/* ---------- 商品区 ---------- */
.section-title {
  margin: var(--space-2) 0 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-1);
}
.grid-wrap {
  min-height: 200px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
