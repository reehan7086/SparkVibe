const webpush = require('web-push');

class PushNotificationService {
  constructor() {
    // Configure VAPID keys
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  // Subscribe user to push notifications
  async subscribe(userId, subscription) {
    try {
      await PushSubscription.findOneAndUpdate(
        { userId },
        { 
          userId,
          subscription,
          active: true,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Subscription error:', error);
      throw error;
    }
  }

  // Send push notification
  async sendNotification(userId, payload) {
    try {
      const subscription = await PushSubscription.findOne({ 
        userId, 
        active: true 
      });
      
      if (!subscription) {
        console.log('No active subscription for user:', userId);
        return;
      }

      const notification = {
        title: payload.title || 'SparkVibe',
        body: payload.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: payload.data || {},
        actions: payload.actions || []
      };

      await webpush.sendNotification(
        subscription.subscription,
        JSON.stringify(notification)
      );
      
      // Track notification
      await NotificationLog.create({
        userId,
        type: payload.type,
        title: notification.title,
        body: notification.body,
        sentAt: new Date(),
        status: 'sent'
      });
      
      return { success: true };
    } catch (error) {
      console.error('Push notification error:', error);
      
      // Handle expired subscriptions
      if (error.statusCode === 410) {
        await PushSubscription.findOneAndUpdate(
          { userId },
          { active: false }
        );
      }
      
      throw error;
    }
  }

  // Send bulk notifications
  async sendBulkNotifications(userIds, payload) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendNotification(userId, payload))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return { successful, failed, total: userIds.length };
  }

  // Schedule notification
  async scheduleNotification(userId, payload, scheduleTime) {
    // Store in database for cron job to process
    await ScheduledNotification.create({
      userId,
      payload,
      scheduleTime,
      status: 'pending'
    });
    
    return { success: true, scheduledFor: scheduleTime };
  }
}
