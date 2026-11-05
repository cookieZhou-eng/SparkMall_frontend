import { onBeforeUnmount, reactive } from 'vue'

/**
 * 倒计时组合式函数: 维护一组"key → 剩余秒数"的倒计时, 每秒递减。
 * 适用于订单列表(多个待支付订单同时倒计时)与订单详情(单个倒计时)。
 * 某 key 归零时自动移除并触发 onExpire 回调, 用于刷新订单状态(后端超时自动取消)。
 */
export function useCountdown(onExpire?: (key: number) => void) {
  const remaining = reactive<Record<number, number>>({})

  /** 设置/刷新某个 key 的剩余秒数; 非正数直接移除 */
  function set(key: number, seconds: number) {
    if (seconds > 0) remaining[key] = Math.max(seconds, 0)
    else delete remaining[key]
  }
                  
  /** 移除某个 key 的倒计时 */
  function clear(key: number) {
    delete remaining[key]
  }

  let timer: number | undefined

  /** 启动每秒递减(幂等, 重复调用不会叠加定时器) */
  function start() {
    if (timer !== undefined) return
    timer = window.setInterval(() => {
      for (const key of Object.keys(remaining)) {
        const k = Number(key)
        remaining[k] -= 1
        if (remaining[k] <= 0) {
          delete remaining[k]
          onExpire?.(k)
        }
      }
    }, 1000)
  }

  function stop() {
    if (timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }

  /** 秒数 → "mm:ss" 或 "hh:mm:ss" 文本 */
  function format(seconds: number): string {
    const s = Math.max(seconds, 0)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    const mm = String(m).padStart(2, '0')
    const ss = String(sec).padStart(2, '0')
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
  }

  onBeforeUnmount(stop)

  return { remaining, set, clear, start, stop, format }
}
