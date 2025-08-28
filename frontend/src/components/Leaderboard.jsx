import { useEffect, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { apiGet } from '../utils/safeUtils';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // AutoAnimate hook
  const [containerRef] = useAutoAnimate();

const fetchLeaderboard = async (retries = 3, delay = 1000) => {
  try {
    setLoading(true);
    setError(null);
    console.log('Fetching leaderboard from: /leaderboard');
    const data = await apiGet('/leaderboard');
    console.log('Leaderboard data received:', data);
    setLeaderboardData(data || []);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    if (retries > 0) {
      setTimeout(() => fetchLeaderboard(retries - 1, delay * 2), delay);
    } else {
      setError('Failed to load leaderboard');
      setLeaderboardData([]);
    }
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchLeaderboard();
  const interval = setInterval(() => fetchLeaderboard(3, 1000), 30000);
  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    fetchLeaderboard();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-white/70">Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-fit"
    >
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
        Leaderboard
{error && (
  <div className="text-center text-yellow-400 text-sm mb-4">
    {error}
  </div>
)}
      </h2>
      
      <div className="space-y-3">
        {leaderboardData.map((player, index) => (
          <div
            key={player.username || index}
            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-[1.02]"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
              </span>
              <div>
<p className="font-semibold text-white">{player.username || `Player ${index + 1}`}</p>
<p className="text-sm text-white/60">Rank #{player.rank || index + 1}</p>
<p className="font-bold text-lg text-purple-300">{player.score || 0}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-purple-300">
                {player.score || 0}
              </p>
              <p className="text-xs text-white/60">points</p>
            </div>
          </div>
        ))}
      </div>
      
      {leaderboardData.length === 0 && !loading && (
        <div className="text-center text-white/60 py-8">
          <p>No players yet!</p>
          <p className="text-sm mt-2">Be the first to earn points!</p>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-white/40 text-center">
          Updates every 30 seconds
        </p>
      </div>
    </div>
  );
};

export default Leaderboard;