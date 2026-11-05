<template>
  <div class="cart">
    <h2 class="title">🛒 我的购物车</h2>

    <!-- 购物车列表: 支持勾选要结算的商品 -->
    <el-table
      v-if="cart.length"
      :data="cart"
      row-key="id"
      @selection-change="onSelection"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column label="商品" min-width="280">
        <template #default="{ row }">
          <div class="prod">
            <el-image :src="resolveImageUrl(row.mainImage)" fit="cover" class="thumb" lazy>
              <template #error>
                <div class="thumb-fallback">🎁</div>
              </template>
            </el-image>
            <span class="pname">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="单价(¥)" width="120">
        <template #default="{ row }">{{ row.price.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="数量" width="180">
        <template #default="{ row }">
          <el-input-number
            v-model="row.quantity"
            :min="1"
            :max="99"
            size="small"
            @change="sync"
          />
        </template>
      </el-table-column>
      <el-table-column label="小计(¥)" width="120">
        <template #default="{ row }">
          {{ (row.price * row.quantity).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ $index }">
          <el-button type="danger" size="small" @click="remove($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-else description="购物车空空如也,去逛逛吧~" />

    <!-- 底部栏: 只统计勾选的商品, 未勾选的不参与结算 -->
    <div v-if="cart.length" class="footer">
      <span class="tip">已选 <b>{{ selected.length }}</b> 件</span>
      <div class="total">
        合计:<span class="amount">¥{{ selectedTotal.toFixed(2) }}</span>
      </div>
      <el-button type="primary" size="large" @click="checkout">
        去结算<span v-if="selected.length">({{ selected.length }})</span>
      </el-button>
    </div>

    <!-- 结算弹窗: 复用通用支付弹窗(选地址 + 支付方式 + 模拟支付) -->
    <PaymentDialog
      v-model="payVisible"
      :items="selectedItems"
      :amount="selectedTotal"
      @paid="onPaid"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getCart, saveCart, removeCartItems, type CartItem } from '@/utils/cart'
import { resolveImageUrl } from '@/api/upload'
import { useUserStore } from '@/stores/user'
import PaymentDialog from '@/components/PaymentDialog.vue'

const router = useRouter()
const userStore = useUserStore()

const cart = ref<CartItem[]>([])
// 当前勾选(结算)的商品行
const selected = ref<CartItem[]>([])

function onSelection(rows: CartItem[]) {
  selected.value = rows
}

// 勾选商品汇总成下单条目
const selectedItems = computed(() =>
  selected.value.map((i) => ({ productId: i.id, count: i.quantity }))
)

// 勾选商品应付金额
const selectedTotal = computed(() =>
  selected.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

// 数量变化后回写 localStorage
function sync() {
  saveCart(cart.value)
}

function remove(index: number) {
  cart.value.splice(index, 1)
  saveCart(cart.value)
}

// ============ 结算(可选勾选商品结算) ============
const payVisible = ref(false)

/**
 * 去结算: 只对勾选的商品发起结算。
 * 未勾选任何商品时提示; 打开通用支付弹窗, 内部完成"选地址->建单锁定库存->模拟支付"。
 */
function checkout() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  if (!selected.value.length) {
    ElMessage.warning('请先勾选要结算的商品')
    return
  }
  payVisible.value = true
}

/**
 * 支付成功后: 把已下单的商品从购物车移除(其余未结算的保留),
 * 然后跳转订单列表。拆单时 orders 为多个订单, 汇总其商品后一并清理。
 */
function onPaid(orders: { items: { productId: number }[] }[]) {
  removeCartItems(orders.flatMap((o) => o.items.map((it) => it.productId)))
  cart.value = getCart()
  router.push('/orders')
}

onMounted(() => {
  cart.value = getCart()
})
</script>

<style scoped>
.cart {
  background: var(--bg-card);
  padding: var(--space-4);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.title {
  position: relative;
  margin: 0 0 20px;
  padding-left: 12px;
  font-size: 20px;
  color: var(--text-1);
}
.title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: var(--brand-primary);
}
.prod {
  display: flex;
  align-items: center;
  gap: 12px;
}
.thumb {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  flex-shrink: 0;
  background: var(--bg-soft);
}
.thumb-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.pname {
  font-size: 14px;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f1f3;
}
.tip {
  margin-right: auto;
  font-size: 14px;
  color: var(--text-2);
}
.total {
  font-size: 16px;
  color: var(--text-1);
}
.amount {
  font-size: 24px;
  color: var(--brand-primary);
  font-weight: 700;
  margin-left: 4px;
}
</style>