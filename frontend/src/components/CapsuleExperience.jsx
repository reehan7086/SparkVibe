import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CapsuleExperience = ({ capsuleData, moodData, onComplete, onUserChoice }) => {
  const [currentPhase, setCurrentPhase] = useState('adventure');
  const [isCompleting, setIsCompleting] = useState(false);

  const handlePhaseComplete = () => {
    if (currentPhase === 'adventure') {
      setCurrentPhase('brainbite');
    } else if (currentPhase === 'brainbite') {
      setCurrentPhase('habit');
    } else {
      completeExperience();
    }
  };

  const completeExperience = () => {
    setIsCompleting(true);
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  if (isCompleting) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-2xl p-4 sm:p-8 text-center"
      >
        <div className="text-4xl sm:text-6xl mb-4">🎉</div>
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Adventure Complete!</h3>
        <p className="text-green-200 text-sm sm:text-base">You've earned bonus points for completing all phases</p>
        <div className="animate-pulse mt-4 text-yellow-400 font-bold">+25 Vibe Points</div>
        {capsuleData?.fallback && (
          <div className="mt-2 text-xs text-yellow-300 bg-yellow-500/20 rounded-lg p-2">
            Demo Mode - Points saved locally
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-indigo-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6"
    >
      {capsuleData?.fallback && (
        <div className="mb-4 p-2 bg-yellow-500/20 border border-yellow-400/30 rounded-lg text-center">
          <span className="text-yellow-200 text-xs">
            🔄 Demo Mode - AI features simulated locally
          </span>
        </div>
      )}
      
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{capsuleData.adventure?.title}</h2>
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-white/60">
          <span>⏱️ {capsuleData.adventure?.estimatedTime}</span>
          <span>📊 {capsuleData.adventure?.difficulty}</span>
          <span>🎯 {capsuleData.adventure?.category}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentPhase === 'adventure' && (
          <motion.div
            key="adventure"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="bg-white/5 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Your Adventure</h3>
              <p className="text-white/80 text-base sm:text-lg leading-relaxed">{capsuleData.adventure?.prompt}</p>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  onUserChoice('adventure_completed');
                  handlePhaseComplete();
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              >
                I Did It! ✨
              </button>
            </div>
          </motion.div>
        )}

        {currentPhase === 'brainbite' && (
          <motion.div
            key="brainbite"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-xl sm:text-2xl">🧠</span>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Brain Bite</h3>
              </div>
              <p className="text-white/80 text-base sm:text-lg">{capsuleData.brainBite?.answer || capsuleData.brainBite}</p>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  onUserChoice('brainbite_read');
                  handlePhaseComplete();
                }}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              >
                Fascinating! Continue →
              </button>
            </div>
          </motion.div>
        )}

        {currentPhase === 'habit' && (
          <motion.div
            key="habit"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/30 rounded-xl p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-xl sm:text-2xl">💡</span>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Habit Nudge</h3>
              </div>
              <p className="text-white/80 text-base sm:text-lg mb-4">{capsuleData.habitNudge}</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    onUserChoice('habit_accepted');
                    completeExperience();
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-white transition-all duration-300 text-sm sm:text-base"
                >
                  I'll Try This! (+10 bonus points)
                </button>
                <button
                  onClick={() => {
                    onUserChoice('habit_skipped');
                    completeExperience();
                  }}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium text-white transition-all duration-300 text-sm sm:text-base"
                >
                  Maybe Next Time
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center space-x-2 mt-4 sm:mt-6">
        <div className={`w-2 h-2 rounded-full ${currentPhase === 'adventure' ? 'bg-purple-400' : 'bg-purple-400'}`}></div>
        <div className={`w-2 h-2 rounded-full ${currentPhase === 'brainbite' ? 'bg-blue-400' : currentPhase === 'habit' ? 'bg-blue-400' : 'bg-white/30'}`}></div>
        <div className={`w-2 h-2 rounded-full ${currentPhase === 'habit' ? 'bg-emerald-400' : 'bg-white/30'}`}></div>
      </div>
    </motion.div>
  );
};

export default CapsuleExperience;