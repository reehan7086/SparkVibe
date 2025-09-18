import { motion, AnimatePresence } from 'framer-motion';

const NotificationCenter = ({ isVisible, notifications, onClose, onMarkAsRead }) => {
  const getNotificationIcon = (type) => {
    const icons = {
      achievement: '🏆',
      friend_request: '👥',
      friend_accepted: '✅',
      challenge: '🎯',
      challenge_complete: '🏁',
      system: '🔔',
      level_up: '⭐',
      streak: '🔥'
    };
    return icons[type] || '📢';
  };

  const getNotificationColor = (type) => {
    const colors = {
      achievement: 'border-yellow-400/50 bg-yellow-500/10',
      friend_request: 'border-blue-400/50 bg-blue-500/10',
      friend_accepted: 'border-green-400/50 bg-green-500/10',
      challenge: 'border-purple-400/50 bg-purple-500/10',
      challenge_complete: 'border-orange-400/50 bg-orange-500/10',
      system: 'border-gray-400/50 bg-gray-500/10',
      level_up: 'border-pink-400/50 bg-pink-500/10',
      streak: 'border-red-400/50 bg-red-500/10'
    };
    return colors[type] || 'border-white/20 bg-white/5';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours = Math.floor((now - notificationDate) / (1000 * 60 * 60));
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
    
    if (diffInHours > 24) {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours}h ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes}m ago`;
    }
    return 'Just now';
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      onMarkAsRead([notification.id]);
    }
    
    // Handle notification-specific actions
    if (notification.type === 'friend_request' && notification.data?.requesterId) {
      // Could open friend system or show accept/decline options
      console.log('Friend request from:', notification.data.requesterName);
    } else if (notification.type === 'challenge' && notification.data?.challenge) {
      // Could open challenge details
      console.log('Challenge received:', notification.data.challenge);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          className="fixed left-0 top-0 h-full w-80 bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-md border-r border-white/20 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🔔</span>
              <h2 className="text-xl font-bold text-white">Notifications</h2>
            </div>
            <div className="flex items-center space-x-2">
              {notifications.some(n => !n.read) && (
                <button
                  onClick={() => onMarkAsRead()}
                  className="text-xs text-blue-300 hover:text-blue-200 underline"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white text-xl p-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="p-4 space-y-3">
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${
                      getNotificationColor(notification.type)
                    } ${!notification.read ? 'ring-1 ring-white/20' : 'opacity-75'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-white text-sm truncate">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 ml-2"></div>
                          )}
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/60">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          
                          {/* Action buttons for specific notification types */}
                          {notification.type === 'friend_request' && !notification.read && (
                            <div className="flex space-x-1">
                              <button
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle accept friend request
                                  console.log('Accept friend request');
                                }}
                              >
                                Accept
                              </button>
                              <button
                                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle decline friend request
                                  onMarkAsRead([notification.id]);
                                }}
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          
                          {notification.type === 'challenge' && !notification.read && (
                            <button
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle view challenge
                                console.log('View challenge');
                              }}
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional data for specific notification types */}
                    {notification.data?.achievement && (
                      <div className="mt-3 p-2 bg-white/10 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{notification.data.achievement.icon}</span>
                          <div>
                            <p className="text-xs font-medium text-yellow-300">
                              {notification.data.achievement.title}
                            </p>
                            <p className="text-xs text-white/60">
                              +{notification.data.achievement.points} points
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {notification.data?.challenge && (
                      <div className="mt-3 p-2 bg-white/10 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-purple-300">
                              {notification.data.challenge.type.charAt(0).toUpperCase() + 
                               notification.data.challenge.type.slice(1)} Challenge
                            </p>
                            <p className="text-xs text-white/60">
                              Target: {notification.data.challenge.target}
                            </p>
                          </div>
                          <span className="text-lg">🎯</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="text-4xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-white mb-2">No notifications</h3>
                <p className="text-white/60 text-sm">
                  You're all caught up! Notifications will appear here when you have updates.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-4 border-t border-white/10">
              <div className="text-center">
                <p className="text-xs text-white/50">
                  {notifications.filter(n => !n.read).length} unread • {notifications.length} total
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationCenter;