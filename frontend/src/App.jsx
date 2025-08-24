import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import VibeCardGenerator from './components/VibeCardGenerator';
import Leaderboard from './components/Leaderboard';

const App = () => {
  const [health, setHealth] = useState('');
  const [capsuleData, setCapsuleData] = useState(null);
  const [userChoices, setUserChoices] = useState({});
  const [completionStats, setCompletionStats] = useState({ vibePointsEarned: 0 });

  useEffect(() => {
    // Fetch backend health status
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    
    axios.get(`${apiUrl}/api/health`)
      .then(response => setHealth(response.data.message))
      .catch(error => {
        console.error('Health check failed:', error);
        setHealth('Backend connection failed');
      });

    // Fetch initial capsule data (example endpoint, adjust as needed)
    axios.post(`${apiUrl}/api/generate-capsule-simple`, {
      mood: 'happy',
      interests: ['adventure', 'creativity']
    })
      .then(response => setCapsuleData(response.data))
      .catch(error => console.error('Capsule fetch failed:', error));
  }, []);

  // Example function to handle user choice updates (can be expanded)
  const handleUserChoice = (choice) => {
    setUserChoices(prev => ({ ...prev, [Date.now()]: choice }));
    setCompletionStats(prev => ({ ...prev, vibePointsEarned: prev.vibePointsEarned + 10 }));
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
          ✨ SparkVibe ✨
        </h1>
        <p className="text-xl text-blue-200 mb-2">Your Daily Adventure Awaits</p>
        <p className="mt-4 text-lg text-gray-300">
          Backend Status: <span className={health.includes('failed') ? 'text-red-400' : 'text-green-400'}>
            {health || 'Checking...'}
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
        <p>Built with ❤️ using AI-powered adventures</p>
      </div>
    </div>
  );
};

export default App;