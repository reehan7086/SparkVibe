import { apiPost } from '../utils/safeUtils.js';

class AuthService {
    constructor() {
        this.token = localStorage.getItem('sparkvibe_token');
        this.user = this.token ? JSON.parse(localStorage.getItem('sparkvibe_user') || '{}') : null;
    }

    // Initialize Google Sign-In with both One Tap and OAuth2 fallback
    async initializeGoogle() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.google && window.google.accounts) {
                resolve();
                return;
            }

            // Load Google Identity Services script
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                console.log('Google Identity Services loaded');
                resolve();
            };
            
            script.onerror = () => {
                console.error('Failed to load Google Identity Services');
                reject(new Error('Failed to load Google Identity Services'));
            };
            
            document.head.appendChild(script);
        });
    }

    // Google Sign-In with fallback approach
    async signInWithGoogle() {
        try {
            await this.initializeGoogle();
            
            // Try OAuth2 popup first (more reliable than One Tap)
            return await this.signInWithGoogleOAuth();
        } catch (error) {
            console.error('Google OAuth failed, trying One Tap fallback:', error);
            
            // Fallback to One Tap if OAuth fails
            try {
                return await this.signInWithGoogleOneTap();
            } catch (oneTapError) {
                console.error('Both Google sign-in methods failed:', oneTapError);
                throw new Error('Google sign-in failed. Please try refreshing the page or use email sign-in.');
            }
        }
    }

    // Google OAuth2 popup method (more reliable)
    async signInWithGoogleOAuth() {
        return new Promise((resolve, reject) => {
            try {
                // Initialize OAuth2
                window.google.accounts.oauth2.initTokenClient({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    scope: 'openid email profile',
                    callback: async (response) => {
                        if (response.error) {
                            reject(new Error(`OAuth error: ${response.error}`));
                            return;
                        }

                        try {
                            // Get user info using the access token
                            const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`);
                            const userInfo = await userInfoResponse.json();
                            
                            // Process the user info
                            const result = await this.processGoogleUserInfo(userInfo, response.access_token);
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                    },
                    error_callback: (error) => {
                        console.error('OAuth2 error:', error);
                        reject(new Error('Google OAuth2 failed'));
                    }
                }).requestAccessToken();
            } catch (error) {
                reject(error);
            }
        });
    }

    // Google One Tap method (fallback)
    async signInWithGoogleOneTap() {
        return new Promise((resolve, reject) => {
            // Set up callback for successful authentication
            window.google.accounts.id.initialize({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                callback: async (response) => {
                    try {
                        const result = await this.processGoogleToken(response.credential);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                },
                auto_select: false,
                cancel_on_tap_outside: true
            });

            // Try One Tap first
            window.google.accounts.id.prompt((notification) => {
                console.log('Google One Tap notification:', notification);
                
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    // One Tap failed, try renderButton approach
                    this.renderGoogleSignInButton().then(resolve).catch(reject);
                }
            });
        });
    }

    // Render Google Sign-In button as last resort
    async renderGoogleSignInButton() {
        return new Promise((resolve, reject) => {
            // Create a temporary container for the button
            const buttonContainer = document.createElement('div');
            buttonContainer.id = 'google-signin-button-temp';
            buttonContainer.style.position = 'fixed';
            buttonContainer.style.top = '50%';
            buttonContainer.style.left = '50%';
            buttonContainer.style.transform = 'translate(-50%, -50%)';
            buttonContainer.style.zIndex = '10000';
            buttonContainer.style.background = 'white';
            buttonContainer.style.padding = '20px';
            buttonContainer.style.borderRadius = '8px';
            buttonContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            
            document.body.appendChild(buttonContainer);

            try {
                window.google.accounts.id.renderButton(buttonContainer, {
                    theme: 'outline',
                    size: 'large',
                    type: 'standard',
                    callback: async (response) => {
                        try {
                            document.body.removeChild(buttonContainer);
                            const result = await this.processGoogleToken(response.credential);
                            resolve(result);
                        } catch (error) {
                            document.body.removeChild(buttonContainer);
                            reject(error);
                        }
                    }
                });

                // Add a cancel button
                const cancelButton = document.createElement('button');
                cancelButton.textContent = 'Cancel';
                cancelButton.style.marginTop = '10px';
                cancelButton.style.padding = '8px 16px';
                cancelButton.style.background = '#f0f0f0';
                cancelButton.style.border = '1px solid #ccc';
                cancelButton.style.borderRadius = '4px';
                cancelButton.style.cursor = 'pointer';
                cancelButton.onclick = () => {
                    document.body.removeChild(buttonContainer);
                    reject(new Error('Sign-in cancelled'));
                };
                buttonContainer.appendChild(cancelButton);

            } catch (error) {
                document.body.removeChild(buttonContainer);
                reject(error);
            }
        });
    }

    // Process Google user info from OAuth2
    async processGoogleUserInfo(userInfo, accessToken) {
        try {
            const result = await apiPost('/auth/google-oauth', {
                userInfo: userInfo,
                accessToken: accessToken
            });

            if (result.success) {
                this.setAuthData(result.token, result.user);
                return result.user;
            } else {
                throw new Error(result.message || 'Google authentication failed');
            }
        } catch (error) {
            console.error('Google user info processing failed:', error);
            throw error;
        }
    }

    // Process Google JWT token from One Tap
    async processGoogleToken(credential) {
        try {
            const result = await apiPost('/auth/google', {
                token: credential
            });

            if (result.success) {
                this.setAuthData(result.token, result.user);
                return result.user;
            } else {
                throw new Error(result.message || 'Google authentication failed');
            }
        } catch (error) {
            console.error('Google token processing failed:', error);
            throw error;
        }
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