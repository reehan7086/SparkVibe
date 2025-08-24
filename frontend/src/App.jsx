import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import VibeCardGenerator from '@/components/VibeCardGenerator';
import Leaderboard from '@/components/leaderboard';

const App = () => {
  const [health, setHealth] = useState('');
  const [capsuleData, setCapsuleData] = useState(null);
  const [userChoices, setUserChoices] = useState({});
  const [completionStats, setCompletionStats] = useState({ vibePointsEarned: 0 });

  useEffect(() => {
    // Fetch backend health status
    axios.get(`${import.meta.env.VITE_API_URL}/api/health`)
      .then(response => setHealth(response.data.message))
      .catch(error => console.error('Health check failed:', error));

    // Fetch initial capsule data (example endpoint, adjust as needed)
    axios.get(`${import.meta.env.VITE_API_URL}/api/generate-capsule-simple`)
      .then(response => setCapsuleData(response.data))
      .catch(error => console.error('Capsule fetch failed:', error));
  }, []);

  // Example function to handle user choice updates (can be expanded)
  const handleUserChoice = (choice) => {
    setUserChoices(prev => ({ ...prev, [Date.now()]: choice }));
    setCompletionStats(prev => ({ ...prev, vibePointsEarned: prev.vibePointsEarned + 10 }));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start gap-6 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center w-full max-w-2xl"
      >
        <h1 className="text-4xl font-bold text-blue-600 mb-2">SparkVibe</h1>
        <p className="mt-4 text-lg text-gray-700">Backend Status: {health || 'Checking...'}</p>
      </motion.div>

      <div className="w-full max-w-2xl flex flex-col gap-6">
        <VibeCardGenerator
          capsuleData={capsuleData}
          userChoices={userChoices}
          completionStats={completionStats}
          user={{ name: 'User', totalPoints: 100 }} // Example user data
          onCardGenerated={(card) => console.log('Card generated:', card)}
        />

        <Leaderboard />
      </div>
    </div>
  );
};

export default App;