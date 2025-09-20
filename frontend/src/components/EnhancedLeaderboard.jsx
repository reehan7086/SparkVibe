import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { apiGet } from '../utils/safeUtils';

const EnhancedLeaderboard = ({ isCollapsed = false, onToggle }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('points');
  const [timeframe, setTimeframe] = useState('all');
  const [isExpanded, setIsExpanded] = useState(!isCollapsed);
  const [error, setError] = useState(null);
  
  const [containerRef] = useAutoAnimate();

  const categories = [
    { id: 'points', name: 'Points', icon: '💎' },
    { id: 'streak', name: 'Streak', icon: '🔥' },
    { id: 'cards', name: 'Cards', icon: '🎨' },
    { id: 'social', name: 'Friends', icon: '👥' }
  ];

  const timeframes = [
    { id: 'all', name: 'All Time' },
    { id: 'month', name: 'This Month' },
    { id: 'week', name: 'This Week' }
  ];

  // FIXED: Define helper functions only once, at the top
  const getDefaultAvatar = (username) => {
    const avatars = ['🚀', '🌟', '🎨', '💫', '🔥', '⚡', '🌈', '🎯', '🏆', '💎'];
    const index = username ? username.length % avatars.length : 0;
    return avatars[index];
  };

  const isCurrentUser = (user) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('sparkvibe_user') || '{}');
      return user.id === currentUser.id || 
             user.email === currentUser.email || 
             user.username === currentUser.name;
    } catch {
      return false;
    }
  };

  const fetchEnhancedLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiGet(`/leaderboard-enhanced?category=${category}&timeframe=${timeframe}&limit=20`);
      
      if (response.success) {
        // FIXED: Process Google profile images properly
        const processedData = response.data.map(user => {
          const isGoogleProfileUrl = user.avatar && user.avatar.startsWith('https://lh3.googleusercontent.com');
          
          return {
            ...user,
            profileImage: isGoogleProfileUrl ? user.avatar : null,
            avatar: isGoogleProfileUrl ? getDefaultAvatar(user.username || user.name) : (user.avatar || getDefaultAvatar(user.username || user.name)),
            score: user.score || user.totalPoints || 0,
            username: user.username || user.name || 'Anonymous User',
            isCurrentUser: isCurrentUser(user)
          };
        });
        
        setLeaderboardData(processedData);
      } else {
        setLeaderboardData([]);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setError('Failed to load leaderboard');
      
      // Enhanced fallback data with proper avatars
      setLeaderboardData([
        {
          id: '1',
          username: 'Vibe Master',
          avatar: '🚀',
          score: 2450,
          rank: 1,
          streak: 25,
          cardsGenerated: 15,
          level: 5,
          isOnline: true,
          achievements: ['Week Warrior', 'Point Master']
        },
        {
          id: '2', 
          username: 'Adventure Seeker',
          avatar: '🌟',
          score: 1890,
          rank: 2,
          streak: 12,
          cardsGenerated: 12,
          level: 3,
          isOnline: false,
          achievements: ['First Steps', 'Social Butterfly']
        },
        {
          id: '3',
          username: 'Mood Explorer',
          avatar: '🎨',
          score: 1234,
          rank: 3,
          streak: 8,
          cardsGenerated: 10,
          level: 2,
          isOnline: true,
          achievements: ['Creative Spirit']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnhancedLeaderboard();
    
    const interval = setInterval(fetchEnhancedLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [category, timeframe]);

  const getRankEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🏅';
  };

  const getScoreForCategory = (user) => {
    switch(category) {
      case 'streak': return user.streak || 0;
      case 'cards': return user.cardsGenerated || 0;
      case 'social': return user.friendsCount || 0;
      default: return user.score || 0;
    }
  };

  // Handle small icon click - show expanded view immediately
  const handleIconClick = () => {
    setIsExpanded(true);
    if (onToggle) {
      onToggle(true);
    }
  };

  // Collapsed/Small Icon View
  if (!isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-4"
      >
        <motion.button
          onClick={handleIconClick} // Direct expansion on click
          className="bg-purple-600/90 hover:bg-purple-700/90 backdrop-blur-md border border-white/20 rounded-xl p-3 shadow-xl w-full group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex items-center space-x-2 text-white">
            <span className="text-lg">🏆</span>
            <span className="text-sm font-medium">Leaderboard</span>
            <div className="flex -space-x-1 ml-auto">
              {leaderboardData.slice(0, 3).map((user, index) => (
                <div key={user.id || index} className="relative">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.username}
                      className="w-6 h-6 rounded-full border border-white/30"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-6 h-6 rounded-full bg-purple-500 border border-white/30 flex items-center justify-center text-xs"
                    style={{ display: user.profileImage ? 'none' : 'flex' }}
                  >
                    {user.avatar}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.button>
      </motion.div>
    );
  }

  // Expanded View
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="w-80 mb-4"
      >
        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🏆</span>
              <h3 className="text-lg font-bold text-white">Enhanced Leaderboard</h3>
            </div>
            <button
              onClick={() => {
                setIsExpanded(false);
                if (onToggle) onToggle(false);
              }}
              className="text-white/60 hover:text-white p-1"
            >
              ✕
            </button>
          </div>

          {/* Category Filters */}
          <div className="grid grid-cols-2 gap-1 mb-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center justify-center space-x-1 py-2 px-2 rounded-lg text-xs transition-all ${
                  category === cat.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Timeframe Filters */}
          <div className="flex space-x-1 mb-4">
            {timeframes.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs transition-all ${
                  timeframe === tf.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {tf.name}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
              <span className="ml-2 text-white/70 text-sm">Loading...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={fetchEnhancedLeaderboard}
                className="text-purple-400 hover:text-purple-300 text-xs mt-1 underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Leaderboard List */}
          {!loading && !error && (
            <div ref={containerRef} className="space-y-2">
              {Array.isArray(leaderboardData) && leaderboardData.length > 0 ? (
                leaderboardData.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      user.isCurrentUser
                        ? 'bg-purple-500/20 border-purple-400/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getRankEmoji(user.rank)}</span>
                      <div className="flex items-center space-x-2">
                        {/* FIXED: User Avatar/Profile Image */}
                        <div className="relative w-8 h-8">
                          {user.profileImage ? (
                            <>
                              <img
                                src={user.profileImage}
                                alt={user.username}
                                className="w-8 h-8 rounded-full border border-white/30 object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div 
                                className="w-8 h-8 rounded-full bg-purple-500 border border-white/30 flex items-center justify-center text-sm absolute inset-0"
                                style={{ display: 'none' }}
                              >
                                {user.avatar || getDefaultAvatar(user.username)}
                              </div>
                            </>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-500 border border-white/30 flex items-center justify-center text-sm">
                              {user.avatar || getDefaultAvatar(user.username)}
                            </div>
                          )}
                          {user.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900"></div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium text-sm ${
                              user.isCurrentUser ? 'text-purple-200' : 'text-white'
                            }`}>
                              {user.username}
                            </span>
                            {user.isCurrentUser && (
                              <span className="text-xs bg-purple-500 text-white px-1 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-white/60">
                            <span>#{user.rank || index + 1}</span>
                            {user.level > 1 && <span>Lv.{user.level}</span>}
                            {user.streak > 0 && <span>🔥{user.streak}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-bold text-lg ${
                        user.isCurrentUser ? 'text-purple-300' : 'text-purple-300'
                      }`}>
                        {getScoreForCategory(user).toLocaleString()}
                      </div>
                      <div className="text-xs text-white/60">
                        {categories.find(c => c.id === category)?.name.toLowerCase()}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-white/60 py-6">
                  <p className="text-sm">No data available</p>
                </div>
              )}
            </div>
          )}

          {/* Refresh Button */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <p className="text-xs text-white/40">
              Updates every 30 seconds
            </p>
            <button
              onClick={fetchEnhancedLeaderboard}
              disabled={loading}
              className="text-xs text-purple-400 hover:text-purple-300 underline disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedLeaderboard;