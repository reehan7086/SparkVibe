import { useEffect, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { apiGet } from '../utils/safeUtils';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(3);

  const [containerRef] = useAutoAnimate();

  const getCurrentUser = () => {
    try {
      const userData = localStorage.getItem('sparkvibe_user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  };

  const fetchLeaderboard = async (retries = 3, delay = 1000) => {
    try {
      setLoading(true);
      setError(null);
      setRetryCount(retries);
      console.log('Fetching leaderboard from: /leaderboard');

      const response = await apiGet('/leaderboard');
      console.log('Leaderboard data received:', response);

      let data = [];
      if (response && response.success && Array.isArray(response.data)) {
        data = response.data;
      } else if (response && Array.isArray(response)) {
        data = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        data = response.data;
      } else {
        console.warn('Unexpected leaderboard data format:', response);
        data = [];
      }

      const currentUser = getCurrentUser();
      if (currentUser && !currentUser.isGuest && data.length > 0) {
        const userInLeaderboard = data.find(
          (player) =>
            player.username === currentUser.name ||
            player.id === currentUser.id ||
            player.email === currentUser.email
        );

        if (!userInLeaderboard && (currentUser.totalPoints > 0 || currentUser.stats?.totalPoints > 0)) {
          const userEntry = {
            id: currentUser.id,
            username: currentUser.name,
            score: currentUser.totalPoints || currentUser.stats?.totalPoints || 0,
            totalPoints: currentUser.totalPoints || currentUser.stats?.totalPoints || 0,
            rank: data.length + 1,
            streak: currentUser.streak || currentUser.stats?.streak || 0,
            cardsGenerated: currentUser.cardsGenerated || currentUser.stats?.cardsGenerated || 0,
            cardsShared: currentUser.cardsShared || currentUser.stats?.cardsShared || 0,
            level: currentUser.level || currentUser.stats?.level || 1,
            avatar: currentUser.avatar || '🌟',
            isCurrentUser: true,
          };
          data.push(userEntry);
          console.log('Added current user to leaderboard:', userEntry);
        } else if (userInLeaderboard) {
          userInLeaderboard.score = Math.max(
            userInLeaderboard.score || 0,
            currentUser.totalPoints || currentUser.stats?.totalPoints || 0
          );
          userInLeaderboard.totalPoints = userInLeaderboard.score;
          userInLeaderboard.isCurrentUser = true;
          console.log('Updated current user in leaderboard:', userInLeaderboard);
        }
      }

      data.sort((a, b) => (b.score || b.totalPoints || 0) - (a.score || a.totalPoints || 0));
      data.forEach((player, index) => {
        player.rank = index + 1;
      });

      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      if (retries > 0) {
        setTimeout(() => fetchLeaderboard(retries - 1, delay * 2), delay);
      } else {
        setError('Failed to load leaderboard');
        const currentUser = getCurrentUser();
        if (currentUser && (currentUser.totalPoints > 0 || currentUser.stats?.totalPoints > 0)) {
          setLeaderboardData([
            {
              id: currentUser.id,
              username: currentUser.name,
              score: currentUser.totalPoints || currentUser.stats?.totalPoints || 0,
              totalPoints: currentUser.totalPoints || currentUser.stats?.totalPoints || 0,
              rank: 1,
              streak: currentUser.streak || currentUser.stats?.streak || 0,
              cardsGenerated: currentUser.cardsGenerated || currentUser.stats?.cardsGenerated || 0,
              cardsShared: currentUser.cardsShared || currentUser.stats?.cardsShared || 0,
              level: currentUser.level || currentUser.stats?.level || 1,
              avatar: currentUser.avatar || '🌟',
              isCurrentUser: true,
            },
          ]);
          console.log('Showing current user in leaderboard during error state');
        } else {
          setLeaderboardData([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(3, 1000), 30000); // Changed to 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'sparkvibe_user') {
        console.log('User data changed, refreshing leaderboard');
        setTimeout(() => fetchLeaderboard(1, 500), 1000);
      }
    };

    const handleUserUpdate = () => {
      console.log('User update detected, refreshing leaderboard');
      setTimeout(() => fetchLeaderboard(1, 500), 1000);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userDataUpdated', handleUserUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleUserUpdate);
    };
  }, []);

  if (loading && leaderboardData.length === 0) {
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center">
          🏆 Leaderboard
          {loading && (
            <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
          )}
        </h2>
        <div className="text-xs text-white/40">
          {error ? 'Offline' : 'Live'}
        </div>
      </div>

      {error && retryCount === 0 && (
        <div className="text-center text-yellow-400 text-sm mb-4 bg-yellow-500/10 rounded-lg p-2">
          {error}
          <button
            onClick={() => fetchLeaderboard()}
            className="text-purple-400 hover:text-purple-300 text-xs ml-2 underline"
          >
            Retry
          </button>
        </div>
      )}
      {error && retryCount > 0 && (
        <div className="text-center text-yellow-400 text-sm mb-4 bg-yellow-500/10 rounded-lg p-2">
          Retrying... ({retryCount} attempts left)
        </div>
      )}

      <div className="space-y-3">
        {Array.isArray(leaderboardData) && leaderboardData.length > 0 ? (
          leaderboardData.map((player, index) => (
            <div
              key={player.id || `player-${index}`}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 transform hover:scale-[1.02] ${
                player.isCurrentUser
                  ? 'bg-purple-500/20 border-purple-400/50 ring-1 ring-purple-400/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                </span>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className={`font-semibold ${player.isCurrentUser ? 'text-purple-200' : 'text-white'}`}>
                      {player.username || `Player ${index + 1}`}
                    </p>
                    {player.isCurrentUser && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-white/60">
                    <span>Rank #{player.rank || index + 1}</span>
                    {player.streak > 0 && <span>🔥 {player.streak}</span>}
                    {player.level > 1 && <span>Lv.{player.level}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg ${player.isCurrentUser ? 'text-purple-300' : 'text-purple-300'}`}>
                  {player.score || player.totalPoints || 0}
                </p>
                <p className="text-xs text-white/60">points</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-white/60 py-8">
            <p>No players yet!</p>
            <p className="text-sm mt-2">Complete adventures to join the leaderboard!</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-white/40 text-center">
          Updates every 30 seconds • Your progress syncs automatically
        </p>
      </div>
    </div>
  );
};

export default Leaderboard;