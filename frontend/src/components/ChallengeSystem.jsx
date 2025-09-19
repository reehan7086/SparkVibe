import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPost } from '../utils/safeUtils';

const ChallengeSystem = ({ challenges, user, updateUserData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    type: 'points',
    target: 100,
    duration: 7,
    friendId: ''
  });

  const challengeTypes = [
    { id: 'streak', name: 'Streak Challenge', icon: '🔥', description: 'Maintain a daily streak' },
    { id: 'points', name: 'Points Race', icon: '💎', description: 'Race to earn points' },
    { id: 'cards', name: 'Card Creator', icon: '🎨', description: 'Generate vibe cards' },
    { id: 'adventure', name: 'Adventure Quest', icon: '🚀', description: 'Complete adventures' }
  ];

  // Fetch user challenges
  const fetchChallenges = async () => {
    if (!user || user.isGuest) return;
    
    try {
      setLoading(true);
      const response = await apiGet('/challenges');
      if (response.success) {
        const active = response.data.filter(c => c.status === 'active');
        const completed = response.data.filter(c => c.status === 'completed');
        setActiveChallenges(active);
        setCompletedChallenges(completed);
      }
    } catch (error) {
      console.warn('Failed to fetch challenges:', error);
      // Mock data for demo
      setActiveChallenges([
        {
          id: '1',
          type: 'points',
          target: 500,
          progress: { [user.id]: 320, 'friend1': 280 },
          participants: [
            { id: user.id, name: user.name, avatar: user.avatar },
            { id: 'friend1', name: 'Vibe Master', avatar: '🚀' }
          ],
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
        },
        {
          id: '2',
          type: 'streak',
          target: 10,
          progress: { [user.id]: 5, 'friend2': 7 },
          participants: [
            { id: user.id, name: user.name, avatar: user.avatar },
            { id: 'friend2', name: 'Adventure Seeker', avatar: '🌟' }
          ],
          deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Create new challenge
  const createChallenge = async () => {
    if (!newChallenge.friendId) return;
    
    try {
      setLoading(true);
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + newChallenge.duration);
      
      const response = await apiPost('/challenges/create', {
        friendId: newChallenge.friendId,
        type: newChallenge.type,
        target: newChallenge.target,
        deadline: deadline.toISOString()
      });
      
      if (response.success) {
        setShowCreateChallenge(false);
        setNewChallenge({ type: 'points', target: 100, duration: 7, friendId: '' });
        fetchChallenges();
      }
    } catch (error) {
      console.error('Failed to create challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  // Accept challenge
  const acceptChallenge = async (challengeId) => {
    try {
      const response = await apiPost('/challenges/accept', { challengeId });
      if (response.success) {
        fetchChallenges();
      }
    } catch (error) {
      console.error('Failed to accept challenge:', error);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchChallenges();
    }
  }, [isExpanded]);

  const getChallengeIcon = (type) => {
    return challengeTypes.find(ct => ct.id === type)?.icon || '🏆';
  };

  const getProgressPercentage = (challenge, userId) => {
    const progress = challenge.progress[userId] || 0;
    return Math.min((progress / challenge.target) * 100, 100);
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const timeLeft = new Date(deadline) - now;
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 0) return `${daysLeft} days left`;
    if (daysLeft === 0) return 'Last day!';
    return 'Expired';
  };

  const getLeader = (challenge) => {
    let leader = null;
    let maxProgress = -1;
    
    challenge.participants.forEach(participant => {
      const progress = challenge.progress[participant.id] || 0;
      if (progress > maxProgress) {
        maxProgress = progress;
        leader = participant;
      }
    });
    
    return leader;
  };

  if (!isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <motion.button
          onClick={() => setIsExpanded(true)}
          className="bg-orange-600/90 hover:bg-orange-700/90 backdrop-blur-md border border-white/20 rounded-xl p-3 shadow-xl w-full"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex items-center space-x-2 text-white">
            <span className="text-lg">🏆</span>
            <span className="text-sm font-medium">Challenges</span>
            {activeChallenges.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeChallenges.length}
              </span>
            )}
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
        className="w-80"
      >
        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl max-h-[60vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🏆</span>
              <h3 className="text-lg font-bold text-white">Challenges</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateChallenge(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg text-xs"
              >
                +
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-white/60 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Create Challenge Modal */}
          {showCreateChallenge && (
            <div className="mb-4 p-4 bg-white/10 rounded-xl border border-white/20">
              <h4 className="text-white font-semibold mb-3">Create New Challenge</h4>
              
              <div className="space-y-3">
                <select
                  value={newChallenge.type}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                >
                  {challengeTypes.map(type => (
                    <option key={type.id} value={type.id} className="bg-gray-800">
                      {type.icon} {type.name}
                    </option>
                  ))}
                </select>
                
                <input
                  type="number"
                  value={newChallenge.target}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, target: parseInt(e.target.value) }))}
                  placeholder="Target (e.g., 100 points)"
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/60"
                />
                
                <input
                  type="number"
                  value={newChallenge.duration}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  placeholder="Duration (days)"
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/60"
                />
                
                <input
                  type="text"
                  value={newChallenge.friendId}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, friendId: e.target.value }))}
                  placeholder="Friend's username"
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/60"
                />
                
                <div className="flex space-x-2">
                  <button
                    onClick={createChallenge}
                    disabled={loading || !newChallenge.friendId}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg text-sm font-medium"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateChallenge(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Challenges */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-400"></div>
              <span className="ml-2 text-white/70 text-sm">Loading...</span>
            </div>
          )}

          {!loading && activeChallenges.length > 0 && (
            <div className="space-y-3 mb-4">
              <h4 className="text-sm font-semibold text-white/80">Active Challenges</h4>
              {activeChallenges.map((challenge) => {
                const leader = getLeader(challenge);
                const userProgress = getProgressPercentage(challenge, user.id);
                
                return (
                  <div key={challenge.id} className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getChallengeIcon(challenge.type)}</span>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {challengeTypes.find(ct => ct.id === challenge.type)?.name}
                          </p>
                          <p className="text-xs text-white/60">
                            {getTimeRemaining(challenge.deadline)}
                          </p>
                        </div>
                      </div>
                      {leader && (
                        <div className="text-right">
                          <p className="text-xs text-white/60">Leader</p>
                          <p className="text-sm font-medium text-yellow-400">
                            {leader.avatar} {leader.name}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {challenge.participants.map((participant) => {
                        const progress = challenge.progress[participant.id] || 0;
                        const percentage = getProgressPercentage(challenge, participant.id);
                        const isUser = participant.id === user.id;
                        
                        return (
                          <div key={participant.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`${isUser ? 'text-purple-300' : 'text-white/70'}`}>
                                {participant.avatar} {participant.name}
                                {isUser && ' (You)'}
                              </span>
                              <span className="text-white/60">
                                {progress}/{challenge.target}
                              </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  isUser ? 'bg-purple-500' : 'bg-white/30'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && activeChallenges.length === 0 && (
            <div className="text-center py-8 text-white/60">
              <p className="text-sm">No active challenges</p>
              <p className="text-xs mt-1">Create one to compete with friends!</p>
            </div>
          )}

          {/* Recent Completed Challenges */}
          {completedChallenges.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white/80">Recently Completed</h4>
              {completedChallenges.slice(0, 2).map((challenge) => (
                <div key={challenge.id} className="p-2 bg-green-500/20 rounded-lg border border-green-400/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{getChallengeIcon(challenge.type)}</span>
                      <span className="text-sm text-green-200">
                        {challengeTypes.find(ct => ct.id === challenge.type)?.name}
                      </span>
                    </div>
                    {challenge.winner?.id === user.id ? (
                      <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded">
                        🏆 Won
                      </span>
                    ) : (
                      <span className="text-xs text-green-300">Completed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChallengeSystem;