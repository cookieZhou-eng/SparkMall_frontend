<template>
  <div v-loading="loading" class="merchant">
    <!-- 顶部: 标题 + 新增按钮 -->
    <div class="head">
      <div class="head-text">
        <h2 class="title">商家中心</h2>
        <p class="head-desc">管理商品、卖出订单与售后</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增商品</el-button>
    </div>

    <!-- 统计条: 总销售额(大卡片) + 待发货 + 商品数 -->
    <div class="stats">
      <div class="stat-card sales-card">
        <div class="stat-icon total"><el-icon :size="24"><Coin /></el-icon></div>
        <div class="stat-meta">
          <div class="stat-num sales-num">¥{{ formatMoney(stats?.totalSales) }}</div>
          <div class="stat-label">总销售额</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pending"><el-icon :size="22"><Van /></el-icon></div>
        <div class="stat-meta">
          <div class="stat-num">{{ stats?.pendingShipCount ?? 0 }}</div>
          <div class="stat-label">待发货</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon goods"><el-icon :size="22"><Goods /></el-icon></div>
        <div class="stat-meta">
          <div class="stat-num">{{ list.length }}</div>
          <div class="stat-label">商品总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon on"><el-icon :size="22"><Sell /></el-icon></div>
        <div class="stat-meta">
          <div class="stat-num">{{ list.filter((p) => p.status === 1).length }}</div>
          <div class="stat-label">上架中</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon off"><el-icon :size="22"><SoldOut /></el-icon></div>
        <div class="stat-meta">
          <div class="stat-num">{{ list.filter((p) => p.status === 0).length }}</div>
          <div class="stat-label">已下架</div>
        </div>
      </div>
    </div>

    <!-- 视图切换: 商品管理 / 卖出订单(路由保持 /merchant 不变) -->
    <el-tabs v-model="activeTab" class="tabs">
      <el-tab-pane name="products">
        <template #label><span class="tab-label">商品管理</span></template>
    <div class="filter-bar">
      <el-input
        v-model="productName"
        placeholder="按商品名称搜索"
        clearable
        style="width: 220px"
        @keyup.enter="searchProducts"
        @clear="searchProducts"
      />
      <el-select
        v-model="productCategoryId"
        placeholder="全部类型"
        clearable
        style="width: 200px"
        @change="searchProducts"
      >
        <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
      </el-select>
      <el-button type="primary" @click="searchProducts">查询</el-button>
      <el-button @click="resetProducts">重置</el-button>
    </div>
    <el-table v-if="list.length" :data="list">
      <el-table-column label="商品" min-width="260">
        <template #default="{ row }">
          <div class="goods">
            <el-image
              :src="resolveImageUrl(row.mainImage)"
              fit="cover"
              class="thumb"
              :preview-src-list="[resolveImageUrl(row.mainImage)]"
              preview-teleported
            >
              <template #error>
                <div class="thumb-fallback">暂无图片</div>
              </template>
            </el-image>
            <div class="goods-info">
              <div class="goods-name">{{ row.name }}</div>
              <div class="goods-subtitle">{{ row.subtitle }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="120">
        <template #default="{ row }">{{ categoryName(row.categoryId) }}</template>
      </el-table-column>
      <el-table-column label="价格" width="150">
        <template #default="{ row }">
          <span class="price">¥{{ row.price.toFixed(2) }}</span>
          <span v-if="row.originalPrice" class="origin">¥{{ row.originalPrice.toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="销量" prop="sales" width="80" align="center" />
      <el-table-column label="库存" width="80" align="center">
        <template #default="{ row }">{{ row.stock ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :class="row.status === 1 ? 'status-tag on' : 'status-tag off'" size="small" effect="light" round>
            <span class="status-dot" />
            {{ row.status === 1 ? '上架中' : '已下架' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-switch
            class="status-switch"
            :model-value="row.status"
            :active-value="1"
            :inactive-value="0"
            :active-text="'上架'"
            :inactive-text="'下架'"
            inline-prompt
            @change="(v: string | number | boolean) => toggleStatus(row, v)"
          />
          <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!list.length && !loading" description="暂无商品,点击右上角新增" />
      </el-tab-pane>

      <el-tab-pane name="sold">
        <template #label><span class="tab-label">卖出订单</span></template>
        <div class="filter-bar">
          <el-select
            v-model="soldLogisticsStatus"
            placeholder="全部物流状态"
            clearable
            style="width: 170px"
            @change="searchSold"
          >
            <el-option
              v-for="(text, key) in logisticsStatusText"
              :key="key"
              :label="text"
              :value="Number(key)"
            >
              <span class="option-row">
                {{ text }}
                <!-- 待发货选项带角标: 待处理数量一目了然 -->
                <el-badge
                  v-if="Number(key) === 0 && stats?.pendingShipCount"
                  :value="stats.pendingShipCount"
                  :max="99"
                  class="option-badge"
                />
              </span>
            </el-option>
          </el-select>
          <el-date-picker
            v-model="soldDateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            style="width: 210px"
            @change="searchSold"
          />
          <el-button type="primary" @click="searchSold">查询</el-button>
          <el-button @click="resetSold">重置</el-button>
        </div>
        <el-table v-if="soldOrders.length" :data="soldOrders" v-loading="soldLoading">
          <el-table-column label="订单号" min-width="200">
            <template #default="{ row }">
              <div class="order-cell">
                <span class="order-no">{{ row.orderNo }}</span>
                <el-tag
                  :type="orderStatusType[row.orderStatus] ?? 'info'"
                  size="small" effect="light" round
                >{{ orderStatusText[row.orderStatus] ?? '未知' }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="下单时间" width="165">
            <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="收货人" min-width="140">
            <template #default="{ row }">
              <div class="receiver">
                <div class="goods-name">{{ row.receiverName || '—' }}</div>
                <div class="goods-subtitle">{{ row.receiverPhone || '' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="商品" min-width="250">
            <template #default="{ row }">
              <div v-for="item in row.items" :key="item.itemId" class="goods sold-goods">
                <el-image
                  :src="resolveImageUrl(item.productImage)"
                  fit="cover"
                  class="thumb sm"
                  lazy
                >
                  <template #error>
                    <div class="thumb-fallback sm-fallback">暂无图片</div>
                  </template>
                </el-image>
                <span class="goods-name sold-name">
                  {{ item.productName }} <span class="gcount">x{{ item.count }}</span>
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="金额(¥)" width="110" align="right">
            <template #default="{ row }">
              <span class="price">{{ itemsTotal(row).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="物流状态" width="105" align="center">
            <template #default="{ row }">
              <div class="log-tags">
                <el-tag
                  v-for="item in row.items"
                  :key="item.itemId"
                  :type="logisticsStatusType[item.logisticsStatus] ?? 'info'"
                  size="small" effect="light" round
                  class="status-tag"
                >
                  <span class="status-dot" />
                  {{ logisticsStatusText[item.logisticsStatus] ?? '未知' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110" align="center">
            <template #default="{ row }">
              <div class="ops">
                <template v-for="item in row.items" :key="item.itemId">
                  <el-button
                    v-if="item.logisticsStatus === 0 && row.orderStatus === 2"
                    type="primary" size="small" round
                    @click="doShip(item)"
                  >发货</el-button>
                  <el-button
                    v-else-if="item.logisticsStatus === 1"
                    type="success" size="small" round plain
                    @click="doDeliver(item)"
                  >确认送达</el-button>
                </template>
                <span v-if="!hasAction(row)" class="muted">—</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else-if="!soldLoading" description="暂无卖出订单,商品售出后在这里发货" />
        <el-pagination
          v-if="soldTotal > soldSize"
          class="pager"
          background
          layout="total, prev, pager, next"
          :total="soldTotal"
          :page-size="soldSize"
          :current-page="soldPage"
          @current-change="onSoldPageChange"
        />
      </el-tab-pane>

      <!-- 退款售后: 买家对本商家订单发起的退款申请, 由商家审核 -->
      <el-tab-pane name="refund">
        <template #label>
          <span class="tab-label">
            退款售后<el-badge v-if="pendingRefundCount" :value="pendingRefundCount" class="tab-badge" />
          </span>
        </template>
        <div class="filter-bar">
          <el-input
            v-model="refundNo"
            placeholder="按退款单号搜索"
            clearable
            style="width: 220px"
            @keyup.enter="searchRefund"
            @clear="searchRefund"
          />
          <el-select
            v-model="refundStatus"
            placeholder="全部状态"
            clearable
            style="width: 150px"
            @change="searchRefund"
          >
            <el-option
              v-for="(text, key) in refundStatusText"
              :key="key"
              :label="text"
              :value="Number(key)"
            />
          </el-select>
          <el-button type="primary" @click="searchRefund">查询</el-button>
          <el-button @click="resetRefund">重置</el-button>
        </div>

        <el-table v-if="merchantRefunds.length" :data="merchantRefunds" v-loading="refundLoading">
          <el-table-column prop="refundNo" label="退款单号" min-width="190" />
          <el-table-column prop="orderNo" label="订单号" min-width="190" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">{{ refundTypeText[row.type] || '-' }}</template>
          </el-table-column>
          <el-table-column label="退款金额" width="110" align="right">
            <template #default="{ row }">¥{{ Number(row.amount || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="refundStatusType[row.status] || 'info'" size="small" effect="light" round>
                {{ refundStatusText[row.status] || '未知' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="申请时间" width="165">
            <template #default="{ row }">{{ formatTime(row.applyTime) }}</template>
          </el-table-column>
          <el-table-column label="退款原因" min-width="180">
            <template #default="{ row }">{{ row.reason || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openRefundAudit(row)">
                {{ row.status === 1 ? '审核' : '查看' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty
          v-else-if="!refundLoading"
          description="暂无退款申请,买家申请售后后在这里审核"
        />
        <el-pagination
          v-if="refundTotal > refundSize"
          class="pager"
          background
          layout="total, prev, pager, next"
          :total="refundTotal"
          :page-size="refundSize"
          :current-page="refundPage"
          @current-change="onRefundPageChange"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 退款审核弹窗 -->
    <el-dialog v-model="refundDialogVisible" title="退款审核" width="720px">
      <div v-if="refundCurrent">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="退款单号">{{ refundCurrent.refundNo }}</el-descriptions-item>
          <el-descriptions-item label="订单号">{{ refundCurrent.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="退款金额">
            ¥{{ Number(refundCurrent.amount || 0).toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="退款类型">
            {{ refundTypeText[refundCurrent.type] || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="refundStatusType[refundCurrent.status] || 'info'" size="small">
              {{ refundStatusText[refundCurrent.status] || '未知' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatTime(refundCurrent.applyTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="退款原因" :span="2">
            {{ refundCurrent.reason || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="问题描述" :span="2">
            {{ refundCurrent.description || '-' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="refundCurrent.auditRemark" label="审核备注" :span="2">
            {{ refundCurrent.auditRemark }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="refundCurrentImages.length" class="refund-images">
          <div class="refund-images-title">凭证图片</div>
          <div class="refund-image-list">
            <el-image
              v-for="(img, idx) in refundCurrentImages"
              :key="img + idx"
              :src="resolveImageUrl(img)"
              fit="cover"
              class="refund-proof-img"
              :preview-src-list="refundCurrentImages.map(resolveImageUrl)"
              :initial-index="idx"
              preview-teleported
            />
          </div>
        </div>

        <template v-if="refundCurrent.status === 1">
          <div class="refund-audit-title">审核操作</div>
          <el-radio-group v-model="refundApproved">
            <el-radio :value="true">通过并退款</el-radio>
            <el-radio :value="false">拒绝申请</el-radio>
          </el-radio-group>
          <el-input
            v-model="refundRemark"
            type="textarea"
            :rows="3"
            maxlength="255"
            show-word-limit
            class="refund-remark"
            :placeholder="refundApproved ? '审核备注(选填)' : '请填写拒绝原因(建议填写)'"
          />
        </template>
      </div>
      <template #footer>
        <el-button @click="refundDialogVisible = false">关闭</el-button>
        <el-button
          v-if="refundCurrent && refundCurrent.status === 1"
          type="primary"
          :loading="refundSubmitting"
          @click="submitRefundAudit"
        >
          提交审核
        </el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑商品弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑商品' : '新增商品'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <div class="group-title">基础信息</div>
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入商品名称" maxlength="100" />
        </el-form-item>
        <el-form-item label="副标题" prop="subtitle">
          <el-input v-model="form.subtitle" placeholder="一句话卖点(选填)" maxlength="200" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="c in categoryOptions"
              :key="c.value"
              :label="c.label"
              :value="c.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="form.price" :min="0.01" :precision="2" :step="1" />
        </el-form-item>
        <el-form-item label="原价" prop="originalPrice">
          <el-input-number v-model="form.originalPrice" :min="0" :precision="2" :step="1" />
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number v-model="form.stock" :min="0" :step="1" />
        </el-form-item>

        <div class="group-title">商品图片</div>
        <el-form-item label="主图" prop="mainImage">
          <div class="upload-row">
            <el-upload :show-file-list="false" accept="image/*" :http-request="uploadMain">
              <el-button class="upload-btn" plain :loading="uploadingMain">
                <el-icon class="upload-btn-icon"><Plus /></el-icon>
                上传主图
              </el-button>
            </el-upload>
            <el-image
              v-if="form.mainImage"
              :src="resolveImageUrl(form.mainImage)"
              fit="cover"
              class="main-preview"
              :preview-src-list="[resolveImageUrl(form.mainImage)]"
              preview-teleported
            >
              <template #error>
                <div class="preview-error">暂无图片</div>
              </template>
            </el-image>
          </div>
          <el-input v-model="form.mainImage" class="url-input" placeholder="或直接填写主图 URL" />
        </el-form-item>
        <el-form-item label="详情图" prop="detailImages">
          <div class="upload-row">
            <el-upload
              :show-file-list="false"
              accept="image/*"
              multiple
              :http-request="uploadDetail"
            >
              <el-button class="upload-btn" plain :loading="uploadingDetail > 0">
                <el-icon class="upload-btn-icon"><Plus /></el-icon>
                上传详情图
              </el-button>
            </el-upload>
            <div v-if="detailImageList.length" class="detail-thumbs">
              <div v-for="(img, i) in detailImageList" :key="`${img}-${i}`" class="detail-thumb">
                <el-image :src="resolveImageUrl(img)" fit="cover" class="detail-img">
                  <template #error>
                    <div class="preview-error">暂无图片</div>
                  </template>
                </el-image>
                <span class="thumb-del" title="删除" @click="removeDetail(i)">✕</span>
              </div>
            </div>
          </div>
          <el-input
            v-model="form.detailImages"
            type="textarea"
            :rows="2"
            class="url-input"
            placeholder="或直接填写详情图 URL,多张用英文逗号分隔(选填)"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Coin, Goods, Plus, Sell, SoldOut, Van } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import {
  addMerchantProduct,
  deleteMerchantProduct,
  getCategories,
  getMerchantProductList,
  updateMerchantProduct,
  updateMerchantProductStatus,
  type Category,
  type MerchantProduct
} from '@/api/product'
import {
  deliverOrderItem,
  getMerchantStats,
  getSoldOrders,
  logisticsStatusText,
  logisticsStatusType,
  orderStatusText,
  orderStatusType,
  shipOrderItem,
  type MerchantSoldItem,
  type MerchantSoldOrder,
  type MerchantStats
} from '@/api/order'
import {
  merchantAuditRefund,
  merchantGetRefunds,
  refundImages,
  refundStatusText,
  refundStatusType,
  refundTypeText,
  type Refund
} from '@/api/refund'
import { resolveImageUrl, uploadImage } from '@/api/upload'
import type { UploadRequestOptions } from 'element-plus'

const list = ref<MerchantProduct[]>([])
const total = ref(0)
const categories = ref<Category[]>([])
const loading = ref(false)

// ============ 商品筛选(名称模糊 + 分类, 分类包含子分类) ============
const productName = ref('')
const productCategoryId = ref<number | undefined>(undefined)

function searchProducts() {
  load()
}

function resetProducts() {
  productName.value = ''
  productCategoryId.value = undefined
  load()
}

// ============ 视图切换(保持路由 /merchant 不变) ============
const activeTab = ref('products')

// ============ 商家经营统计(总销售额/待发货) ============
const stats = ref<MerchantStats | null>(null)
async function loadStats() {
  stats.value = await getMerchantStats()
}

/** 金额格式化(千分位 + 两位小数) */
function formatMoney(v: number | null | undefined): string {
  return Number(v ?? 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// ============ 卖出订单(按明细分页, 同一订单多明细合并为一组) ============
const soldOrders = ref<MerchantSoldOrder[]>([])
const soldTotal = ref(0)
const soldPage = ref(1)
const soldSize = 10
const soldLoading = ref(false)

// 筛选: 物流状态 + 下单时间范围(日期选择器返回 yyyy-MM-dd)
const soldLogisticsStatus = ref<number | undefined>(undefined)
const soldDateRange = ref<string[] | null>(null)

async function loadSold() {
  soldLoading.value = true
  try {
    const page = await getSoldOrders({
      page: soldPage.value,
      size: soldSize,
      logisticsStatus: soldLogisticsStatus.value,
      startTime: soldDateRange.value?.[0] ? `${soldDateRange.value[0]} 00:00:00` : undefined,
      endTime: soldDateRange.value?.[1] ? `${soldDateRange.value[1]} 23:59:59` : undefined
    })
    soldOrders.value = page.records
    soldTotal.value = page.total
  } finally {
    soldLoading.value = false
  }
}

function searchSold() {
  soldPage.value = 1
  loadSold()
}

function resetSold() {
  soldLogisticsStatus.value = undefined
  soldDateRange.value = null
  soldPage.value = 1
  loadSold()
}

function onSoldPageChange(p: number) {
  soldPage.value = p
  loadSold()
}

function formatTime(t: string): string {
  return t ? t.replace('T', ' ').slice(0, 19) : '-'
}

/** 本商家在该订单中的金额(明细小计求和; 订单可能含其他商家商品) */
function itemsTotal(row: any): number {
  return (row.items as MerchantSoldItem[]).reduce((s, i) => s + Number(i.subtotal ?? 0), 0)
}

/** 该订单组是否有可操作按钮(发货/确认送达) */
function hasAction(row: any): boolean {
  return (row.items as MerchantSoldItem[]).some(
    (i) => (i.logisticsStatus === 0 && row.orderStatus === 2) || i.logisticsStatus === 1
  )
}

/** 发货(二次确认, 操作后刷新列表与统计) */
async function doShip(item: MerchantSoldItem) {
  try {
    await ElMessageBox.confirm(`确定对「${item.productName}」发货吗?`, '发货确认', {
      type: 'warning'
    })
  } catch {
    return
  }
  await shipOrderItem(item.itemId)
  ElMessage.success('已发货')
  await Promise.all([loadSold(), loadStats()])
}

/** 确认送达(二次确认, 操作后刷新列表与统计) */
async function doDeliver(item: MerchantSoldItem) {
  try {
    await ElMessageBox.confirm(`确定「${item.productName}」已送达买家吗?`, '确认送达', {
      type: 'warning'
    })
  } catch {
    return
  }
  await deliverOrderItem(item.itemId)
  ElMessage.success('已确认送达')
  await Promise.all([loadSold(), loadStats()])
}

// ============ 退款售后(买家申请, 商家审核) ============
const merchantRefunds = ref<Refund[]>([])
const refundTotal = ref(0)
/** 待审核退款数量: 用于"退款售后"页签红点角标 */
const pendingRefundCount = ref(0)
const refundPage = ref(1)
const refundSize = 10
const refundLoading = ref(false)
const refundNo = ref('')
const refundStatus = ref<number | undefined>(undefined)

const refundDialogVisible = ref(false)
const refundCurrent = ref<Refund | null>(null)
const refundCurrentImages = computed(() => refundImages(refundCurrent.value?.images))
const refundApproved = ref(true)
const refundRemark = ref('')
const refundSubmitting = ref(false)

async function loadRefunds() {
  refundLoading.value = true
  try {
    const data = await merchantGetRefunds({
      page: refundPage.value,
      size: refundSize,
      refundNo: refundNo.value || undefined,
      status: refundStatus.value
    })
    merchantRefunds.value = data.records
    refundTotal.value = data.total
  } finally {
    refundLoading.value = false
  }
}

function searchRefund() {
  refundPage.value = 1
  loadRefunds()
}

/** 查询待审核退款数量(只取 total, size=1 减少数据传输) */
async function loadPendingRefundCount() {
  try {
    const data = await merchantGetRefunds({ page: 1, size: 1, status: 1 })
    pendingRefundCount.value = data.total
  } catch {
    // 角标统计失败不影响主流程
  }
}

function resetRefund() {
  refundNo.value = ''
  refundStatus.value = undefined
  refundPage.value = 1
  loadRefunds()
}

function onRefundPageChange(p: number) {
  refundPage.value = p
  loadRefunds()
}

function openRefundAudit(row: any) {
  refundCurrent.value = row as Refund
  refundApproved.value = true
  refundRemark.value = ''
  refundDialogVisible.value = true
}

async function submitRefundAudit() {
  if (!refundCurrent.value) return
  if (!refundApproved.value && !refundRemark.value.trim()) {
    ElMessage.warning('拒绝退款时请填写拒绝原因')
    return
  }
  if (refundApproved.value) {
    try {
      await ElMessageBox.confirm(
        '通过后将立即退款给买家, 并将订单置为已退款, 是否继续?',
        '确认退款',
        { type: 'warning' }
      )
    } catch {
      return
    }
  }
  refundSubmitting.value = true
  try {
    await merchantAuditRefund(refundCurrent.value.id, {
      approved: refundApproved.value,
      remark: refundRemark.value
    })
    ElMessage.success(refundApproved.value ? '退款已通过' : '已拒绝该退款申请')
    refundDialogVisible.value = false
    await Promise.all([loadRefunds(), loadStats(), loadSold(), loadPendingRefundCount()])
  } finally {
    refundSubmitting.value = false
  }
}

// ============ 分类:扁平化下拉选项 + id->名称映射 ============
interface CategoryOption {
  value: number
  label: string
}
/** 树形分类扁平化为"父级 / 子级"的叶子选项 */
function flatten(cats: Category[], prefix = ''): CategoryOption[] {
  const out: CategoryOption[] = []
  for (const c of cats) {
    const label = prefix ? `${prefix} / ${c.name}` : c.name
    if (c.children?.length) {
      out.push(...flatten(c.children, label))
    } else {
      out.push({ value: c.id, label })
    }
  }
  return out
}
const categoryOptions = computed(() => flatten(categories.value))

/** 根据分类 id 查名称(找不到返回 —) */
function categoryName(id: number): string {
  const found = categoryOptions.value.find((c) => c.value === id)
  return found ? found.label.split(' / ').pop() || '—' : '—'
}

// ============ 列表 ============
async function load() {
  loading.value = true
  try {
    const [page, cats] = await Promise.all([
      getMerchantProductList({
        name: productName.value || undefined,
        categoryId: productCategoryId.value
      }),
      categories.value.length ? Promise.resolve(categories.value) : getCategories()
    ])
    // 后端返回 Result.PageData: { total, records }
    list.value = page.records
    total.value = page.total
    categories.value = cats
  } finally {
    loading.value = false
  }
}

// ============ 上架/下架 ============
// 形参用宽松类型: el-table 插槽的 row 在 vue-tsc 下被推断为 DefaultRow, 转成 MerchantProduct 使用
async function toggleStatus(row: any, value: string | number | boolean) {
  const status: 0 | 1 = Number(value) === 1 ? 1 : 0
  await updateMerchantProductStatus(row.id, status)
  ElMessage.success(status === 1 ? '已上架' : '已下架')
  await load()
}

// ============ 删除 ============
async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除商品「${row.name}」吗?`, '提示', { type: 'warning' })
  await deleteMerchantProduct(row.id)
  ElMessage.success('已删除')
  await load()
}

// ============ 新增/编辑弹窗 ============
const dialogVisible = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  id: undefined as number | undefined,
  name: '',
  subtitle: '',
  categoryId: undefined as number | undefined,
  price: 0.01,
  originalPrice: 0,
  mainImage: '',
  detailImages: '',
  stock: 10
})
const rules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  mainImage: [{ required: true, message: '请上传主图或填写主图 URL', trigger: 'blur' }]
}

// ============ 图片上传(本地文件 -> POST /upload/image -> 返回相对路径回填表单) ============
/** 详情图列表与表单逗号分隔字符串(后端存储格式)双向同步 */
const detailImageList = computed<string[]>({
  get: () =>
    form.detailImages
      ? form.detailImages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  set: (val) => {
    form.detailImages = val.join(',')
  }
})

const uploadingMain = ref(false)
async function uploadMain(options: UploadRequestOptions) {
  uploadingMain.value = true
  try {
    form.mainImage = await uploadImage(options.file)
    ElMessage.success('主图已上传')
  } finally {
    uploadingMain.value = false
  }
}

const uploadingDetail = ref(0)
async function uploadDetail(options: UploadRequestOptions) {
  uploadingDetail.value++
  try {
    const url = await uploadImage(options.file)
    detailImageList.value = [...detailImageList.value, url]
  } finally {
    uploadingDetail.value--
  }
}

function removeDetail(index: number) {
  detailImageList.value = detailImageList.value.filter((_, i) => i !== index)
}

/** 打开弹窗: 不传参=新增, 传商品=编辑(回填表单); row 用宽松类型(el-table 插槽推断为 DefaultRow) */
function openDialog(product?: any) {
  form.id = product?.id
  form.name = product?.name || ''
  form.subtitle = product?.subtitle || ''
  form.categoryId = product?.categoryId
  form.price = product?.price ?? 0.01
  form.originalPrice = product?.originalPrice ?? 0
  form.mainImage = product?.mainImage || ''
  form.detailImages = product?.detailImages || ''
  form.stock = product?.stock ?? 10
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

async function save() {
  await formRef.value?.validate()
  if (!form.categoryId) return
  saving.value = true
  try {
    if (form.id) {
      await updateMerchantProduct({
        id: form.id,
        name: form.name,
        subtitle: form.subtitle,
        categoryId: form.categoryId,
        price: form.price,
        originalPrice: form.originalPrice,
        mainImage: form.mainImage,
        detailImages: form.detailImages,
        stock: form.stock
      })
      ElMessage.success('商品已更新')
    } else {
      await addMerchantProduct({
        name: form.name,
        subtitle: form.subtitle,
        categoryId: form.categoryId,
        price: form.price,
        originalPrice: form.originalPrice,
        mainImage: form.mainImage,
        detailImages: form.detailImages,
        stock: form.stock
      })
      ElMessage.success('商品已创建')
    }
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  load()
  loadStats()
  loadSold()
  loadRefunds()
  loadPendingRefundCount()
})
</script>

<style scoped>
.merchant {
  background: var(--bg-card);
  border: 1px solid #eceef1;
  border-radius: var(--radius-card);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-1);
}
.head-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

/* ---------- 统计条 ---------- */
.stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1px;
  margin-bottom: 24px;
  background: #eceef1;
  border: 1px solid #eceef1;
  border-radius: var(--radius-card);
  overflow: hidden;
}
@media (max-width: 1100px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--bg-card);
  transition: background-color var(--transition-base);
}
.stat-card:hover {
  background: var(--bg-soft);
}
.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-control);
  border: 1px solid #e8ebef;
  color: var(--text-2);
  flex-shrink: 0;
}
.stat-icon.total,
.stat-icon.goods {
  color: var(--text-2);
}
.stat-icon.on {
  color: var(--brand-success);
}
.stat-icon.off {
  color: var(--text-3);
}
.stat-icon.pending {
  color: var(--brand-warning);
}
.stat-num {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--text-1);
}
.stat-label {
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-3);
}
/* 总销售额: 数字用等宽感强调, 不加底色 */
.sales-num {
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  color: var(--text-1);
  font-weight: 600;
}

/* ---------- 视图页签 ---------- */
.tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
/* 下拉选项内的行内角标(不遮挡选项文字) */
.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.option-badge :deep(.el-badge__content) {
  position: static;
  transform: none;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  background: var(--brand-danger);
}
.tab-badge :deep(.el-badge__content) {
  position: static;
  transform: none;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  background: var(--brand-danger);
}

/* ---------- 筛选栏 ---------- */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

/* ---------- 退款审核弹窗 ---------- */
.refund-images {
  margin-top: 16px;
}
.refund-images-title {
  font-weight: 600;
  color: var(--text-1);
  margin-bottom: 8px;
}
.refund-image-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.refund-proof-img {
  width: 96px;
  height: 96px;
  border-radius: 6px;
  background: var(--bg-soft);
  cursor: pointer;
}
.refund-audit-title {
  margin: 18px 0 10px;
  font-weight: 600;
  color: var(--text-1);
}
.refund-remark {
  margin-top: 12px;
}

/* ---------- 卖出订单表格 ---------- */
.order-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.order-no {
  font-family: Consolas, monospace;
  color: var(--text-2);
}
.receiver {
  line-height: 1.6;
}
.sold-goods {
  padding: 3px 0;
}
.sold-name {
  font-weight: 500;
}
.gcount {
  color: var(--text-3);
  font-size: 12px;
}
.thumb.sm {
  width: 40px;
  height: 40px;
}
.thumb-fallback.sm-fallback {
  width: 40px;
  height: 40px;
  font-size: 18px;
}
.log-tags {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.ops {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.ops .el-button + .el-button {
  margin-left: 0;
}
.muted {
  color: #c0c4cc;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}

/* ---------- 表格 ---------- */
.goods {
  display: flex;
  align-items: center;
  gap: 12px;
}
.thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  flex-shrink: 0;
  background: var(--bg-soft);
  transition: transform var(--transition-base);
}
.thumb:hover {
  transform: scale(1.05);
}
.thumb-fallback {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: var(--bg-soft);
  border-radius: 8px;
}
.goods-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-1);
}
.goods-subtitle {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 4px;
}
.price {
  color: var(--brand-primary);
  font-weight: 700;
}
.origin {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-3);
  text-decoration: line-through;
}
/* 状态 tag: 圆点 + 文案 */
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.status-tag.on {
  color: var(--brand-success);
  background: rgba(0, 181, 120, 0.1);
}
.status-tag.off {
  color: var(--text-3);
  background: #f2f3f5;
}
/* 操作列: 统一尺寸间距 */
.status-switch {
  margin-right: 14px;
}
:deep(.el-table .el-button + .el-button) {
  margin-left: 8px;
}

/* ---------- 弹窗: 表单分组 ---------- */
.group-title {
  position: relative;
  margin: 4px 0 16px;
  padding-left: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
}
.group-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 13px;
  border-radius: 2px;
  background: var(--brand-primary);
}
.group-title + .el-form-item,
.el-form-item + .group-title {
  margin-top: 0;
}
.upload-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}
/* 上传按钮: 虚线框 + hover 主色 */
.upload-btn {
  border-style: dashed;
  border-radius: var(--radius-control);
  color: var(--text-2);
  background: var(--bg-soft);
  transition: all var(--transition-base);
}
.upload-btn:hover {
  color: var(--brand-primary);
  border-color: var(--brand-primary);
  background: var(--brand-primary-bg);
}
.upload-btn-icon {
  margin-right: 2px;
}
.url-input {
  width: 100%;
  margin-top: 8px;
}
.main-preview {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: var(--bg-soft);
  flex-shrink: 0;
}
.preview-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.detail-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.detail-thumb {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-soft);
}
.detail-img {
  width: 100%;
  height: 100%;
}
.thumb-del {
  position: absolute;
  top: 0;
  right: 0;
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 0 0 0 8px;
  cursor: pointer;
  transition: background-color var(--transition-base);
}
.thumb-del:hover {
  background: var(--brand-danger);
}
</style>
