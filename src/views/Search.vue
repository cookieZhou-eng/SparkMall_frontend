<template>
  <div class="search-page">
    <!-- 页头: 关键词回显 + 商品/商家切换 -->
    <div class="search-head">
      <el-input
        v-model="inputKeyword"
        class="search-input"
        placeholder="搜索商品 / 商家"
        clearable
        :prefix-icon="Search"
        @keyup.enter="onSearch"
      >
        <template #append>
          <el-button :icon="Search" @click="onSearch">搜索</el-button>
        </template>
      </el-input>
      <el-tabs v-model="activeTab" class="tabs">
        <el-tab-pane label="商品" name="product" />
        <el-tab-pane label="商家" name="merchant" />
      </el-tabs>
    </div>

    <!-- 商品结果 -->
    <template v-if="activeTab === 'product'">
      <div class="sort-bar">
        <span class="sort-label">排序</span>
        <el-select v-model="sort" size="small" class="sort-select" @change="onSortChange">
          <el-option label="综合/最新" value="default" />
          <el-option label="销量优先" value="sales" />
          <el-option label="价格从低到高" value="priceAsc" />
          <el-option label="价格从高到低" value="priceDesc" />
        </el-select>
      </div>
      <div v-loading="loading" class="grid-wrap">
        <div v-if="products.length" class="grid">
          <ProductCard v-for="p in products" :key="p.id" :product="p" />
        </div>
        <el-empty
          v-else-if="!loading"
          :description="keyword ? `未找到与「${keyword}」相关的商品` : '输入关键词搜索商品'"
        />
      </div>
      <div v-if="total > 0" class="pager">
        <el-pagination
          background
          layout="prev, pager, next, total"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          @current-change="onPageChange"
        />
      </div>
    </template>

    <!-- 商家结果 -->
    <template v-else>
      <div v-loading="loading" class="grid-wrap">
        <div v-if="merchants.length" class="merchant-list">
          <div v-for="m in merchants" :key="m.id" class="merchant-card" @click="goShop(m.id)">
            <el-avatar :src="resolveImageUrl(m.avatar) || undefined" :size="56" class="merchant-avatar">
              {{ (m.shopName || m.username || '店').charAt(0) }}
            </el-avatar>
            <div class="merchant-info">
              <div class="shop-name">{{ m.shopName || '未命名店铺' }}</div>
              <div class="shop-owner">店主:{{ m.username }}</div>
              <div class="shop-desc" :title="m.shopDesc || ''">{{ m.shopDesc || '商家暂未填写店铺简介' }}</div>
            </div>
            <div class="merchant-side">
              <span class="shop-time">开店时间:{{ m.createTime || '—' }}</span>
              <el-button type="primary" size="small" plain>进店逛逛</el-button>
            </div>
          </div>
        </div>
        <el-empty
          v-else-if="!loading"
          :description="keyword ? `未找到与「${keyword}」相关的商家` : '暂无商家入驻'"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import ProductCard from '@/components/ProductCard.vue'
import { getProductList, type Product, type ProductSort } from '@/api/product'
import { searchMerchants, type MerchantVO } from '@/api/user'
import { resolveImageUrl } from '@/api/upload'

const route = useRoute()
const router = useRouter()

/** 当前生效关键词(来自路由 query)与输入框关键词 */
const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
const inputKeyword = ref(keyword.value)
const activeTab = ref<'product' | 'merchant'>('product')

const products = ref<Product[]>([])
const merchants = ref<MerchantVO[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
/** 商品排序: default 综合/最新(不传 sort), 其余传给后端 */
const sort = ref<'default' | ProductSort>('default')

/** 商品 + 商家并行搜索(失败由拦截器弹错, 这里静默) */
async function search() {
  loading.value = true
  try {
    const kw = keyword.value.trim()
    const sortParam = sort.value === 'default' ? undefined : sort.value
    const [productRes, merchantRes] = await Promise.allSettled([
      getProductList({
        page: currentPage.value,
        size: pageSize.value,
        keyword: kw || undefined,
        sort: sortParam as ProductSort | undefined
      }),
      searchMerchants(kw || undefined)
    ])
    if (productRes.status === 'fulfilled') {
      products.value = productRes.value.records || []
      total.value = productRes.value.total || 0
    }
    if (merchantRes.status === 'fulfilled') {
      merchants.value = merchantRes.value || []
    }
  } finally {
    loading.value = false
  }
}

/** 结果页内重新搜索: 统一走 query 参数, 便于刷新/回退保留关键词 */
function onSearch() {
  const kw = inputKeyword.value.trim()
  if (kw === keyword.value.trim()) {
    // 关键词未变化(重复点搜索)时直接重查, 避免 watch 不触发
    currentPage.value = 1
    search()
    return
  }
  router.push({ path: '/search', query: kw ? { keyword: kw } : {} })
}

function onPageChange(page: number) {
  currentPage.value = page
  search()
}

/** 切换排序: 回到第 1 页并按新排序重新请求 */
function onSortChange() {
  currentPage.value = 1
  search()
}

function goShop(id: number) {
  router.push(`/shop/${id}`)
}

// 关键词变化(首次进入 / 头部搜索框再次搜索)时重新搜索
watch(
  () => route.query.keyword,
  (kw) => {
    keyword.value = typeof kw === 'string' ? kw : ''
    inputKeyword.value = keyword.value
    currentPage.value = 1
    search()
  },
  { immediate: true }
)
</script>

<style scoped>
.search-head {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.search-input {
  width: 420px;
  max-width: 100%;
}
.tabs {
  flex: 1;
  min-width: 200px;
}
.tabs :deep(.el-tabs__item) {
  font-size: 15px;
}
.grid-wrap {
  min-height: 200px;
}
.sort-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}
.sort-label {
  font-size: 13px;
  color: var(--text-3);
}
.sort-select {
  width: 150px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}

/* ---------- 商家卡片 ---------- */
.merchant-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}
.merchant-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--bg-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}
.merchant-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}
.merchant-avatar {
  flex-shrink: 0;
  background: var(--brand-primary-bg);
  color: var(--brand-primary);
  font-size: 22px;
}
.merchant-info {
  flex: 1;
  min-width: 0;
}
.shop-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-1);
  transition: color var(--transition-base);
}
.merchant-card:hover .shop-name {
  color: var(--brand-primary);
}
.shop-owner {
  font-size: 13px;
  color: var(--text-3);
  margin: 4px 0;
}
.shop-desc {
  font-size: 13px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.merchant-side {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.shop-time {
  font-size: 12px;
  color: var(--text-3);
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .merchant-list {
    grid-template-columns: 1fr;
  }
}
</style>
