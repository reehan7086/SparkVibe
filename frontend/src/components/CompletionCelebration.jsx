import { motion } from 'framer-motion';

const CompletionCelebration = ({ completionStats, moodData }) => {
  const totalPoints = completionStats?.vibePointsEarned || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 rounded-2xl p-4 sm:p-6 text-center"
    >
      <div className="text-3xl sm:text-4xl mb-3">🎉</div>
      <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Mission Accomplished!</h3>
      
      <div className="space-y-2 text-white/80 text-sm sm:text-base">
        <p>
          Points Earned: 
          <span className="text-yellow-400 font-bold ml-1">+{totalPoints}</span>
        </p>
        
        {moodData && (
          <p>
            Mood Boost: 
            <span className="text-green-400 font-bold ml-1">+15%</span>
          </p>
        )}
        
        <div className="mt-4 pt-3 border-t border-white/20">
          <p className="text-xs sm:text-sm text-white/70">
            You're building amazing habits! Keep up the great work!
          </p>
          
          {totalPoints >= 50 && (
            <div className="mt-2 text-xs text-purple-300 bg-purple-500/20 rounded-lg px-3 py-1">
              Bonus achievement unlocked! 🏆
            </div>
          )}
        </div>
      </div>

      {/* Progress indicators */}
      <div className="mt-4 flex items-center justify-center space-x-2">
        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
      </div>
    </motion.div>
  );
};

export default CompletionCelebration;