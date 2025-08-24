import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import axios from 'axios';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import VibeCardGenerator from '../../components/VibeCardGenerator';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
// API Base URL - automatically uses the correct URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sparkvibe-app-nyowz.ondigitalocean.app';

export default function Home() {
  const { data: session } = useSession();
  const [capsule, setCapsule] = useState<any>(null);
  const [vibeCard, setVibeCard] = useState<{ text: string; image: string } | null>(null);
  const [moodInput, setMoodInput] = useState('');
  
  // Vibe Card states
  const [showVibeCard, setShowVibeCard] = useState(false);
  const [capsuleData, setCapsuleData] = useState(null);
  const [userChoices, setUserChoices] = useState({});
  const [completionStats, setCompletionStats] = useState({});
  
  // Notification states
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Notification Manager Functions
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Send subscription to backend - UPDATED URL
      await fetch(`${API_BASE_URL}/api/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      setIsSubscribed(true);
      console.log('Subscribed to push notifications');
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const generateCapsule = async () => {
    try {
      // Use the simple endpoint that we know works - UPDATED URL
      const res = await axios.post(`${API_BASE_URL}/api/generate-capsule-simple`, { 
        mood: moodInput, 
        interests: ['general', 'adventure']
      });
      
      setCapsule(res.data);
      setCapsuleData(res.data); // Store for Vibe Card generation
    } catch (err) {
      console.error(err);
      alert('Capsule generation failed');
    }
  };

  const generateVibeCard = async () => {
    const cardElement = document.getElementById('vibe-card');
    if (cardElement) {
      const canvas = await html2canvas(cardElement);
      const image = canvas.toDataURL('image/png');
      setVibeCard({
        text: `I conquered ${capsule.adventure.title}! Vibe Points: ${(session?.user?.vibePoints || 0) + 10} #SparkVibe`,
        image,
      });
    }
  };

  const completeCapsule = async (option: string, optionIndex: number) => {
    try {
      // Update points using the working endpoint - UPDATED URL
      const res = await axios.post(`${API_BASE_URL}/api/update-points`, {
        username: session?.user?.name || 'TestUser'
      });
      
      // Update session data
      if (session?.user) {
        session.user.vibePoints = res.data.vibePoints;
        session.user.streak = res.data.streak;
      }

      // Set up data for Vibe Card generation
      const choices = {
        adventure: option,
        adventureOutcome: capsule.adventure.options[optionIndex]?.outcome || 'Amazing result!',
        brainBiteCorrect: true, // Assume correct for demo
        habitCompleted: true
      };

      const stats = {
        vibePointsEarned: 15,
        timeSpent: 300, // 5 minutes
        mood: moodInput
      };

      setUserChoices(choices);
      setCompletionStats(stats);
      
      // Show Vibe Card option after a brief delay
      setTimeout(() => {
        setShowVibeCard(true);
      }, 2000);

      // Generate old-style vibe card for backward compatibility
      generateVibeCard();
      
      // Clear capsule after 5 seconds
      setTimeout(() => setCapsule(null), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  const onCardGenerated = (card: any) => {
    console.log('New Vibe Card generated:', card);
    // Optional: Hide the capsule completion UI
    setCapsule(null);
  };

  const resetApp = () => {
    setCapsule(null);
    setVibeCard(null);
    setShowVibeCard(false);
    setMoodInput('');
    setCapsuleData(null);
    setUserChoices({});
    setCompletionStats({});
  };

  useEffect(() => {
    if (moodInput && session) generateCapsule();
  }, [moodInput, session]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-500 flex flex-col items-center p-4">
      <h1 className="text-4xl font-bold text-white mb-6">SparkVibe</h1>

      {/* Auth */}
      {!session && (
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <button
            onClick={() => signIn('google')}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Sign in with Google
          </button>
        </div>
      )}

      {/* User Profile */}
      {session && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-4 mb-4 w-full max-w-md"
        >
          <p className="text-lg font-semibold">Hey, {session.user?.name}!</p>
          <p>Vibe Points: {session.user?.vibePoints} | Streak: {session.user?.streak} days</p>
          
          {/* Notification Manager - Integrated */}
          <div className="mt-4 notification-manager">
            {!isSubscribed && (
              <button
                onClick={subscribeToNotifications}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg w-full"
              >
                🔔 Enable Daily Reminders
              </button>
            )}
            {isSubscribed && (
              <span className="text-green-500 block text-center">✅ Notifications Enabled</span>
            )}
          </div>
          
          <button
            onClick={() => signOut()}
            className="mt-2 text-blue-600 underline"
          >
            Sign Out
          </button>
        </motion.div>
      )}

      {/* Mood Input */}
      {session && !capsule && !showVibeCard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md"
        >
          <h2 className="text-2xl font-bold mb-4">What's your vibe today?</h2>
          <div className="space-y-4">
            {['happy', 'chill', 'curious'].map((mood) => (
              <motion.button
                key={mood}
                whileHover={{ scale: 1.05 }}
                onClick={() => setMoodInput(mood)}
                className={`w-full py-2 rounded text-white ${
                  mood === 'happy' ? 'bg-yellow-400 hover:bg-yellow-500' :
                  mood === 'chill' ? 'bg-blue-400 hover:bg-blue-500' :
                  'bg-purple-400 hover:bg-purple-500'
                }`}
              >
                {mood === 'happy' ? '😊 Happy' : mood === 'chill' ? '😎 Chill' : '🤔 Curious'}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Vibe Capsule */}
      {capsule && !showVibeCard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md"
          id="vibe-card"
        >
          <h2 className="text-2xl font-bold mb-2">{capsule.adventure.title}</h2>
          <p className="mb-4">{capsule.adventure.prompt}</p>
          <div className="space-y-2">
            {capsule.adventure.options.map((option: any, idx: number) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                onClick={() => completeCapsule(typeof option === 'string' ? option : option.text, idx)}
                className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
              >
                {typeof option === 'string' ? option : option.text}
              </motion.button>
            ))}
          </div>
          <p className="mt-4 text-green-600">{capsule.moodBoost}</p>
          <p className="mt-2 font-semibold">{capsule.brainBite.question}</p>
          <p className="text-sm text-gray-600">Answer: {capsule.brainBite.answer}</p>
          <p className="mt-2 text-blue-600">{capsule.habitNudge.task}</p>
        </motion.div>
      )}

      {/* NEW: Vibe Card Generator */}
      {showVibeCard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <VibeCardGenerator
            capsuleData={capsuleData}
            userChoices={userChoices}
            completionStats={completionStats}
            user={session?.user}
            onCardGenerated={onCardGenerated}
          />
          
          {/* Action buttons */}
          <div className="mt-6 flex gap-4 justify-center">
            <button
              onClick={resetApp}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105"
            >
              ✨ New Adventure
            </button>
          </div>
        </motion.div>
      )}

      {/* Original Vibe Card (backward compatibility) */}
      {vibeCard && !showVibeCard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-white rounded-lg shadow-lg p-4 w-full max-w-md"
        >
          <h3 className="text-xl font-bold mb-2">Your Vibe Card</h3>
          <img src={vibeCard.image} alt="Vibe Card" className="w-full rounded" />
          <p className="mt-2">{vibeCard.text}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            onClick={() => navigator.share?.({ title: 'SparkVibe', text: vibeCard.text, url: vibeCard.image })}
          >
            Share #SparkVibe
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}