import { useEffect, useState } from 'react';
  import { motion } from 'framer-motion';
  import axios from 'axios';
  import VibeCardGenerator from '@/components/VibeCardGenerator';
  import Leaderboard from '@/components/leaderboard';

  const App: React.FC = () => {
    const [health, setHealth] = useState<string>('');

    useEffect(() => {
      axios.get(`${import.meta.env.VITE_API_URL}/api/health`)
        .then(response => setHealth(response.data.message))
        .catch(error => console.error('Health check failed:', error));
    }, []);

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center flex-col">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-blue-600">SparkVibe</h1>
          <p className="mt-4 text-lg">Backend Status: {health || 'Checking...'}</p>
        </motion.div>
        <VibeCardGenerator />
        <Leaderboard />
      </div>
    );
  };

  export default App;