<template>
  <div v-loading="loading" class="profile">
    <!-- 顶部渐变横幅卡片 -->
    <div v-if="profile" class="banner">
      <el-avatar
        :src="resolveImageUrl(profile.avatar) || undefined"
        :size="88"
        class="banner-avatar"
      >
        {{ avatarText }}
      </el-avatar>
      <div class="banner-meta">
        <div class="name-row">
          <span class="nickname">{{ profile.nickname || profile.username }}</span>
          <el-tag :class="isMerchant ? 'role-tag merchant' : 'role-tag customer'" size="small" effect="light" round>
            {{ isMerchant ? '商家' : '顾客' }}
          </el-tag>
        </div>
        <div class="meta-line">注册时间:{{ profile.createTime || '—' }}</div>
        <template v-if="isMerchant">
          <div class="meta-line shop-line">🏪 {{ profile.shopName || '未设置店铺名' }}</div>
          <div class="meta-line shop-desc">{{ profile.shopDesc || '暂无店铺简介' }}</div>
        </template>
      </div>
      <div class="banner-actions">
        <el-button text type="primary" :icon="EditPen" @click="openEdit">修改资料</el-button>
      </div>
    </div>

    <!-- 账户信息区块 -->
    <div v-if="profile" class="section">
      <div class="section-head">
        <h3 class="section-title">账户信息</h3>
        <div class="section-ops">
          <el-button text type="primary" :icon="Switch" @click="router.push('/switch-account')">切换账号</el-button>
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
          <span class="field-value">{{ profile.createTime || '—' }}</span>
        </div>
      </div>
    </div>

    <!-- 店铺信息区块(仅商家) -->
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
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EditPen, Lock, Switch } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { resetPassword, sendSmsCode, updatePassword, updateProfile, type UserVO } from '@/api/user'
import { resolveImageUrl, uploadImage } from '@/api/upload'
import type { UploadRequestOptions } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const profile = ref<UserVO | null>(null)
const loading = ref(false)

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

/** 加载个人信息(经由 store 同步持久化 role) */
async function load() {
  loading.value = true
  try {
    profile.value = await userStore.fetchUserInfo()
  } finally {
    loading.value = false
  }
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

/* ---------- 渐变横幅 ---------- */
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
.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.nickname {
  font-size: 22px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.role-tag {
  border: none;
}
.role-tag.customer {
  background: rgba(255, 255, 255, 0.28);
  color: #fff;
}
.role-tag.merchant {
  background: rgba(31, 35, 41, 0.32);
  color: #ffe0c2;
}
.meta-line {
  font-size: 13px;
  opacity: 0.92;
  line-height: 1.9;
}
.shop-line {
  font-size: 14px;
  font-weight: 600;
}
.shop-desc {
  max-width: 560px;
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.banner-actions {
  flex-shrink: 0;
}
.banner-actions :deep(.el-button) {
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 10px 18px;
}
.banner-actions :deep(.el-button:hover) {
  background: rgba(255, 255, 255, 0.3);
}

/* ---------- 分区块卡片 ---------- */
.section {
  background: var(--bg-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 20px 24px;
  transition: box-shadow var(--transition-base);
}
.section:hover {
  box-shadow: var(--shadow-card-hover);
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.section-title {
  position: relative;
  margin: 0;
  padding-left: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-1);
}
.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: var(--brand-primary);
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
</style>
