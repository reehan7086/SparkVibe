import { apiPost } from '../utils/safeUtils.js';

class AuthService {
    constructor() {
        this.token = localStorage.getItem('sparkvibe_token');
        this.user = this.token ? JSON.parse(localStorage.getItem('sparkvibe_user') || '{}') : null;
    }

    // Initialize Google Sign-In
    async initializeGoogle() {
        return new Promise((resolve) => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: process.env.GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: this.handleGoogleResponse.bind(this),
                    auto_select: false,
                    cancel_on_tap_outside: false
                });
                resolve();
            } else {
                // Load Google Identity Services script
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.onload = () => {
                    window.google.accounts.id.initialize({
                        client_id: process.env.GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID,
                        callback: this.handleGoogleResponse.bind(this)
                    });
                    resolve();
                };
                document.head.appendChild(script);
            }
        });
    }

    // Handle Google Sign-In response
    async handleGoogleResponse(response) {
        try {
            const result = await apiPost('/auth/google', {
                token: response.credential
            });

            if (result.success) {
                this.setAuthData(result.token, result.user);
                window.location.reload(); // Refresh to update app state
            }
        } catch (error) {
            console.error('Google authentication failed:', error);
            throw new Error('Google sign-in failed');
        }
    }

    // Google Sign-In
    async signInWithGoogle() {
        await this.initializeGoogle();
        window.google.accounts.id.prompt();
    }

    // Apple Sign-In
    async signInWithApple() {
        if (!window.AppleID) {
            throw new Error('Apple Sign-In not loaded');
        }

        try {
            const data = await window.AppleID.auth.signIn();

            const result = await apiPost('/auth/apple', {
                identityToken: data.authorization.id_token,
                userData: {
                    name: data.user?.name ? `${data.user.name.firstName} ${data.user.name.lastName}` : null,
                    email: data.user?.email
                }
            });

            if (result.success) {
                this.setAuthData(result.token, result.user);
                return result.user;
            }
        } catch (error) {
            console.error('Apple authentication failed:', error);
            throw new Error('Apple sign-in failed');
        }
    }

    // Set authentication data
    setAuthData(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('sparkvibe_token', token);
        localStorage.setItem('sparkvibe_user', JSON.stringify(user));
    }

    // Sign out
    signOut() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('sparkvibe_token');
        localStorage.removeItem('sparkvibe_user');
        window.location.reload();
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Get current user
    getCurrentUser() {
        return this.user;
    }

    // Get auth token for API requests
    getAuthToken() {
        return this.token;
    }

    // Subscribe to push notifications
    async subscribeToPushNotifications() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push messaging is not supported');
            return null;
        }

        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register('/sw.js');

            // Check if already subscribed
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                // Create new subscription
                const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
                });
            }

            // Send subscription to server
            await apiPost('/subscribe-push', {
                subscription: subscription.toJSON()
            });

            return subscription;
        } catch (error) {
            console.error('Push subscription failed:', error);
            return null;
        }
    }

    // Convert VAPID key
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

export default new AuthService();