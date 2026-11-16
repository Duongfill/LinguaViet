import { api } from './api.js';

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export function pushSupport() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, reason: isIOS() && !isStandalone()
      ? 'Trên iPhone/iPad: bấm nút Chia sẻ → "Thêm vào MH chính", rồi mở app từ màn hình chính để bật thông báo (iOS 16.4+).'
      : 'Trình duyệt này chưa hỗ trợ thông báo đẩy.' };
  }
  if (!window.isSecureContext) return { ok: false, reason: 'Thông báo chỉ hoạt động trên HTTPS (hoặc localhost).' };
  return { ok: true };
}

function urlB64ToUint8Array(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function currentSubscription() {
  if (!pushSupport().ok) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// Xin quyền và đăng ký thiết bị này nhận thông báo
export async function enablePush() {
  const sup = pushSupport();
  if (!sup.ok) throw new Error(sup.reason);
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Bạn chưa cho phép thông báo. Hãy bật quyền thông báo cho trang này trong cài đặt trình duyệt.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { publicKey } = await api('/push/key');
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) });
  }
  await api('/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } });
  return sub;
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (sub) {
    await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe();
  }
}
