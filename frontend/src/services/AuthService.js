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
client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
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
                        client_id: process.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID,
                        callback: this.handleGoogleResponse.bind(this)
                    });
                    resolve();
                };
                document.head.appendChild(script);
            }
        });
    }

async handleGoogleResponse(response) {
    try {
        const result = await apiPost('/auth/google', {
            token: response.credential
        });

        if (result.success) {
            this.setAuthData(result.token, result.user);
            // Don't reload - let the app handle the state change
            if (this.onAuthSuccess) {
                this.onAuthSuccess(result.user);
            }
        }
    } catch (error) {
        console.error('Google authentication failed:', error);
        throw new Error('Google sign-in failed');
    }
}

    // Google Sign-In
// In AuthService.js
async signInWithGoogle() {
    return new Promise((resolve, reject) => {
        this.initializeGoogle().then(() => {
            // Store the resolve callback
            this.onAuthSuccess = resolve;
            
            window.google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    reject(new Error('Google sign-in was cancelled or failed'));
                }
            });
        }).catch(reject);
    });
}

    // Email Sign Up
    async signUpWithEmail(userData) {
        try {
            const result = await apiPost('/auth/signup', {
                name: userData.name,
                email: userData.email,
                password: userData.password
            });

            // Don't automatically sign in - wait for email verification
            return result;
        } catch (error) {
            console.error('Email sign up failed:', error);
            throw new Error(error.message || 'Email sign up failed');
        }
    }

    // Email Sign In
    async signInWithEmail(credentials) {
        try {
            const result = await apiPost('/auth/signin', {
                email: credentials.email,
                password: credentials.password
            });

            if (result.success) {
                // Check if email is verified
                if (!result.user.emailVerified) {
                    throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.');
                }

                this.setAuthData(result.token, result.user);
                return result.user;
            } else {
                throw new Error(result.message || 'Invalid email or password');
            }
        } catch (error) {
            console.error('Email sign in failed:', error);
            throw new Error(error.message || 'Email sign in failed');
        }
    }

    // Resend verification email
    async resendVerificationEmail(email) {
        try {
            const result = await apiPost('/auth/resend-verification', {
                email: email
            });
            return result;
        } catch (error) {
            console.error('Failed to resend verification email:', error);
            throw new Error('Failed to resend verification email');
        }
    }

    // Verify email with token
    async verifyEmail(token) {
        try {
            const result = await apiPost('/auth/verify-email', {
                token: token
            });

            if (result.success) {
                // If user was already signed in, update their data
                if (this.user && !this.user.emailVerified) {
                    this.user.emailVerified = true;
                    localStorage.setItem('sparkvibe_user', JSON.stringify(this.user));
                }
                return result;
            }
            
            return result;
        } catch (error) {
            console.error('Email verification failed:', error);
            throw new Error('Email verification failed');
        }
    }

    // Password reset request
    async requestPasswordReset(email) {
        try {
            const result = await apiPost('/auth/reset-password', {
                email: email
            });
            return result;
        } catch (error) {
            console.error('Password reset request failed:', error);
            throw new Error('Failed to send password reset email');
        }
    }

    // Reset password with token
    async resetPassword(token, newPassword) {
        try {
            const result = await apiPost('/auth/reset-password/confirm', {
                token: token,
                password: newPassword
            });
            return result;
        } catch (error) {
            console.error('Password reset failed:', error);
            throw new Error('Password reset failed');
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
        return !!this.token && this.user && (this.user.emailVerified || this.user.isGuest || this.user.provider === 'google');
    }

    // Check if email is verified (for email users)
    isEmailVerified() {
        if (!this.user) return false;
        if (this.user.isGuest || this.user.provider === 'google') return true;
        return this.user.emailVerified || false;
    }

    // Get current user
    getCurrentUser() {
        return this.user;
    }

    // Get auth token for API requests
    getAuthToken() {
        return this.token;
    }

    // Update user profile
    async updateProfile(userData) {
        try {
            const result = await apiPost('/auth/update-profile', userData);
            
            if (result.success) {
                this.user = { ...this.user, ...result.user };
                localStorage.setItem('sparkvibe_user', JSON.stringify(this.user));
                return result.user;
            }
            
            throw new Error(result.message || 'Profile update failed');
        } catch (error) {
            console.error('Profile update failed:', error);
            throw new Error(error.message || 'Profile update failed');
        }
    }

    // Change password (for email users)
    async changePassword(currentPassword, newPassword) {
        try {
            const result = await apiPost('/auth/change-password', {
                currentPassword: currentPassword,
                newPassword: newPassword
            });
            
            return result;
        } catch (error) {
            console.error('Password change failed:', error);
            throw new Error(error.message || 'Password change failed');
        }
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