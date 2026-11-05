<template>
  <div v-loading="loading" class="merchant">
    <!-- 顶部: 标题 + 新增按钮 -->
    <div class="head">
      <h2 class="title">🏪 商家中心</h2>
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
      <el-tab-pane label="商品管理" name="products">
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
                <div class="thumb-fallback">🎁</div>
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

      <el-tab-pane label="卖出订单" name="sold">
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
                    <div class="thumb-fallback sm-fallback">🎁</div>
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
    </el-tabs>

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
        <el-form-item v-if="!form.id" label="库存" prop="stock">
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
                <div class="preview-error">🎁</div>
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
                    <div class="preview-error">🎁</div>
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
import { resolveImageUrl, uploadImage } from '@/api/upload'
import type { UploadRequestOptions } from 'element-plus'

const list = ref<MerchantProduct[]>([])
const total = ref(0)
const categories = ref<Category[]>([])
const loading = ref(false)

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

async function loadSold() {
  soldLoading.value = true
  try {
    const page = await getSoldOrders(soldPage.value, soldSize)
    soldOrders.value = page.records
    soldTotal.value = page.total
  } finally {
    soldLoading.value = false
  }
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
      getMerchantProductList(),
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
        detailImages: form.detailImages
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
})
</script>

<style scoped>
.merchant {
  background: var(--bg-card);
  padding: var(--space-4);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.title {
  position: relative;
  margin: 0;
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

/* ---------- 统计条 ---------- */
.stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
  margin-bottom: 20px;
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
  padding: 16px 20px;
  background: var(--bg-soft);
  border-radius: var(--radius-control);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: #fff;
  flex-shrink: 0;
}
.stat-icon.total {
  background: var(--brand-gradient);
}
.stat-icon.on {
  background: linear-gradient(135deg, #2bd99f 0%, #00b578 100%);
}
.stat-icon.off {
  background: linear-gradient(135deg, #b6bec8 0%, #86909c 100%);
}
.stat-num {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-1);
}
.stat-label {
  font-size: 13px;
  color: var(--text-3);
}
/* 总销售额大卡片: 金额主色加粗 */
.sales-card {
  background: var(--brand-primary-bg);
}
.sales-num {
  font-size: 28px;
  color: var(--brand-primary);
  font-weight: 700;
}
.stat-icon.pending {
  background: linear-gradient(135deg, #ffc069 0%, #fa8c16 100%);
}
.stat-icon.goods {
  background: var(--brand-gradient);
}

/* ---------- 视图页签 ---------- */
.tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
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
