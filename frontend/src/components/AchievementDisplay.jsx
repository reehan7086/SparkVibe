import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const AchievementDisplay = ({ achievement, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose(achievement.id);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -100, scale: 0.8 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-80"
      >
        <motion.div
          initial={{ rotateY: -90 }}
          animate={{ rotateY: 0 }}
          className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 p-1 rounded-2xl shadow-2xl"
        >
          <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-xl p-6 relative overflow-hidden"
        >
            {/* Sparkle Effects */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{ 
                  x: [0, 100, 0],
                  y: [0, -50, 0],
                  rotate: [0, 180, 360]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-2 right-2 text-yellow-300"
              >
                ✨
              </motion.div>
              <motion.div
                animate={{ 
                  x: [0, -80, 0],
                  y: [0, 60, 0],
                  rotate: [0, -180, -360]
                }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                className="absolute bottom-2 left-2 text-yellow-300"
              >
                ⭐
              </motion.div>
              <motion.div
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-yellow-200 text-4xl"
              >
                💫
              </motion.div>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 z-10 text-white/60 hover:text-white text-lg p-1"
            >
              ✕
            </button>

            {/* Achievement Content */}
            <div className="relative z-10 text-center">
              {/* Achievement Unlocked Header */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-4"
              >
                <h3 className="text-yellow-300 font-bold text-lg mb-1">
                  🎉 Achievement Unlocked! 🎉
                </h3>
                <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto rounded-full"></div>
              </motion.div>

              {/* Achievement Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
                className="text-6xl mb-4"
              >
                {achievement.icon || '🏆'}
              </motion.div>

              {/* Achievement Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h4 className="text-xl font-bold text-white mb-2">
                  {achievement.title}
                </h4>
                <p className="text-blue-200 text-sm mb-4 leading-relaxed">
                  {achievement.description}
                </p>

                {/* Points Reward */}
                {achievement.points && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                    className="inline-flex items-center space-x-2 bg-yellow-500/20 border border-yellow-400/30 rounded-full px-4 py-2 mb-4"
                  >
                    <span className="text-yellow-300 font-bold">+{achievement.points}</span>
                    <span className="text-yellow-200 text-sm">points</span>
                  </motion.div>
                )}

                {/* Achievement Type Badge */}
                {achievement.type && (
                  <div className="inline-block">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      achievement.type === 'milestone' ? 'bg-blue-500/20 text-blue-300' :
                      achievement.type === 'streak' ? 'bg-red-500/20 text-red-300' :
                      achievement.type === 'social' ? 'bg-green-500/20 text-green-300' :
                      achievement.type === 'creation' ? 'bg-purple-500/20 text-purple-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {achievement.type.charAt(0).toUpperCase() + achievement.type.slice(1)}
                    </span>
                  </div>
                )}
              </motion.div>

              {/* Progress Bar (if applicable) */}
              {achievement.progress && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1, duration: 1 }}
                  className="mt-4"
                >
                  <div className="text-xs text-white/60 mb-1">Progress to next level</div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
                      style={{ width: `${achievement.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-white/60 mt-1">{achievement.progress}% complete</div>
                </motion.div>
              )}
            </div>

            {/* Celebration Effects */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-orange-500/10 to-red-500/10 rounded-xl"
            />
          </div>

          {/* Floating Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * 300,
                  y: 300,
                  opacity: 0,
                  scale: 0
                }}
                animate={{ 
                  x: Math.random() * 300,
                  y: -50,
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{ 
                  duration: 3 + Math.random() * 2,
                  delay: Math.random() * 2,
                  repeat: Infinity
                }}
                className="absolute text-yellow-300"
              >
                {['✨', '⭐', '🌟', '💫'][Math.floor(Math.random() * 4)]}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Sound Effect Indicator */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ delay: 0.1, duration: 0.8 }}
          className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold"
        >
          🔊
        </motion.div>

        {/* Auto-close Progress Bar */}
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 5, ease: "linear" }}
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-b-2xl"
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default AchievementDisplay;