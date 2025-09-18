import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPost } from '../utils/safeUtils';

const FriendSystem = ({ isVisible, friends, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const tabs = [
    { id: 'friends', name: 'Friends', icon: '👥' },
    { id: 'requests', name: 'Requests', icon: '📬' },
    { id: 'search', name: 'Add Friends', icon: '🔍' }
  ];

  // Fetch friend requests
  const fetchFriendRequests = async () => {
    if (!user || user.isGuest) return;
    
    try {
      setLoading(true);
      const response = await apiGet('/friends/requests');
      if (response.success) {
        setFriendRequests(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch friend requests:', error);
      // Mock data for demo
      setFriendRequests([
        {
          id: '1',
          requester: {
            id: 'user1',
            name: 'Adventure Buddy',
            avatar: '🚀',
            stats: { level: 3, totalPoints: 1250 }
          },
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Search for users
  const searchUsers = async (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await apiGet(`/users/search?q=${encodeURIComponent(query)}`);
      if (response.success) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.warn('Failed to search users:', error);
      // Mock search results for demo
      setSearchResults([
        {
          id: 'search1',
          name: 'Vibe Explorer',
          avatar: '🌟',
          stats: { level: 2, totalPoints: 890 },
          mutualFriends: 2,
          status: null
        },
        {
          id: 'search2',
          name: 'Mood Master',
          avatar: '🎨',
          stats: { level: 4, totalPoints: 2100 },
          mutualFriends: 0,
          status: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (friendId) => {
    try {
      setActionLoading(friendId);
      const response = await apiPost('/friends/request', { friendId });
      if (response.success) {
        setSearchResults(prev => 
          prev.map(user => 
            user.id === friendId 
              ? { ...user, status: 'pending' }
              : user
          )
        );
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (requesterId) => {
    try {
      setActionLoading(requesterId);
      const response = await apiPost('/friends/accept', { requesterId });
      if (response.success) {
        setFriendRequests(prev => 
          prev.filter(req => req.requester.id !== requesterId)
        );
        // Refresh friends list
        fetchFriendRequests();
      }
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Reject friend request
  const rejectFriendRequest = async (requesterId) => {
    try {
      setActionLoading(requesterId);
      const response = await apiPost('/friends/reject', { requesterId });
      if (response.success) {
        setFriendRequests(prev => 
          prev.filter(req => req.requester.id !== requesterId)
        );
      }
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (isVisible && activeTab === 'requests') {
      fetchFriendRequests();
    }
  }, [isVisible, activeTab]);

  useEffect(() => {
    if (activeTab === 'search') {
      const debounce = setTimeout(() => searchUsers(searchQuery), 300);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery, activeTab]);

  if (!isVisible) return null;

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Friends</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-xl p-1"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-500/20 text-purple-200 border-b-2 border-purple-400'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-sm">{tab.icon}</span>
                <span className="text-sm font-medium">{tab.name}</span>
                {tab.id === 'requests' && friendRequests.length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {friendRequests.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-96">
            {activeTab === 'friends' && (
              <div className="space-y-3">
                {friends.length > 0 ? (
                  friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{friend.avatar}</span>
                        <div>
                          <p className="font-medium text-white">{friend.name}</p>
                          <p className="text-xs text-white/60">
                            Level {friend.level} • {friend.totalPoints} points
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {friend.isOnline && (
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        )}
                        <button className="text-white/60 hover:text-white text-sm">
                          💬
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-white/60">
                    <p className="text-sm">No friends yet</p>
                    <p className="text-xs mt-1">Add some friends to get started!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-3">
                {friendRequests.length > 0 ? (
                  friendRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 bg-white/5 rounded-xl"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{request.requester.avatar}</span>
                          <div>
                            <p className="font-medium text-white">{request.requester.name}</p>
                            <p className="text-xs text-white/60">
                              Level {request.requester.stats.level} • {formatTimeAgo(request.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => acceptFriendRequest(request.requester.id)}
                          disabled={actionLoading === request.requester.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                          {actionLoading === request.requester.id ? '...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => rejectFriendRequest(request.requester.id)}
                          disabled={actionLoading === request.requester.id}
                          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                          {actionLoading === request.requester.id ? '...' : 'Decline'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-white/60">
                    <p className="text-sm">No friend requests</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'search' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for friends..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                
                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
                  </div>
                )}

                <div className="space-y-3">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{user.avatar}</span>
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-xs text-white/60">
                            Level {user.stats.level} • {user.stats.totalPoints} points
                            {user.mutualFriends > 0 && ` • ${user.mutualFriends} mutual friends`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => sendFriendRequest(user.id)}
                        disabled={user.status === 'pending' || actionLoading === user.id}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          user.status === 'pending'
                            ? 'bg-yellow-600/50 text-yellow-200 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {actionLoading === user.id ? '...' : 
                         user.status === 'pending' ? 'Pending' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>

                {searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
                  <div className="text-center py-4 text-white/60">
                    <p className="text-sm">No users found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FriendSystem;