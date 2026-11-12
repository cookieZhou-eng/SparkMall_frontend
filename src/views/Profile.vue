<template>
  <div v-loading="loading" class="profile">
    <!-- 顶部: 用户横幅(白底 + 品牌渐变顶线 + 星火装饰) -->
    <div v-if="profile" class="banner">
      <el-avatar
        :src="resolveImageUrl(profile.avatar) || undefined"
        :size="80"
        class="banner-avatar"
      >
        {{ avatarText }}
      </el-avatar>
      <div class="banner-meta">
        <div class="name-row">
          <span class="nickname">{{ profile.nickname || profile.username }}</span>
          <el-tag class="role-tag" size="small" effect="plain" round>
            {{ isMerchant ? '商家' : '会员' }}
          </el-tag>
        </div>
        <div class="meta-line">
          {{ profile.username }} · 注册于 {{ (profile.createTime || '').replace('T', ' ').slice(0, 10) }}
        </div>
        <template v-if="isMerchant">
          <div class="meta-line shop-line">{{ profile.shopName || '未设置店铺名' }}</div>
        </template>
      </div>
      <div class="banner-actions">
        <el-button text type="primary" :icon="EditPen" @click="openEdit">修改资料</el-button>
      </div>
    </div>

    <!-- 主体: 左侧分类导航 + 右侧内容面板 -->
    <div class="main">
      <!-- 左侧分类列表(参考主流电商个人中心) -->
      <aside class="side">
        <div class="side-brand">
          <span class="spark-mark">✦</span>星火会员中心
        </div>
        <nav class="menu">
          <a
            class="menu-item"
            :class="{ active: activeMenu === 'info' }"
            @click="activeMenu = 'info'"
          >
            <el-icon><User /></el-icon>我的资料
          </a>
          <a
            class="menu-item"
            :class="{ active: activeMenu === 'orders' }"
            @click="activeMenu = 'orders'"
          >
            <el-icon><Tickets /></el-icon>我的订单
          </a>
          <a
            class="menu-item"
            :class="{ active: activeMenu === 'follows' }"
            @click="activeMenu = 'follows'"
          >
            <el-icon><Star /></el-icon>收藏的商家
            <span v-if="follows.length" class="menu-count">{{ follows.length }}</span>
          </a>

          <div class="menu-divider" />
          <a class="menu-item" @click="router.push('/address')">
            <el-icon><Location /></el-icon>收货地址
          </a>
          <a class="menu-item" @click="router.push('/refunds')">
            <el-icon><ChatDotRound /></el-icon>退款/售后
          </a>

          <div class="menu-divider" />
          <a class="menu-item" @click="openPwd">
            <el-icon><Lock /></el-icon>修改密码
          </a>
          <a class="menu-item" @click="router.push('/switch-account')">
            <el-icon><Switch /></el-icon>切换账号
          </a>
        </nav>
      </aside>

      <!-- 右侧内容面板 -->
      <section class="content">
        <!-- ============ 我的资料 ============ -->
        <template v-if="activeMenu === 'info'">
          <div v-if="profile" class="section">
            <div class="section-head">
              <h3 class="section-title">账户信息</h3>
              <div class="section-ops">
                <el-button text :icon="Lock" @click="openPwd">修改密码</el-button>
                <el-link type="info" :underline="false" class="forgot-link" @click="openForgot">忘记密码?</el-link>
              </div>
            </div>
            <div class="field-grid">
              <div class="field">
                <span class="field-label">用户名</span>
                <span class="field-value">{{ profile.username }}</span>
              </div>
              <div class="field">
                <span class="field-label">昵称</span>
                <span class="field-value">{{ profile.nickname || '未设置' }}</span>
              </div>
              <div class="field">
                <span class="field-label">手机号</span>
                <span class="field-value">{{ profile.phone || '未绑定' }}</span>
              </div>
              <div class="field">
                <span class="field-label">邮箱</span>
                <span class="field-value">{{ profile.email || '未设置' }}</span>
              </div>
              <div class="field">
                <span class="field-label">性别</span>
                <span class="field-value">{{ genderText(profile.gender) }}</span>
              </div>
              <div class="field">
                <span class="field-label">注册时间</span>
                <span class="field-value">{{ (profile.createTime || '—').replace('T', ' ').slice(0, 16) }}</span>
              </div>
            </div>
          </div>

          <div v-if="profile && isMerchant" class="section">
            <div class="section-head">
              <h3 class="section-title">店铺信息</h3>
              <div class="section-ops">
                <el-button text type="primary" :icon="EditPen" @click="openEdit">修改资料</el-button>
              </div>
            </div>
            <div class="field-grid">
              <div class="field">
                <span class="field-label">店铺名称</span>
                <span class="field-value">{{ profile.shopName || '未设置' }}</span>
              </div>
              <div class="field field--full">
                <span class="field-label">店铺简介</span>
                <span class="field-value">{{ profile.shopDesc || '未设置' }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- ============ 我的订单(状态概览) ============ -->
        <template v-else-if="activeMenu === 'orders'">
          <div class="section orders-panel">
            <div class="section-head">
              <h3 class="section-title">我的订单</h3>
              <el-link type="primary" :underline="false" @click="goOrders()">
                全部订单<el-icon><ArrowRight /></el-icon>
              </el-link>
            </div>
            <div class="status-grid">
              <a class="status-cell" @click="goOrders(1)">
                <span class="status-num">{{ orderCounts.paid }}</span>
                <span class="status-label">待付款</span>
              </a>
              <a class="status-cell" @click="goOrders(2)">
                <span class="status-num">{{ orderCounts.shipped }}</span>
                <span class="status-label">待发货</span>
              </a>
              <a class="status-cell" @click="goOrders(3)">
                <span class="status-num">{{ orderCounts.received }}</span>
                <span class="status-label">待收货</span>
              </a>
              <a class="status-cell" @click="goOrders(4)">
                <span class="status-num">{{ orderCounts.reviewed }}</span>
                <span class="status-label">待评价</span>
              </a>
              <a class="status-cell" @click="router.push('/refunds')">
                <span class="status-num">{{ refundCount }}</span>
                <span class="status-label">退款/售后</span>
              </a>
            </div>
            <div class="orders-footer" @click="goOrders()">查看全部订单<el-icon><ArrowRight /></el-icon></div>
          </div>
        </template>

        <!-- ============ 收藏的商家 ============ -->
        <template v-else>
          <div class="section follows-panel">
            <div class="section-head">
              <h3 class="section-title">收藏的商家</h3>
              <span class="follows-total">共 {{ follows.length }} 家</span>
            </div>
            <div v-loading="followsLoading">
              <div v-if="follows.length" class="follow-list">
                <div v-for="m in follows" :key="m.merchantId" class="follow-row">
                  <el-avatar
                    :src="resolveImageUrl(m.avatar) || undefined"
                    :size="52"
                    class="follow-avatar"
                  >
                    {{ (m.shopName || m.username || '店').charAt(0) }}
                  </el-avatar>
                  <div class="follow-meta">
                    <div class="follow-name" @click="router.push(`/shop/${m.merchantId}`)">
                      {{ m.shopName || m.username }}
                    </div>
                    <div class="follow-desc">{{ m.shopDesc || '商家暂未填写店铺简介' }}</div>
                    <div class="follow-time">收藏于 {{ formatTime(m.followTime) }}</div>
                  </div>
                  <div class="follow-ops">
                    <el-button size="small" round @click="router.push(`/shop/${m.merchantId}`)">进店逛逛</el-button>
                    <el-button size="small" text type="danger" @click="unfollow(m)">取消收藏</el-button>
                  </div>
                </div>
              </div>
              <el-empty v-else-if="!followsLoading" description="还没有收藏的商家,逛逛店铺收藏一下吧">
                <el-button type="primary" round @click="router.push('/home')">去逛逛</el-button>
              </el-empty>
            </div>
          </div>
        </template>
      </section>
    </div>

    <!-- 修改资料弹窗 -->
    <el-dialog v-model="editVisible" title="修改资料" width="480px">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="90px">
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="editForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="头像" prop="avatar">
          <div v-loading="avatarUploading" class="avatar-row">
            <el-upload :show-file-list="false" accept="image/*" :http-request="uploadAvatar">
              <el-avatar
                :src="resolveImageUrl(editForm.avatar) || undefined"
                :size="56"
                class="avatar-upload"
              >
                {{ avatarText }}
              </el-avatar>
            </el-upload>
            <el-input
              v-model="editForm.avatar"
              class="url-input"
              placeholder="点击头像上传图片,或直接填写头像 URL"
            />
          </div>
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="editForm.gender" style="width: 100%">
            <el-option
              v-for="g in genderOptions"
              :key="g.value"
              :label="g.label"
              :value="g.value"
            />
          </el-select>
        </el-form-item>
        <template v-if="isMerchant">
          <el-form-item label="店铺名称" prop="shopName">
            <el-input v-model="editForm.shopName" placeholder="请输入店铺名称" />
          </el-form-item>
          <el-form-item label="店铺简介" prop="shopDesc">
            <el-input
              v-model="editForm.shopDesc"
              type="textarea"
              :rows="2"
              maxlength="200"
              show-word-limit
              placeholder="请输入店铺简介"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdVisible" title="修改密码" width="480px">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="90px">
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入旧密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdSaving" @click="savePwd">确认修改</el-button>
      </template>
    </el-dialog>

    <!-- 忘记密码弹窗(手机号 + 短信验证码,无需登录态) -->
    <el-dialog v-model="forgotVisible" title="忘记密码" width="480px">
      <el-form ref="forgotFormRef" :model="forgotForm" :rules="forgotRules" label-width="90px">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="forgotForm.phone" placeholder="请输入注册手机号" />
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <div class="code-row">
            <el-input v-model="forgotForm.code" placeholder="短信验证码" />
            <el-button
              class="code-btn"
              :disabled="countdown > 0"
              :loading="codeSending"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s 后重发` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="forgotForm.newPassword" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="forgotForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="forgotVisible = false">取消</el-button>
        <el-button type="primary" :loading="forgotSaving" @click="saveForgot">重置密码</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight, ChatDotRound, EditPen, Location, Lock, Star, Switch, Tickets, User
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getFollowedMerchants,
  resetPassword,
  sendSmsCode,
  unfollowMerchant,
  updatePassword,
  updateProfile,
  type FollowedMerchantVO,
  type UserVO
} from '@/api/user'
import { getMyOrders, type Order } from '@/api/order'
import { getMyRefunds } from '@/api/refund'
import { resolveImageUrl, uploadImage } from '@/api/upload'
import type { UploadRequestOptions } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const profile = ref<UserVO | null>(null)
const loading = ref(false)

/** 当前激活的左侧导航面板 */
const activeMenu = ref<'info' | 'orders' | 'follows'>('info')

const isMerchant = computed(() => profile.value?.role === 'merchant')
const avatarText = computed(() => {
  const name = profile.value?.nickname || profile.value?.username || 'U'
  return name.charAt(0).toUpperCase()
})

// ============ 性别展示/编辑工具 ============
const genderOptions = [
  { value: 0, label: '保密' },
  { value: 1, label: '男' },
  { value: 2, label: '女' }
]
/** 性别文案(兼容后端返回数字/字符串) */
function genderText(g: number | string | null | undefined): string {
  if (g === null || g === undefined || g === '') return '未设置'
  const map: Record<string, string> = { '0': '保密', '1': '男', '2': '女' }
  return map[String(g)] ?? String(g)
}
function toGenderValue(g: number | string | null | undefined): number {
  const n = Number(g)
  return n === 1 || n === 2 ? n : 0
}

/** 加载个人信息(经由 store 同步持久化 role), 完成后加载订单概览 */
async function load() {
  loading.value = true
  try {
    profile.value = await userStore.fetchUserInfo()
    await Promise.all([loadOrderOverview(), loadRefundCount()])
    if (activeMenu.value === 'follows') loadFollows()
  } finally {
    loading.value = false
  }
}

// ============ 我的订单概览(状态计数) ============
const myOrders = ref<Order[]>([])
const refundCount = ref(0)

/** 订单状态计数: 待付款(1) 待发货(2) 待收货(3) 待评价(已完成且存在未评价明细) */
const orderCounts = computed(() => {
  const count = { paid: 0, shipped: 0, received: 0, reviewed: 0 }
  myOrders.value.forEach((o) => {
    if (o.status === 1) count.paid++
    else if (o.status === 2) count.shipped++
    else if (o.status === 3) count.received++
    else if (o.status === 4 && (o.items || []).some((it) => !it.reviewed)) count.reviewed++
  })
  return count
})

async function loadOrderOverview() {
  if (!profile.value?.id) return
  try {
    myOrders.value = await getMyOrders(profile.value.id)
  } catch {
    // 概览加载失败不阻塞页面
  }
}

async function loadRefundCount() {
  try {
    const data = await getMyRefunds(1, 1)
    refundCount.value = data.total
  } catch {
    // 静默
  }
}

/** 跳转订单列表(可带状态筛选) */
function goOrders(status?: number) {
  router.push(status ? { path: '/orders', query: { status: String(status) } } : '/orders')
}

// ============ 收藏的商家 ============
const follows = ref<FollowedMerchantVO[]>([])
const followsLoading = ref(false)

async function loadFollows() {
  followsLoading.value = true
  try {
    follows.value = await getFollowedMerchants()
  } catch {
    // 拦截器已弹错误
  } finally {
    followsLoading.value = false
  }
}

/** 取消收藏后刷新列表(后端幂等, 前端直接移除即可) */
async function unfollow(m: FollowedMerchantVO) {
  await unfollowMerchant(m.merchantId)
  follows.value = follows.value.filter((f) => f.merchantId !== m.merchantId)
  ElMessage.success(`已取消收藏「${m.shopName || m.username}」`)
}

/** 切到"收藏的商家"面板时懒加载列表 */
watch(activeMenu, (menu) => {
  if (menu === 'follows') loadFollows()
})

/** 时间格式化: ISO 字符串 → "YYYY-MM-DD HH:mm" */
function formatTime(t: string | null | undefined): string {
  return (t || '—').replace('T', ' ').slice(0, 16)
}

// ============ 修改资料 ============
const editVisible = ref(false)
const editSaving = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = reactive({
  nickname: '',
  email: '',
  avatar: '',
  gender: 0,
  shopName: '',
  shopDesc: ''
})
const editRules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }]
}

/** 头像上传:本地文件 -> POST /upload/image -> 相对路径回填表单并预览 */
const avatarUploading = ref(false)
async function uploadAvatar(options: UploadRequestOptions) {
  avatarUploading.value = true
  try {
    editForm.avatar = await uploadImage(options.file)
    ElMessage.success('头像已上传,保存资料后生效')
  } finally {
    avatarUploading.value = false
  }
}

function openEdit() {
  if (!profile.value) return
  editForm.nickname = profile.value.nickname || ''
  editForm.email = profile.value.email || ''
  editForm.avatar = profile.value.avatar || ''
  editForm.gender = toGenderValue(profile.value.gender)
  editForm.shopName = profile.value.shopName || ''
  editForm.shopDesc = profile.value.shopDesc || ''
  editVisible.value = true
  editFormRef.value?.clearValidate()
}

async function saveEdit() {
  await editFormRef.value?.validate()
  editSaving.value = true
  try {
    await updateProfile({
      nickname: editForm.nickname,
      email: editForm.email,
      avatar: editForm.avatar,
      gender: editForm.gender,
      shopName: isMerchant.value ? editForm.shopName : undefined,
      shopDesc: isMerchant.value ? editForm.shopDesc : undefined
    })
    ElMessage.success('资料已更新')
    editVisible.value = false
    await load()
  } finally {
    editSaving.value = false
  }
}

// ============ 修改密码 ============
const pwdVisible = ref(false)
const pwdSaving = ref(false)
const pwdFormRef = ref<FormInstance>()
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== pwdForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

function openPwd() {
  pwdForm.oldPassword = ''
  pwdForm.newPassword = ''
  pwdForm.confirmPassword = ''
  pwdVisible.value = true
  pwdFormRef.value?.clearValidate()
}

async function savePwd() {
  await pwdFormRef.value?.validate()
  pwdSaving.value = true
  try {
    await updatePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    ElMessage.success('密码修改成功,请重新登录')
    pwdVisible.value = false
    userStore.logout()
    router.push('/login')
  } finally {
    pwdSaving.value = false
  }
}

// ============ 忘记密码(短信验证码重置) ============
const forgotVisible = ref(false)
const forgotSaving = ref(false)
const codeSending = ref(false)
const countdown = ref(0)
let timer: number | undefined
const forgotFormRef = ref<FormInstance>()
const forgotForm = reactive({ phone: '', code: '', newPassword: '', confirmPassword: '' })
const forgotRules: FormRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== forgotForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

function openForgot() {
  forgotForm.phone = ''
  forgotForm.code = ''
  forgotForm.newPassword = ''
  forgotForm.confirmPassword = ''
  forgotVisible.value = true
  forgotFormRef.value?.clearValidate()
}

/** 发送短信验证码,成功后开始 60 秒倒计时 */
async function sendCode() {
  if (countdown.value > 0) return
  const ok = await forgotFormRef.value
    ?.validateField('phone')
    .then(() => true)
    .catch(() => false)
  if (!ok) return
  codeSending.value = true
  try {
    await sendSmsCode(forgotForm.phone)
    ElMessage.success('验证码已模拟发送,请查看后端控制台日志')
    countdown.value = 60
    timer = window.setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        window.clearInterval(timer)
        timer = undefined
      }
    }, 1000)
  } finally {
    codeSending.value = false
  }
}

async function saveForgot() {
  await forgotFormRef.value?.validate()
  forgotSaving.value = true
  try {
    await resetPassword({
      phone: forgotForm.phone,
      code: forgotForm.code,
      newPassword: forgotForm.newPassword
    })
    ElMessage.success('密码已重置,请使用新密码登录')
    forgotVisible.value = false
    userStore.logout()
    router.push('/login')
  } finally {
    forgotSaving.value = false
  }
}

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

load()
</script>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ---------- 用户横幅(白底 + 品牌渐变顶线 + 星火水印) ---------- */
.banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 26px 32px;
  border-radius: var(--radius-card);
  background: var(--bg-card);
  border: 1px solid #eceef1;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
/* 顶线: 一条 3px 品牌渐变, 低调点出"星火"品牌色 */
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
  font-size: 26px;
}
.banner-meta {
  flex: 1;
  min-width: 0;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.nickname {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.role-tag {
  background: var(--brand-primary-bg);
  color: var(--brand-primary);
}
.meta-line {
  font-size: 13px;
  color: var(--text-3);
  line-height: 1.9;
}
.shop-line {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-2);
}
.banner-actions {
  flex-shrink: 0;
}
.banner-actions :deep(.el-button) {
  border-radius: var(--radius-control);
  padding: 10px 18px;
}

/* ---------- 主体两栏 ---------- */
.main {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

/* 左侧分类导航 */
.side {
  flex-shrink: 0;
  width: 208px;
  padding: var(--space-3) 12px;
  background: var(--bg-card);
  border: 1px solid #eceef1;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  position: sticky;
  top: 76px;
}
.side-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-2);
  border-bottom: 1px solid #f0f1f3;
}
.spark-mark {
  color: var(--brand-primary);
  font-size: 14px;
}
.menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: var(--radius-control);
  font-size: 14px;
  color: var(--text-2);
  cursor: pointer;
  transition: background-color var(--transition-base), color var(--transition-base);
}
.menu-item:hover {
  color: var(--brand-primary);
  background: var(--brand-primary-bg);
}
.menu-item.active {
  color: var(--brand-primary);
  background: var(--brand-primary-bg);
  font-weight: 600;
}
.menu-item .el-icon {
  font-size: 16px;
}
.menu-count {
  margin-left: auto;
  min-width: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--brand-primary-bg);
  color: var(--brand-primary);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}
.menu-divider {
  height: 1px;
  margin: 8px 10px;
  background: #f0f1f3;
}

/* 右侧内容面板 */
.content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ---------- 分区块卡片 ---------- */
.section {
  background: var(--bg-card);
  border-radius: var(--radius-card);
  border: 1px solid #eceef1;
  box-shadow: var(--shadow-card);
  padding: 20px 24px;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f1f3;
}
.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-1);
}
.section-head :deep(.el-link) {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
}
.section-ops {
  display: flex;
  align-items: center;
  gap: 4px;
}
.section-ops :deep(.el-button) {
  color: var(--text-2);
}
.section-ops :deep(.el-button:hover) {
  color: var(--brand-primary);
  background: var(--brand-primary-bg);
}
.forgot-link {
  font-size: 13px;
  margin-left: 4px;
}

/* 字段: label 灰色小字 + 值深色, 双列对齐 */
.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 32px;
}
.field {
  display: flex;
  align-items: baseline;
  min-width: 0;
  padding: 6px 0;
}
.field--full {
  grid-column: 1 / -1;
}
.field-label {
  flex-shrink: 0;
  width: 72px;
  font-size: 13px;
  color: var(--text-3);
}
.field-value {
  font-size: 14px;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 订单状态概览(数字在上/标签在下, 等分栅格) ---------- */
.status-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}
.status-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 0 14px;
  border-radius: var(--radius-control);
  cursor: pointer;
  transition: background-color var(--transition-base);
}
.status-cell:hover {
  background: var(--bg-soft);
}
.status-num {
  font-size: 26px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-1);
  line-height: 1.1;
}
.status-label {
  font-size: 13px;
  color: var(--text-3);
}
.orders-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 12px;
  padding: 12px 0 4px;
  border-top: 1px solid #f0f1f3;
  font-size: 13px;
  color: var(--text-3);
  cursor: pointer;
  transition: color var(--transition-base);
}
.orders-footer:hover {
  color: var(--brand-primary);
}

/* ---------- 收藏的商家列表 ---------- */
.follows-total {
  font-size: 13px;
  color: var(--text-3);
}
.follow-list {
  display: flex;
  flex-direction: column;
}
.follow-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 4px;
  border-bottom: 1px solid #f0f1f3;
}
.follow-row:last-child {
  border-bottom: none;
}
.follow-avatar {
  flex-shrink: 0;
  border: 1px solid #e8ebef;
  background: var(--bg-soft);
  color: var(--text-2);
  font-size: 20px;
}
.follow-meta {
  flex: 1;
  min-width: 0;
}
.follow-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.follow-name:hover {
  color: var(--brand-primary);
}
.follow-desc {
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.follow-time {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-3);
}
.follow-ops {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ---------- 弹窗内部 ---------- */
.code-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.code-btn {
  flex-shrink: 0;
  min-width: 120px;
}
.avatar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.avatar-upload {
  cursor: pointer;
  flex-shrink: 0;
  transition: box-shadow var(--transition-base), transform var(--transition-base);
}
.avatar-upload:hover {
  box-shadow: 0 0 0 3px var(--brand-primary-bg);
  transform: scale(1.03);
}
.url-input {
  flex: 1;
}

/* 窄屏: 左侧导航折叠为横向条 */
@media (max-width: 860px) {
  .main {
    flex-direction: column;
  }
  .side {
    width: 100%;
    position: static;
  }
  .menu {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .menu-divider {
    display: none;
  }
}
</style>
