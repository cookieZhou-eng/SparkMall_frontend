<template>
  <div class="home">
    <!-- 顶部: 分类菜单(搜索入口已统一至顶栏 MainLayout 搜索框) -->
    <div class="filter-bar">
      <div class="cats">
        <el-button
          :type="activeCategory === 0 ? 'primary' : 'default'"
          @click="selectCategory(0)"
        >全部</el-button>
        <el-button
          v-for="c in categories"
          :key="c.id"
          :type="activeCategory === c.id ? 'primary' : 'default'"
          @click="selectCategory(c.id)"
        >{{ c.name }}</el-button>
      </div>
    </div>

    <!-- 商品网格 -->
    <div v-loading="loading" class="grid-wrap">
      <div v-if="products.length" class="grid">
        <ProductCard v-for="p in products" :key="p.id" :product="p" />
      </div>
      <el-empty v-else-if="!loading" description="暂无商品" />
    </div>

    <!-- 分页: 显示总页数, 不显示商品总数 -->
    <div v-if="total > 0" class="pager">
      <el-pagination
        background
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="currentPage"
        @current-change="onPageChange"
      />
      <span class="page-total">共 {{ totalPages }} 页</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ProductCard from '@/components/ProductCard.vue'
import {
  getCategories,
  getProductList,
  type Category,
  type Product,
  type ProductQuery
} from '@/api/product'

const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(15)
const activeCategory = ref(0) // 0 表示"全部"
const loading = ref(false)

/** 总页数(用于分页区展示, 替代默认的商品总数) */
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

async function loadCategories() {
  try {
    categories.value = (await getCategories()) || []
  } catch {
    // 拦截器已弹错误,这里静默
  }
}

async function loadProducts() {
  loading.value = true
  try {
    const query: ProductQuery = {
      page: currentPage.value,
      size: pageSize.value
    }
    if (activeCategory.value) query.categoryId = activeCategory.value
    const res = await getProductList(query)
    products.value = res.records || []
    total.value = res.total || 0
  } catch {
    // 静默
  } finally {
    loading.value = false
  }
}

function selectCategory(id: number) {
  activeCategory.value = id
  currentPage.value = 1
  loadProducts()
}

function onPageChange(page: number) {
  currentPage.value = page
  loadProducts()
}

onMounted(() => {
  loadCategories()
  loadProducts()
})
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.cats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.grid-wrap {
  min-height: 200px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-3);
}
/* 窄屏逐级降列, 避免 5 列被挤压 */
@media (max-width: 1100px) {
  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 860px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 620px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
}
.page-total {
  font-size: 13px;
  color: var(--text-3);
}
</style>
