<template>
  <div class="switch-page">
    <el-page-header content="切换账号" @back="router.back()" class="header" />

    <div class="tip">
      已保存的账号可直接切换, 无需重新输入密码; 仅保存登录令牌与展示信息, 不保存密码。
    </div>

    <div class="account-list">
      <div
        v-for="a in accounts"
        :key="a.userId"
        class="account-card"
        :class="{ current: a.userId === currentUserId }"
        @click="onSwitch(a)"
      >
        <el-avatar :src="resolveImageUrl(a.avatar) || undefined" :size="52" class="acc-avatar">
          {{ (a.username || 'U').charAt(0).toUpperCase() }}
        </el-avatar>
        <div class="acc-info">
          <div class="acc-name-row">
            <span class="acc-name">{{ a.username }}</span>
            <el-tag
              size="small"
              effect="light"
              round
              :class="a.role === 'merchant' ? 'role-tag merchant' : 'role-tag customer'"
            >
              {{ a.role === 'merchant' ? '商家' : '顾客' }}
            </el-tag>
          </div>
          <span class="acc-meta">保存于 {{ formatSavedAt(a.savedAt) }}</span>
        </div>
        <el-tag v-if="a.userId === currentUserId" type="success" effect="plain" class="cur-tag">
          当前账号
        </el-tag>
        <el-button
          v-else
          type="danger"
          link
          :icon="Delete"
          class="remove-btn"
          @click.stop="onRemove(a)"
        >移除</el-button>
      </div>

      <el-empty v-if="!accounts.length" description="暂无已保存的账号" :image-size="90" />
    </div>

    <div class="add-wrap">
      <el-button type="primary" :icon="Plus" @click="addAccount">添加账号</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Delete, Plus } from '@element-plus/icons-vue'
import type { UserVO } from '@/api/user'
import { resolveImageUrl } from '@/api/upload'
import { useUserStore } from '@/stores/user'
import {
  isTokenExpired,
  listAccounts,
  removeAccount,
  type SavedAccount
} from '@/utils/accountStore'

const router = useRouter()
const userStore = useUserStore()

const accounts = ref<SavedAccount[]>([])

/** 当前登录账号 id(用于高亮与禁止误删) */
const currentUserId = computed(() => userStore.userInfo?.id)

function refresh() {
  accounts.value = listAccounts()
}

function formatSavedAt(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 切换账号: 先校验 token 的 exp, 过期则提示并移除;
 * 有效则写入 localStorage(token/userInfo, 沿用现有 key)并同步 Pinia 内存态, 再回首页。
 */
function onSwitch(account: SavedAccount) {
  if (account.userId === currentUserId.value) return
  if (isTokenExpired(account.token)) {
    ElMessage.warning(`「${account.username}」的登录已过期, 请重新登录`)
    removeAccount(account.userId)
    refresh()
    return
  }
  const info: UserVO = {
    id: account.userId,
    username: account.username,
    nickname: null,
    phone: null,
    email: null,
    avatar: account.avatar,
    gender: null,
    role: account.role,
    shopName: null,
    shopDesc: null,
    createTime: null
  }
  localStorage.setItem('token', account.token)
  localStorage.setItem('userInfo', JSON.stringify(info))
  // 同步 store 内存态, 避免页面仍显示旧账号信息(刷新后会从 localStorage 恢复)
  userStore.token = account.token
  userStore.userInfo = info
  ElMessage.success(`已切换为「${account.username}」`)
  router.push('/home')
}

/** 移除账号: 仅删除本地记录, 不调用后端登出接口, 避免把他人 token 加入黑名单 */
async function onRemove(account: SavedAccount) {
  try {
    await ElMessageBox.confirm(
      `确定从本机移除账号「${account.username}」吗? 不会影响该账号的登录状态。`,
      '移除账号',
      { type: 'warning' }
    )
  } catch {
    return
  }
  removeAccount(account.userId)
  refresh()
  ElMessage.success('已移除本地账号记录')
}

/** 添加账号: 带 add=1 打开登录页(路由守卫据此放行已登录用户) */
function addAccount() {
  router.push('/login?add=1')
}

onMounted(refresh)
</script>

<style scoped>
.switch-page {
  background: var(--bg-card);
  padding: var(--space-4);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.header {
  margin-bottom: 12px;
}
.tip {
  margin-bottom: 20px;
  padding: 10px 14px;
  border-radius: var(--radius-control);
  background: var(--brand-primary-bg);
  color: var(--text-2);
  font-size: 13px;
}
.account-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.account-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 14px 16px;
  border: 1px solid #f0f1f3;
  border-radius: var(--radius-control);
  cursor: pointer;
  transition: border-color var(--transition-base), box-shadow var(--transition-base), transform var(--transition-base);
}
.account-card:hover {
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-card);
}
.account-card.current {
  border-color: var(--brand-primary);
  background: var(--brand-primary-bg);
  cursor: default;
}
.acc-avatar {
  flex-shrink: 0;
  background: var(--brand-primary-bg);
  color: var(--brand-primary);
  font-size: 20px;
}
.acc-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.acc-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.acc-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.role-tag {
  border: none;
}
.role-tag.customer {
  background: var(--brand-primary-bg);
  color: var(--brand-primary);
}
.role-tag.merchant {
  background: #fff7e6;
  color: #d48806;
}
.acc-meta {
  font-size: 12px;
  color: var(--text-3);
}
.cur-tag {
  flex-shrink: 0;
}
.remove-btn {
  flex-shrink: 0;
}
.add-wrap {
  margin-top: var(--space-4);
  text-align: center;
}
</style>
