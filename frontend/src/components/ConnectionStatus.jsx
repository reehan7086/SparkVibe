// src/components/ConnectionStatus.jsx - Visual connection status indicator
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getConnectionHealth } from '../utils/safeUtils';

const ConnectionStatus = ({ health }) => {
  const [connectionStatus, setConnectionStatus] = useState(getConnectionHealth());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStatus(getConnectionHealth());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusInfo = () => {
    const healthStr = String(health || '');
    const isOffline = healthStr.includes('offline') || 
                     healthStr.includes('Backend Offline') ||
                     !connectionStatus.isHealthy;

    if (isOffline) {
      return {
        status: 'offline',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-200',
        icon: '⚠️',
        message: 'Demo Mode',
        description: 'Backend unavailable - using offline features'
      };
    }

    if (connectionStatus.consecutiveFailures > 0) {
      return {
        status: 'unstable',
        color: 'bg-orange-500',
        textColor: 'text-orange-200',
        icon: '📶',
        message: 'Unstable Connection',
        description: 'Some features may be limited'
      };
    }

    return {
      status: 'online',
      color: 'bg-green-500',
      textColor: 'text-green-200',
      icon: '✅',
      message: 'Connected',
      description: 'All features available'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="relative">
      {/* Main Status Indicator */}
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 ${statusInfo.color} ${statusInfo.textColor}`}
      >
        <span className="animate-pulse">{statusInfo.icon}</span>
        <span>{statusInfo.message}</span>
      </motion.button>

      {/* Detailed Status Popup */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute top-full right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-md border border-white/20 rounded-xl p-4 text-white shadow-xl z-50"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Connection Status</h4>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-white/60 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">Status:</span>
                  <span className={`font-medium capitalize ${statusInfo.textColor}`}>
                    {statusInfo.status}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-white/70">Failures:</span>
                  <span className="font-medium">
                    {connectionStatus.consecutiveFailures}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-white/70">Last Success:</span>
                  <span className="font-medium">
                    {connectionStatus.timeSinceLastSuccess < 60000 
                      ? `${Math.round(connectionStatus.timeSinceLastSuccess / 1000)}s ago`
                      : `${Math.round(connectionStatus.timeSinceLastSuccess / 60000)}m ago`
                    }
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-white/60">
                  {statusInfo.description}
                </p>
                
                {statusInfo.status === 'offline' && (
                  <div className="mt-2 p-2 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                    <p className="text-xs text-blue-200">
                      💡 In demo mode, your data is stored locally and some features use AI fallbacks.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConnectionStatus;