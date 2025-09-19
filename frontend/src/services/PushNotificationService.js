// frontend/src/services/pushNotifications.js
class PushNotificationService {
  constructor() {
    this.swRegistration = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  }

  async init() {
    if (!this.isSupported) {
      console.log('Push notifications not supported');
      return false;
    }
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');
      const permission = await this.requestPermission();
      if (permission === 'granted') {
        await this.subscribeUser();
      }
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  async requestPermission() {
    return await Notification.requestPermission();
  }

  async subscribeUser() {
    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlB64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
      });
      const response = await fetch(`${import.meta.env.VITE_API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subscription,
          userId: localStorage.getItem('userId')
        })
      });
      if (response.ok) {
        console.log('User subscribed to push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to subscribe user:', error);
      return false;
    }
  }

  urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async showLocalNotification(title, options = {}) {
    if (Notification.permission === 'granted' && this.swRegistration) {
      await this.swRegistration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [200, 100, 200],
        ...options
      });
    }
  }
}

export default new PushNotificationService();