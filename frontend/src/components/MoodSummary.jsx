import { motion } from 'framer-motion';

const MoodSummary = ({ moodData }) => {
  if (!moodData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6"
      >
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Your Vibe Today</h3>
        <div className="text-center text-white/60 py-4">
          <p className="text-sm">No mood data available</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6"
    >
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Your Vibe Today</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-sm sm:text-base">Mood</span>
          <span className="text-white font-semibold capitalize text-sm sm:text-base">
            {moodData.mood || 'Unknown'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-sm sm:text-base">Energy</span>
          <span className="text-white font-semibold capitalize text-sm sm:text-base">
            {moodData.energyLevel || 'Medium'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-sm sm:text-base">Social Mood</span>
          <span className="text-white font-semibold capitalize text-sm sm:text-base">
            {moodData.socialMood || 'Balanced'}
          </span>
        </div>

        {moodData.confidence && (
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm sm:text-base">Confidence</span>
            <span className="text-white font-semibold text-sm sm:text-base">
              {Math.round(moodData.confidence * 100)}%
            </span>
          </div>
        )}

        {moodData.emotions && moodData.emotions.length > 0 && (
          <div className="mt-4">
            <span className="text-white/80 text-sm sm:text-base block mb-2">Key Emotions</span>
            <div className="flex flex-wrap gap-2">
              {moodData.emotions.slice(0, 3).map((emotion, index) => (
                <span
                  key={index}
                  className="bg-purple-500/20 text-purple-200 px-2 py-1 rounded-full text-xs"
                >
                  {emotion}
                </span>
              ))}
            </div>
          </div>
        )}

        {moodData.fallback && (
          <div className="text-xs text-yellow-400 bg-yellow-500/20 rounded p-2 mt-2">
            Analysis generated locally
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MoodSummary;