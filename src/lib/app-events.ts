/**
 * PWA 检测到新版本接管后，用这个事件通知页面做一次可控刷新。
 * 不用 location.reload() 是为了不打断当前会话（尤其是全屏状态）。
 */
export const SOFT_REFRESH_EVENT = 'app:soft-refresh';

/**
 * 页面从后台 / 锁屏 / bfcache 恢复的统一信号。
 *
 * 历史问题：preloader、头像等模块各自监听 visibilitychange 与 pageshow，
 * 各自判断事件先后顺序。移动端恢复时这些事件的顺序并不稳定
 * （可能只来一个、可能先 pageshow 再 visibilitychange、可能都不来），
 * 导致某些模块没收到恢复信号，卡在 loading / opacity-0 而表现为白屏。
 *
 * 现在由 PageRestoreCoordinator 单点监听并用这个事件广播，
 * 所有消费者只认这一个信号，不再各自判断事件顺序。
 */
export const PAGE_RESTORE_EVENT = 'app:page-restore';
