import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiGet } from '../utils/safeUtils';

const TrendingAdventures = () => {
  const [trendingData, setTrendingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Added to display errors
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All', icon: '🌟' },
    { id: 'Mindfulness', name: 'Mindfulness', icon: '🧘' }, // Aligned with backend categories
    { id: 'Adventure', name: 'Adventure', icon: '🌲' },
    { id: 'Social', name: 'Social', icon: '🤝' },
    { id: 'Morning', name: 'Morning', icon: '🌅' }
  ];

  const fetchTrendingAdventures = async (retries = 3, delay = 1000) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching trending adventures from: /trending-adventures');
      const data = await apiGet('/trending-adventures');
      console.log('Trending adventures received:', data);
      setTrendingData(data || { trending: [], viralAdventure: null, metadata: {} });
    } catch (error) {
      console.error('Failed to fetch trending adventures:', error.message);
      if (retries > 0) {
        setTimeout(() => fetchTrendingAdventures(retries - 1, delay * 2), delay);
      } else {
        setError('Failed to load trending adventures. Please try again later.');
        setTrendingData({ trending: [], viralAdventure: null, metadata: {} });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingAdventures();
    const interval = setInterval(() => fetchTrendingAdventures(3, 1000), 30000); // Added polling
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const getViralScoreColor = (score) => {
    if (score >= 0.8) return 'text-red-400';
    if (score >= 0.6) return 'text-orange-400';
    return 'text-yellow-400';
  };

  const getTemplateGradient = (template) => {
    const gradients = {
      cosmic: 'from-purple-500 to-pink-500',
      nature: 'from-green-500 to-teal-500',
      retro: 'from-orange-500 to-red-500',
      minimal: 'from-gray-500 to-slate-600'
    };
    return gradients[template] || gradients.cosmic;
  };

  const filteredAdventures = trendingData?.trending?.filter(
    adventure => selectedCategory === 'all' || adventure.category === selectedCategory
  ) || [];

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-white/70">Loading trending adventures...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6"
      >
        <div className="text-center text-yellow-400 py-6">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => fetchTrendingAdventures()}
            className="text-purple-400 hover:text-purple-300 text-xs mt-1 underline"
          >
            Retry
          </button>
        </div>
      </motion.div>
    );
  }

  if (!trendingData || filteredAdventures.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6"
      >
        <div className="text-center text-white/60 py-6">
          <p className="text-sm">No adventures available</p>
          <button
            onClick={() => setSelectedCategory('all')}
            className="text-purple-400 hover:text-purple-300 text-xs mt-1 underline"
          >
            View all adventures
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Trending Adventures</h2>
        <span className="text-xs text-white/60">Updated live</span>
      </div>

      {/* Category Filter */}
      <div className="flex space-x-2 mb-4 overflow-x-auto">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              selectedCategory === category.id
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <span className="text-sm">{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Viral Adventure Highlight */}
      {trendingData.viralAdventure && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Viral Adventure</h3>
              <h4 className="text-white font-semibold">{trendingData.viralAdventure.title}</h4>
              <p className="text-white/70 text-xs">{trendingData.viralAdventure.description}</p>
              <div className="flex items-center space-x-3 mt-2 text-xs text-white/80">
                <span>{trendingData.viralAdventure.completions.toLocaleString()} tries</span>
                <span>{trendingData.viralAdventure.shares.toLocaleString()} shares</span>
                <span className={`font-bold ${getViralScoreColor(trendingData.viralAdventure.viralPotential)}`}>
                  {Math.round(trendingData.viralAdventure.viralPotential * 100)}% viral
                </span>
              </div>
            </div>
            <div className="w-1/3">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className={`h-full bg-gradient-to-r ${getTemplateGradient(trendingData.viralAdventure.template)} rounded-full`}
                  style={{ width: `${trendingData.viralAdventure.viralPotential * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Trending List */}
      <div className="space-y-3">
        {filteredAdventures.map((adventure, index) => (
          <motion.div
            key={adventure.title + index} // Use title + index for uniqueness
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-white font-semibold text-sm">{adventure.title}</h4>
                <p className="text-white/70 text-xs leading-relaxed">{adventure.description}</p>
              </div>
              <span className={`text-xs font-bold ${getViralScoreColor(adventure.viralPotential)}`}>
                {Math.round(adventure.viralPotential * 100)}% viral
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-white/60">
              <div className="flex items-center space-x-3">
                <span>{adventure.completions.toLocaleString()} tries</span>
                <span>{adventure.shares.toLocaleString()} shares</span>
              </div>
              <span className="capitalize">{adventure.category}</span>
            </div>
            <div className="mt-2">
              <div className="w-full bg-white/10 rounded-full h-1">
                <div
                  className={`h-full bg-gradient-to-r ${getTemplateGradient(adventure.template)} rounded-full transition-all duration-1000`}
                  style={{ width: `${adventure.viralPotential * 100}%` }}
                ></div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 text-center">
        <p className="text-xs text-white/40">
          Join trending adventures to boost your viral potential
        </p>
      </div>
    </motion.div>
  );
};

export default TrendingAdventures;