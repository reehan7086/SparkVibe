import { useEffect, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { apiGet } from '../utils/safeUtils';

const TrendingAdventures = () => {
  const [trendingData, setTrendingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // AutoAnimate hooks
  const [containerRef] = useAutoAnimate();
  const [adventuresRef] = useAutoAnimate();

  const categories = [
    { id: 'all', name: 'All', icon: '🌟' },
    { id: 'morning', name: 'Morning', icon: '🌅' },
    { id: 'outdoor', name: 'Outdoor', icon: '🌲' },
    { id: 'wellness', name: 'Wellness', icon: '🧘' },
    { id: 'social', name: 'Social', icon: '🤝' }
  ];

  useEffect(() => {
    fetchTrendingAdventures();
  }, []);

  const fetchTrendingAdventures = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/trending-adventures');
      setTrendingData(data);
    } catch (error) {
      console.error('Failed to fetch trending adventures:', error);
      setTrendingData({
        trending: [
          {
            title: "Morning Gratitude Walk",
            description: "Start your day with mindful appreciation",
            completions: 1847,
            shares: 923,
            viralScore: 0.82,
            category: "morning",
            template: "nature"
          }
        ],
        viralAdventure: {
          title: "Random Act of Kindness",
          description: "Brighten someone's day unexpectedly",
          completions: 3421,
          shares: 2156,
          viralScore: 0.91,
          category: "social",
          template: "cosmic"
        }
      });
    } finally {
      setLoading(false);
    }
  };

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
      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-white/70">Loading trending adventures...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
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
      {trendingData?.viralAdventure && (
        <div className="mb-4 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-400/30 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">🔥</span>
            <span className="text-red-400 font-bold text-sm">VIRAL</span>
            <span className={`text-sm font-semibold ${getViralScoreColor(trendingData.viralAdventure.viralScore)}`}>
              {Math.round(trendingData.viralAdventure.viralScore * 100)}% viral
            </span>
          </div>
          <h3 className="text-white font-bold text-sm mb-1">{trendingData.viralAdventure.title}</h3>
          <p className="text-white/70 text-xs mb-2">{trendingData.viralAdventure.description}</p>
          <div className="flex items-center space-x-4 text-xs text-white/60">
            <span>{trendingData.viralAdventure.completions.toLocaleString()} completed</span>
            <span>{trendingData.viralAdventure.shares.toLocaleString()} shared</span>
          </div>
        </div>
      )}

      {/* Trending List */}
      <div ref={adventuresRef} className="space-y-3">
        {filteredAdventures.map((adventure, index) => (
          <div
            key={index}
            className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all duration-300 transform hover:scale-[1.02] cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-white font-semibold text-sm">{adventure.title}</h4>
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getTemplateGradient(adventure.template)}`}></div>
                </div>
                <p className="text-white/70 text-xs leading-relaxed">{adventure.description}</p>
              </div>
              <span className={`text-xs font-bold ml-2 ${getViralScoreColor(adventure.viralScore)}`}>
                {Math.round(adventure.viralScore * 100)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-white/60">
              <div className="flex items-center space-x-3">
                <span>{adventure.completions.toLocaleString()} tries</span>
                <span>{adventure.shares.toLocaleString()} shares</span>
              </div>
              <span className="capitalize">{adventure.category}</span>
            </div>

            {/* Engagement bar */}
            <div className="mt-2">
              <div className="w-full bg-white/10 rounded-full h-1">
                <div 
                  className={`h-full bg-gradient-to-r ${getTemplateGradient(adventure.template)} rounded-full transition-all duration-1000`}
                  style={{ width: `${adventure.viralScore * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAdventures.length === 0 && (
        <div className="text-center text-white/60 py-6">
          <p className="text-sm">No adventures found in this category</p>
          <button 
            onClick={() => setSelectedCategory('all')}
            className="text-purple-400 hover:text-purple-300 text-xs mt-1 underline"
          >
            View all adventures
          </button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/10 text-center">
        <p className="text-xs text-white/40">
          Join trending adventures to boost your viral potential
        </p>
      </div>
    </div>
  );
};

export default TrendingAdventures;