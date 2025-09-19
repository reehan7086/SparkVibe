// frontend/src/components/AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { apiGet } from '../utils/safeUtils';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet(`/analytics/dashboard?period=${period}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.success) {
        setAnalytics(response.data);
      } else {
        setError('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError('Unable to connect to server. Showing cached data.');
      // Fallback data
      setAnalytics({
        overview: { totalCards: 10, totalPoints: 500, level: 5, streak: 3 },
        cardActivity: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], data: [2, 3, 1, 4, 2] },
        pointHistory: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], data: [100, 150, 50, 200, 100] },
        moodDistribution: { labels: ['Joy', 'Sadness', 'Anger'], data: [40, 30, 20] }
      });
    } finally {
      setLoading(false);
    }
  };

  const cardActivityChart = {
    type: 'line',
    data: {
      labels: analytics?.cardActivity?.labels || [],
      datasets: [{
        label: 'Cards Generated',
        data: analytics?.cardActivity?.data || [],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' }, title: { display: true, text: 'Card Activity' } },
      scales: { y: { beginAtZero: true } }
    }
  };

  const pointHistoryChart = {
    type: 'bar',
    data: {
      labels: analytics?.pointHistory?.labels || [],
      datasets: [{
        label: 'Points Earned',
        data: analytics?.pointHistory?.data || [],
        backgroundColor: '#10B981',
        borderColor: '#059669',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' }, title: { display: true, text: 'Point History' } },
      scales: { y: { beginAtZero: true } }
    }
  };

  const moodDistributionChart = {
    type: 'doughnut',
    data: {
      labels: analytics?.moodDistribution?.labels || [],
      datasets: [{
        data: analytics?.moodDistribution?.data || [],
        backgroundColor: ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6'],
        borderColor: '#1F2937',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' }, title: { display: true, text: 'Mood Distribution' } }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        {error && <div className="text-red-400 text-center mb-4">{error}</div>}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Total Cards</p>
            <p className="text-3xl font-bold text-white">{analytics?.overview?.totalCards || 0}</p>
            <p className="text-green-400 text-sm mt-2">{analytics?.overview?.cardGrowth || 0}% from last period</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Total Points</p>
            <p className="text-3xl font-bold text-white">{analytics?.overview?.totalPoints || 0}</p>
            <p className="text-green-400 text-sm mt-2">Level {analytics?.overview?.level || 1}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Current Streak</p>
            <p className="text-3xl font-bold text-white">{analytics?.overview?.streak || 0} days</p>
            <p className="text-green-400 text-sm mt-2">{analytics?.overview?.streakGrowth || 0}% from last period</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Shares</p>
            <p className="text-3xl font-bold text-white">{analytics?.overview?.shares || 0}</p>
            <p className="text-green-400 text-sm mt-2">{analytics?.overview?.shareGrowth || 0}% from last period</p>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <Line {...cardActivityChart} />
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <Bar {...pointHistoryChart} />
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <Doughnut {...moodDistributionChart} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;