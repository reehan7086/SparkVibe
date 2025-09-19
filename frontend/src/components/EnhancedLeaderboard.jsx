import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { apiGet } from '../utils/safeUtils';

const EnhancedLeaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('points');
  const [timeframe, setTimeframe] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);
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

  const fetchEnhancedLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiGet(`/leaderboard-enhanced?category=${category}&timeframe=${timeframe}&limit=20`);
      
      if (response.success) {
        setLeaderboardData(response.data);
      } else {
        setLeaderboardData([]);
      }
    } catch (error) {
      console.error('Failed to fetch enhanced leaderboard:', error);
      setError('Failed to load leaderboard');
      // Fallback data
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

  if (!isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-4"
      >
        <motion.button
          onClick={() => setIsExpanded(true)}
          className="bg-purple-600/90 hover:bg-purple-700/90 backdrop-blur-md border border-white/20 rounded-xl p-3 shadow-xl w-full"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex items-center space-x-2 text-white">
            <span className="text-lg">🏆</span>
            <span className="text-sm font-medium">Leaderboard</span>
          </div>
        </motion.button>
      </motion.div>
    );
  }

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
              onClick={() => setIsExpanded(false)}
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
              {leaderboardData.length > 0 ? (
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
                        <span className="text-lg">{user.avatar}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium text-sm ${
                              user.isCurrentUser ? 'text-purple-200' : 'text-white'
                            }`}>
                              {user.username}
                            </span>
                            {user.isOnline && (
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            )}
                            {user.isCurrentUser && (
                              <span className="text-xs bg-purple-500 text-white px-1 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-white/60">
                            <span>#{user.rank}</span>
                            <span>Lv.{user.level}</span>
                            {user.streak > 0 && <span>🔥{user.streak}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-purple-300">
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

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-white/10 text-center">
            <p className="text-xs text-white/40">
              Updates every 30 seconds
            </p>
            {leaderboardData.length > 0 && (
              <p className="text-xs text-white/40 mt-1">
                Showing top {leaderboardData.length} players
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedLeaderboard;