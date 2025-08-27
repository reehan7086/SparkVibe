import { useState, useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { apiPost } from '../utils/safeUtils';

const MoodAnalyzer = ({ onMoodAnalyzed, isActive }) => {
  const [moodInput, setMoodInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [moodData, setMoodData] = useState(null);
  const [step, setStep] = useState('input'); // input, analyzing, results
  
  // AutoAnimate hooks
  const [containerRef] = useAutoAnimate();
  const [stepContainerRef] = useAutoAnimate();

  const analyzeMood = async () => {
    if (!moodInput.trim()) return;

    setIsAnalyzing(true);
    setStep('analyzing');

    try {
      // Get additional context
      const now = new Date();
      const timeOfDay = getTimeOfDay(now);
      
      const analysisData = {
        textInput: moodInput,
        timeOfDay: timeOfDay,
        recentActivities: [],
        timestamp: now.toISOString()
      };

      const result = await apiPost('/analyze-mood', analysisData);
      
      setMoodData(result);
      setStep('results');
      onMoodAnalyzed(result);
      
    } catch (error) {
      console.error('Mood analysis failed:', error);
      // Fallback mood analysis
      const fallbackMood = {
        mood: 'curious',
        confidence: 0.6,
        emotions: ['curious', 'hopeful'],
        recommendations: ['Try something new today', 'Embrace your curiosity'],
        suggestedTemplate: 'cosmic',
        energyLevel: 'medium',
        socialMood: 'balanced'
      };
      setMoodData(fallbackMood);
      setStep('results');
      onMoodAnalyzed(fallbackMood);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setStep('input');
    setMoodInput('');
    setMoodData(null);
  };

  const getTimeOfDay = (date) => {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const getMoodColor = (mood) => {
    const colors = {
      happy: 'from-yellow-400 to-orange-500',
      sad: 'from-blue-400 to-blue-600',
      energetic: 'from-red-400 to-pink-500',
      calm: 'from-green-400 to-teal-500',
      anxious: 'from-purple-400 to-indigo-500',
      curious: 'from-cyan-400 to-blue-500'
    };
    return colors[mood] || colors.curious;
  };

  const getEnergyBarWidth = (energyLevel) => {
    const levels = {
      low: '25%',
      'medium-low': '40%',
      medium: '60%',
      'medium-high': '80%',
      high: '100%'
    };
    return levels[energyLevel] || '60%';
  };

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className="bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-pink-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6"
    >
      <div ref={stepContainerRef}>
        {step === 'input' && (
          <div key="input" className="space-y-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">How are you feeling?</h3>
              <p className="text-blue-200 text-sm">Let AI understand your vibe and personalize your experience</p>
            </div>

            <div className="space-y-4">
              <textarea
                value={moodInput}
                onChange={(e) => setMoodInput(e.target.value)}
                placeholder="Describe how you're feeling right now... (e.g., 'I'm excited about today but a bit nervous about my presentation')"
                className="w-full h-24 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
                maxLength={280}
              />
              
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>{moodInput.length}/280 characters</span>
                <span className="text-xs">Your mood data stays private</span>
              </div>

              <button
                onClick={analyzeMood}
                disabled={!moodInput.trim() || isAnalyzing}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105"
              >
                Analyze My Mood
              </button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div key="analyzing" className="text-center py-8">
            <div className="relative mb-4">
              <div className="w-16 h-16 mx-auto border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 mx-auto mt-2 border-2 border-pink-400 border-b-transparent rounded-full animate-spin animate-reverse"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Analyzing your vibe...</h3>
            <p className="text-purple-200 text-sm">Our AI is understanding your emotions and energy</p>
          </div>
        )}

        {step === 'results' && moodData && (
          <div key="results" className="space-y-4">
            <div className="text-center">
              <div className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${getMoodColor(moodData.mood)} rounded-full text-white font-bold text-lg mb-3`}>
                {moodData.mood.charAt(0).toUpperCase() + moodData.mood.slice(1)} Vibes
                <span className="ml-2 text-sm opacity-80">({Math.round(moodData.confidence * 100)}% confident)</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="font-semibold text-white mb-2">Your Energy</h4>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div 
                      className={`h-full bg-gradient-to-r ${getMoodColor(moodData.mood)} rounded-full transition-all duration-1000`}
                      style={{ width: getEnergyBarWidth(moodData.energyLevel) }}
                    ></div>
                  </div>
                  <span className="text-sm text-white/80 capitalize">{moodData.energyLevel}</span>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="font-semibold text-white mb-2">Social Mood</h4>
                <span className="text-white/80 capitalize">{moodData.socialMood}</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-3">AI Recommendations</h4>
              <div className="space-y-2">
                {moodData.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    <span className="text-white/80">{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">🎨</span>
                <span className="font-semibold text-white">Personalized Template</span>
              </div>
              <p className="text-white/80 text-sm">
                Based on your mood, we'll use the <span className="font-semibold capitalize">{moodData.suggestedTemplate}</span> template 
                for your vibe cards today
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={reset}
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl text-white font-medium transition-all duration-200"
              >
                Analyze Again
              </button>
              <button
                onClick={() => setStep('input')}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-4 py-2 rounded-xl text-white font-medium transition-all duration-200"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodAnalyzer;