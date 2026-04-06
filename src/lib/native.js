// src/lib/native.js
// Abstraction des capacités natives (Capacitor) avec fallback web
// Les plugins sont lazy-importés pour ne pas alourdir le bundle web

let _isNative = false;
let _platform = 'web';

try {
  const { Capacitor } = await import('@capacitor/core');
  _isNative = Capacitor.isNativePlatform();
  _platform = Capacitor.getPlatform();
} catch {
  // @capacitor/core non installé — on est sur le web
}

export const isNative = _isNative;
export const platform = _platform;

// Vibration tactile au scan QR
export async function vibrate() {
  if (isNative) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch { /* plugin non installé */ }
  } else if (navigator.vibrate) {
    navigator.vibrate(100);
  }
}

// Partage natif (code parrainage, lien projet, etc.)
export async function shareContent(title, text, url) {
  if (isNative) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url });
      return;
    } catch { /* fallback web */ }
  }
  if (navigator.share) {
    await navigator.share({ title, text, url });
  } else {
    await navigator.clipboard.writeText(url);
  }
}

// Push notifications (natif uniquement)
export async function registerPush() {
  if (!isNative) return null;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive === 'granted') await PushNotifications.register();
    return perm;
  } catch {
    return null;
  }
}

// Deep links (natif uniquement)
export async function setupDeepLinks(callback) {
  if (!isNative) return;
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('appUrlOpen', (event) => {
      const slug = event.url.split('reseaux-resident.fr').pop();
      if (slug) callback(slug);
    });
  } catch { /* plugin non installé */ }
}

// Initialisation native (appelée une fois au démarrage)
export async function initNative() {
  if (!isNative) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* ignore */ }
}
