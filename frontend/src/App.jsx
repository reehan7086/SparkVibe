import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import VibeCardGenerator from './components/VibeCardGenerator';
import Leaderboard from './components/Leaderboard';
import { safeIncludes, getApiUrl } from './utils/safeUtils';

const App = () => {
  const [health, setHealth] = useState('Checking...');
  const [capsuleData, setCapsuleData] = useState(null);
  const [userChoices, setUserChoices] = useState({});
  const [completionStats, setCompletionStats] = useState({ vibePointsEarned: 0 });

  // Configure axios with consistent settings
  const createApiClient = () => {
    const apiUrl = getApiUrl();
    return axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true, // Include cookies for CORS
    });
  };

  useEffect(() => {
    const apiClient = createApiClient();
    const apiUrl = getApiUrl();
    
    console.log('Using API URL:', apiUrl);
    
    // Health check - updated path to match new server routes
    apiClient.get('/api/health')
      .then(response => {
        setHealth(response.data.message || 'Connected');
        console.log('Backend connected successfully');
      })
      .catch(error => {
        console.error('Health check failed:', error);
        if (error.code === 'ERR_NETWORK') {
          setHealth('Network error - check API server');
        } else if (error.response?.status === 403) {
          setHealth('Access forbidden - CORS issue');
        } else {
          setHealth('Backend connection failed');
        }
      });

    // Capsule fetch - updated path to match new server routes
    apiClient.post('/api/generate-capsule-simple', {
      mood: 'happy',
      interests: ['adventure', 'creativity']
    })
      .then(response => {
        try {
          setCapsuleData(response.data);
          console.log('Capsule data loaded');
        } catch (error) {
          console.error('Error processing capsule data:', error);
          setCapsuleData({ error: 'Failed to process data' });
        }
      })
      .catch(error => {
        console.error('Capsule fetch failed:', error);
        setCapsuleData({
          id: 'demo',
          adventure: {
            title: 'Demo Adventure',
            prompt: 'Welcome to SparkVibe! This is a demo while we connect to the backend.'
          }
        });
      });
  }, []);

  const handleUserChoice = (choice) => {
    setUserChoices(prev => ({ ...prev, [Date.now()]: choice }));
    setCompletionStats(prev => ({ 
      vibePointsEarned: (prev.vibePointsEarned || 0) + 10 
    }));
  };

  const getHealthStatusColor = () => {
    const healthStr = String(health || '');
    if (!healthStr || healthStr === 'Checking...') return 'text-yellow-400';
    if (safeIncludes(healthStr.toLowerCase(), 'failed') || 
        safeIncludes(healthStr.toLowerCase(), 'error') ||
        safeIncludes(healthStr.toLowerCase(), 'forbidden')) return 'text-red-400';
    if (safeIncludes(healthStr.toLowerCase(), 'ok') || 
        safeIncludes(healthStr.toLowerCase(), 'connected') ||
        safeIncludes(healthStr.toLowerCase(), 'health check')) {
      return 'text-green-400';
    }
    return 'text-blue-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-start gap-6 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center w-full max-w-2xl"
      >
        <h1 className="text-6xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
          SparkVibe
        </h1>
        <p className="text-xl text-blue-200 mb-2">Your Daily Adventure Awaits</p>
        <p className="mt-4 text-lg text-gray-300">
          Backend Status:{" "}
          <span className={getHealthStatusColor()}>
            {health}
          </span>
        </p>
      </motion.div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <VibeCardGenerator
            capsuleData={capsuleData}
            userChoices={userChoices}
            completionStats={completionStats}
            user={{ name: 'SparkVibe Explorer', totalPoints: 100 }}
            onCardGenerated={(card) => console.log('Card generated:', card)}
          />
        </div>

        <div className="lg:w-80">
          <Leaderboard />
        </div>
      </div>

      <div className="text-center text-sm text-blue-300 opacity-75 mt-8">
        <p>Create • Share • Inspire</p>
        <p>Built with love using AI-powered adventures</p>
      </div>
    </div>
  );
};

export default App;