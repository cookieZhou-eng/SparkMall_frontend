<template>
  <el-card class="product-card" shadow="hover" :body-style="{ padding: 0 }">
    <div class="img-wrap" @click="goDetail">
      <el-image :src="resolveImageUrl(product.mainImage)" fit="cover" class="img" lazy>
        <template #error>
          <div class="img-fallback">暂无图片</div>
        </template>
      </el-image>
    </div>

    <div class="info">
      <h3 class="name" :title="product.name" @click="goDetail">{{ product.name }}</h3>
      <p class="subtitle" :title="product.subtitle">{{ product.subtitle }}</p>

      <div class="price-row">
        <span class="price">¥{{ product.price.toFixed(2) }}</span>
        <span v-if="product.originalPrice" class="origin">
          ¥{{ product.originalPrice.toFixed(2) }}
        </span>
      </div>

      <div class="bottom">
        <span class="sales">销量 {{ product.sales }}</span>
        <el-button type="primary" size="small" :icon="ShoppingCart" @click.stop="onAddCart">
          加入购物车
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ShoppingCart } from '@element-plus/icons-vue'
import type { Product } from '@/api/product'
import { resolveImageUrl } from '@/api/upload'
import { addToCart } from '@/utils/cart'
import { useUserStore } from '@/stores/user'

const props = defineProps<{ product: Product }>()
const router = useRouter()
const userStore = useUserStore()

function goDetail() {
  router.push(`/product/${props.product.id}`)
}

/** 加购改为后端接口: 未登录先引导登录, 业务错误由 axios 拦截器统一提示 */
async function onAddCart() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  try {
    await addToCart({
      id: props.product.id,
      name: props.product.name,
      mainImage: props.product.mainImage,
      price: props.product.price
    })
    ElMessage.success('已加入购物车')
  } catch {
    // 错误提示由请求拦截器统一处理(如库存不足/已下架)
  }
}
</script>

<style scoped>
.product-card {
  border-radius: var(--radius-card);
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}
.product-card:hover {
  border-color: #ffd3c5;
  box-shadow: var(--shadow-card-hover);
}
.img-wrap {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--bg-soft);
  overflow: hidden;
}
.img {
  width: 100%;
  height: 100%;
  transition: transform var(--transition-base);
}
/* 图片 hover 缩放 */
.img-wrap:hover :deep(.el-image__inner) {
  transform: scale(1.06);
}
.img-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-3);
  background: var(--bg-soft);
}
.info {
  padding: var(--space-2) var(--space-2) var(--space-3);
}
.name {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--transition-base);
}
.name:hover {
  color: var(--brand-primary);
}
.subtitle {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-3);
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
  font-size: 18px;
  color: var(--brand-primary);
  font-weight: 700;
}
.origin {
  font-size: 12px;
  color: #c0c4cc;
  text-decoration: line-through;
}
.bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sales {
  font-size: 12px;
  color: var(--text-3);
}
</style>
