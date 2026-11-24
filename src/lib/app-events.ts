/**
 * PWA 检测到新版本接管后，用这个事件通知页面做软刷新。
 * 不用 location.reload() 是为了不打断当前会话（尤其是全屏状态）。
 */
export const SOFT_REFRESH_EVENT = 'app:soft-refresh';
