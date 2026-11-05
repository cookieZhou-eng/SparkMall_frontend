<template>
  <div class="detail" v-loading="loading">
    <el-page-header content="订单详情" @back="router.back()" class="header" />

    <template v-if="order">
      <!-- 订单状态卡片 -->
      <el-card class="card status-card" shadow="never">
        <div class="status-row">
          <el-tag :type="orderStatusType[order.status]" size="large">
            {{ orderStatusText[order.status] }}
          </el-tag>
          <span class="order-no">订单号:{{ order.orderNo }}</span>
        </div>
        <div class="meta">
          <span>下单时间:{{ formatTime(order.createTime) }}</span>
        </div>
        <!-- 待支付订单: 实时显示距自动取消的倒计时, 最后 60 秒变红提醒 -->
        <div v-if="order.status === 1" class="meta countdown" :class="{ urgent: remain < 60 }">
          ⏳ 距自动取消还有 {{ format(remain) }}, 超时未支付将自动取消并释放库存
        </div>
      </el-card>

      <!-- 收货信息 -->
      <el-card class="card" shadow="never">
        <template #header>收货信息</template>
        <div class="receiver">
          <span>{{ order.receiverName }}</span>
          <span>{{ order.receiverPhone }}</span>
          <span class="addr">{{ order.receiverAddr }}</span>
        </div>
        <div v-if="order.remark" class="remark">备注:{{ order.remark }}</div>
      </el-card>

      <!-- 商品明细(快照) -->
      <el-card class="card" shadow="never">
        <template #header>商品明细</template>
        <el-table :data="order.items" border>
          <el-table-column label="商品" min-width="300">
            <template #default="{ row }">
              <div class="prod">
                <el-image :src="row.productImage" fit="cover" class="thumb" lazy>
                  <template #error>
                    <div class="thumb-fallback">🎁</div>
                  </template>
                </el-image>
                <span class="pname">{{ row.productName }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="单价(¥)" width="120">
            <template #default="{ row }">{{ row.price.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="数量" width="90">
            <template #default="{ row }">x{{ row.count }}</template>
          </el-table-column>
          <el-table-column label="小计(¥)" width="130">
            <template #default="{ row }">
              <span class="amount">{{ row.subtotal.toFixed(2) }}</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="total">
          合计:<span class="amount big">¥{{ order.totalAmount.toFixed(2) }}</span>
        </div>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrderDetail, orderStatusText, orderStatusType, type Order } from '@/api/order'
import { useCountdown } from '@/composables/useCountdown'

const route = useRoute()
const router = useRouter()
const order = ref<Order | null>(null)
const loading = ref(false)

// 待支付订单倒计时: 每秒递减; 归零触发重载(后端超时已自动取消)
const { remaining, set, start, format } = useCountdown(() => reload())
const remain = computed(() => (order.value ? (remaining[order.value.id] ?? 0) : 0))

function formatTime(t: string): string {
  return t ? t.replace('T', ' ').slice(0, 19) : '-'
}

/** 拉取订单详情并注册倒计时 */
async function reload() {
  order.value = await getOrderDetail(Number(route.params.id))
  if (order.value?.status === 1 && order.value.remainingSeconds != null) {
    set(order.value.id, order.value.remainingSeconds)
  }
  start()
}

onMounted(async () => {
  loading.value = true
  try {
    await reload()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.detail {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
}
.header {
  margin-bottom: 16px;
}
.card {
  margin-bottom: 16px;
  border-radius: 8px;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.order-no {
  font-family: Consolas, monospace;
  color: #666;
}
.meta {
  margin-top: 8px;
  color: #999;
  font-size: 13px;
}
.countdown {
  font-family: Consolas, monospace;
  font-weight: 700;
  color: var(--spark-primary);
}
.countdown.urgent {
  color: #f56c6c;
  animation: blink 1s infinite;
}
@keyframes blink {
  50% {
    opacity: 0.4;
  }
}
.receiver {
  display: flex;
  gap: 24px;
  align-items: center;
}
.addr {
  color: #666;
}
.remark {
  margin-top: 8px;
  color: #999;
  font-size: 13px;
}
.prod {
  display: flex;
  align-items: center;
  gap: 12px;
}
.thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  background: #f5f5f5;
  flex-shrink: 0;
}
.thumb-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.pname {
  font-size: 14px;
}
.amount {
  color: var(--spark-primary);
  font-weight: 700;
}
.total {
  text-align: right;
  margin-top: 16px;
  font-size: 15px;
}
.big {
  font-size: 22px;
  margin-left: 6px;
}
</style>
