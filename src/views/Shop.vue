<template>
  <div v-loading="loading" class="shop">
    <!-- 店铺头部横幅(白底描边 + 品牌渐变顶线 + 星火水印, 与个人中心风格一致) -->
    <div v-if="merchant" class="banner">
      <el-avatar
        :src="resolveImageUrl(merchant.avatar) || undefined"
        :size="80"
        class="banner-avatar"
      >
        {{ avatarText }}
      </el-avatar>
      <div class="banner-meta">
        <div class="shop-name">{{ merchant.shopName || '未命名店铺' }}</div>
        <div class="meta-line">店主:{{ merchant.username }} · 开店于 {{ (merchant.createTime || '').slice(0, 10) || '—' }}</div>
        <div class="meta-line shop-desc" :title="merchant.shopDesc || ''">
          {{ merchant.shopDesc || '商家暂未填写店铺简介' }}
        </div>
        <div class="stat-line">
          <span class="stat-item">
            <span class="stat-num">{{ formatCount(merchant.totalSalesCount) }}</span>
            <span class="stat-label">累计销售量(件)</span>
          </span>
          <!-- 好评率: 全部商品评价中 4~5 星占比(公开); 无评价时后端返回 null 不展示 -->
          <template v-if="merchant.positiveRate != null">
            <span class="stat-divider" />
            <span class="stat-item">
              <span class="stat-num">{{ merchant.positiveRate }}<i class="pct">%</i></span>
              <span class="stat-label">好评率</span>
            </span>
          </template>
          <!-- 累计销售额仅商家本人可见(后端对非本人返回 null) -->
          <template v-if="merchant.totalSales != null">
            <span class="stat-divider" />
            <span class="stat-item">
              <span class="stat-num">{{ formatCount(merchant.totalSales) }}</span>
              <span class="stat-label">累计销售额(元)</span>
            </span>
          </template>
        </div>
      </div>
      <!-- 收藏店铺: 未登录跳登录页, 已收藏可一键取消 -->
      <el-button
        :type="followed ? 'default' : 'primary'"
        :icon="followed ? StarFilled : Star"
        class="follow-btn"
        round
        @click="toggleFollow"
      >
        {{ followed ? '已收藏' : '收藏店铺' }}
      </el-button>
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
import { useRoute, useRouter } from 'vue-router'
import { Star, StarFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ProductCard from '@/components/ProductCard.vue'
import { getProductsByMerchant, type Product } from '@/api/product'
import { getMerchantInfo, isFollowedMerchant, followMerchant, unfollowMerchant, type MerchantVO } from '@/api/user'
import { resolveImageUrl } from '@/api/upload'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const merchant = ref<MerchantVO | null>(null)
const products = ref<Product[]>([])
const loading = ref(false)
const productsLoading = ref(false)
/** 是否已收藏该店铺(未登录恒为 false) */
const followed = ref(false)

const avatarText = computed(
  () => (merchant.value?.shopName || merchant.value?.username || '店').charAt(0)
)

/** 数量/金额格式化: 整数千分位(销售量件数与销售额元数都不带小数, 界面更干净) */
function formatCount(v: number | string | null | undefined): string {
  return Number(v ?? 0).toLocaleString('zh-CN')
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

/** 登录用户进入店铺页时拉取收藏状态(未登录跳过, 不弹 401) */
async function loadFollowStatus() {
  if (!userStore.isLoggedIn || !merchant.value) return
  try {
    followed.value = await isFollowedMerchant(merchant.value.id)
  } catch {
    // 静默: 状态拉取失败不影响浏览
  }
}

/** 收藏/取消收藏(幂等, 后端兜底防重复) */
async function toggleFollow() {
  if (!merchant.value) return
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再收藏')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (followed.value) {
    await unfollowMerchant(merchant.value.id)
    followed.value = false
    ElMessage.success('已取消收藏')
  } else {
    await followMerchant(merchant.value.id)
    followed.value = true
    ElMessage.success('收藏成功,可在个人中心查看')
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
      followed.value = false
      loadMerchant().then(loadFollowStatus)
      loadProducts()
    }
  }
)

onMounted(() => {
  loadMerchant().then(loadFollowStatus)
  loadProducts()
})
</script>

<style scoped>
.shop {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
/* ---------- 店铺横幅(白底描边 + 品牌渐变顶线 + 星火水印, 与 Profile 一致) ---------- */
.banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px 32px;
  border-radius: var(--radius-card);
  background: var(--bg-card);
  border: 1px solid #eceef1;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
/* 顶线: 3px 品牌渐变, 点出星火品牌色 */
.banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--brand-gradient);
}
/* 星火水印: 右侧四角星形, 极低透明度不抢信息 */
.banner::after {
  content: '✦';
  position: absolute;
  right: 96px;
  top: -34px;
  font-size: 150px;
  line-height: 1;
  color: var(--brand-primary);
  opacity: 0.05;
  transform: rotate(18deg);
  pointer-events: none;
}
.banner-avatar {
  flex-shrink: 0;
  border: 1px solid #e8ebef;
  background: var(--bg-soft);
  color: var(--text-2);
  font-size: 28px;
}
.banner-meta {
  flex: 1;
  min-width: 0;
}
.shop-name {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-1);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-line {
  font-size: 13px;
  color: var(--text-3);
  line-height: 1.9;
}
.shop-desc {
  max-width: 560px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 销售量/销售额: 数字在上标签在下, 并排两栏 */
.stat-line {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 10px;
}
.stat-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.stat-num {
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-1);
}
.stat-num .pct {
  font-style: normal;
  font-size: 13px;
  margin-left: 2px;
  color: var(--text-3);
}
.stat-label {
  font-size: 13px;
  color: var(--text-3);
}
.stat-divider {
  width: 1px;
  height: 22px;
  background: #e8ebef;
}
/* 收藏店铺按钮 */
.follow-btn {
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 6px;
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
