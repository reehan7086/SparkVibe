// Add this component to your frontend (create components/Leaderboard.jsx)
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    // Refresh leaderboard every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/leaderboard');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setLeaderboard(data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankEmoji = (rank) => {
    switch (rank) {
      case 1: return '👑';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '⭐';
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-orange-500';
      case 2: return 'from-gray-300 to-gray-500';
      case 3: return 'from-amber-600 to-yellow-700';
      default: return 'from-purple-400 to-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="text-center text-white">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="text-center text-red-300">{error}</div>
        <button 
          onClick={fetchLeaderboard}
          className="mt-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 w-full max-w-md"
    >
      <h2 className="text-2xl font-bold text-center mb-6 text-white">
        🏆 Top Vibers
      </h2>
      
      {leaderboard.length === 0 ? (
        <div className="text-center text-white/70">
          No scores yet! Be the first to create a vibe card 🌟
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((user, index) => (
            <motion.div
              key={`${user.username}-${user.rank}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center justify-between p-4 rounded-xl ${
                user.rank <= 3 
                  ? `bg-gradient-to-r ${getRankColor(user.rank)}/20 border-2 border-white/30` 
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getRankEmoji(user.rank)}</span>
                <div>
                  <div className="font-semibold text-white">
                    #{user.rank} {user.username}
                  </div>
                  <div className="text-sm text-white/70">
                    {user.score} vibe points
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="text-lg font-bold text-white">
                  {user.score}
                </div>
                <div className="text-xs text-white/50">pts</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      <div className="mt-4 text-center text-sm text-white/60">
        Create vibe cards (+10 pts) • Share them (+5 pts) ✨
      </div>
      
      <button 
        onClick={fetchLeaderboard}
        className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-colors"
      >
        🔄 Refresh
      </button>
    </motion.div>
  );
};

export default Leaderboard;