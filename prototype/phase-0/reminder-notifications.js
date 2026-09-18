/* Cognitive Care NER — real reminder delivery
 * Android: Capacitor Local Notifications schedules OS-level notifications that
 * continue when the app is backgrounded/closed. Web: Notification API fallback
 * delivers due reminders while the app is open; the service worker is also used
 * for notification display when requested by the browser.
 */
(() => {
  'use strict';
  const REMINDER_KEY = 'ccner-p1-reminders';
  const native = () => window.Capacitor?.Plugins?.LocalNotifications || null;
  const nativeMode = () => !!native();
  const notificationId = (id) => {
    let h = 0; for (const c of String(id || '').slice(0,80)) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
    return Math.abs(h || 1);
  };
  const readReminders = () => { try { const v = JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]'); return Array.isArray(v) ? v.filter(r => r && r.id && r.time) : []; } catch (_) { return []; } };
  const kindFor = (r) => {
    const s = `${r.kind || ''} ${r.title || ''}`.toLowerCase();
    if (/medicine|medication|pill|tablet|औषध|दवा|ওষুধ|ঔষধ/.test(s)) return 'medicine';
    if (/water|hydration|drink|पानी|जल|জল|পানী/.test(s)) return 'hydration';
    if (/appointment|doctor|hospital|clinic|अपॉइंटमेंट|डॉक्टर|अस्पताल|অ্যাপয়েন্টমেন্ট|ডাক্তৰ|হাসপাতাল/.test(s)) return 'appointment';
    return 'daily';
  };
  const bodyFor = (r) => {
    const kind = kindFor(r);
    if (kind === 'medicine') return 'It is time for your medicine. Please follow your prescribed routine.';
    if (kind === 'hydration') return 'Time for a little water. Take a comfortable sip and stay hydrated.';
    if (kind === 'appointment') return 'You have a medical appointment reminder. Please check your appointment details.';
    return 'A little daily activity is waiting for you. Take it calmly, one step at a time.';
  };
  const nextAt = (time) => {
    const [hh, mm] = String(time).split(':').map(Number); const d = new Date();
    d.setHours(Number.isFinite(hh) ? hh : 9, Number.isFinite(mm) ? mm : 0, 0, 0);
    if (d <= new Date()) d.setDate(d.getDate() + 1); return d;
  };
  async function requestPermission() {
    if (nativeMode()) {
      const p = await native().requestPermissions();
      return p.display === 'granted' || p.display === 'provisional';
    }
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  }
  async function scheduleNative() {
    const api = native(); if (!api) return false;
    try {
      const perm = await api.checkPermissions();
      if (perm.display !== 'granted' && perm.display !== 'provisional') return false;
      const old = await api.getPending();
      if (old.notifications?.length) await api.cancel({notifications: old.notifications.map(x => ({id: x.id}))});
      const notifications = readReminders().filter(r => r.repeat !== 'once' || nextAt(r.time).getTime() > Date.now() - 60000).map(r => ({
        id: notificationId(r.id), title: `Cognitive Care NER · ${r.title}`, body: bodyFor(r), smallIcon: 'ic_stat_icon_config_sample', schedule: r.repeat === 'daily' ? {at: nextAt(r.time), repeats: true, every: 'day'} : {at: nextAt(r.time)}, extra: {reminderId: r.id, kind: kindFor(r)}
      }));
      if (notifications.length) await api.schedule({notifications});
      return true;
    } catch (e) { console.warn('Native reminder scheduling failed', e); return false; }
  }
  let webTimers = [];
  function clearWebTimers() { webTimers.forEach(clearTimeout); webTimers = []; }
  function scheduleWeb() {
    clearWebTimers(); if (!('Notification' in window) || Notification.permission !== 'granted') return;
    readReminders().forEach(r => { const at = nextAt(r.time); const delay = Math.max(1000, at.getTime() - Date.now());
      const fire = () => { try { new Notification(`Cognitive Care NER · ${r.title}`, {body: bodyFor(r), tag: `ccner-${r.id}`, icon: './manifest-icon-192.png'}); } catch (_) {} if (r.repeat === 'daily') webTimers.push(setTimeout(fire, 86400000)); };
      webTimers.push(setTimeout(fire, Math.min(delay, 2147483647)));
    });
  }
  async function sync() { if (nativeMode()) await scheduleNative(); else scheduleWeb(); }
  async function enable() { const ok = await requestPermission(); if (ok) await sync(); return ok; }
  window.addEventListener('online', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  window.addEventListener('ccner:reminders-changed', sync);
  window.CCNERReminderNotifications = { requestPermission, enable, sync, schedule: sync, isNative: nativeMode };
  const boot = () => setTimeout(sync, 900);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
