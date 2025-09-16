import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TroubleshootingGuide = ({ onClose, onRetry }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const troubleshootingSteps = [
    {
      title: "Check Pop-up Blocker",
      description: "Make sure your browser allows pop-ups for this site",
      icon: "🚫",
      instructions: [
        "Look for a pop-up blocked icon in your address bar",
        "Click on it and select 'Always allow pop-ups from this site'",
        "Refresh the page and try signing in again"
      ],
      browserSpecific: {
        chrome: "Click the pop-up blocked icon → 'Always allow pop-ups and redirects'",
        firefox: "Click the shield icon → 'Disable Blocking for This Site'",
        safari: "Safari → Preferences → Websites → Pop-up Windows → Allow",
        edge: "Click the blocked pop-up notification → 'Always allow'"
      }
    },
    {
      title: "Clear Browser Cache",
      description: "Cached data might be interfering with Google Sign-In",
      icon: "🧹",
      instructions: [
        "Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)",
        "Select 'All time' or 'Everything' as the time range",
        "Check 'Cookies and other site data' and 'Cached images and files'",
        "Click 'Clear data' and restart your browser"
      ],
      quickFix: "Or try opening an incognito/private window"
    },
    {
      title: "Check Browser Extensions",
      description: "Ad blockers or privacy extensions might block Google Sign-In",
      icon: "🔌",
      instructions: [
        "Temporarily disable ad blockers (uBlock Origin, AdBlock Plus, etc.)",
        "Disable privacy extensions (Privacy Badger, Ghostery, etc.)",
        "Try signing in again",
        "If it works, whitelist this site in your extensions"
      ]
    },
    {
      title: "Try Different Browser",
      description: "Some browsers have stricter security settings",
      icon: "🌐",
      instructions: [
        "Try Chrome, Firefox, or Edge",
        "Make sure the browser is up to date",
        "Temporarily disable strict privacy settings",
        "Enable third-party cookies for Google services"
      ]
    },
    {
      title: "Check Network/Firewall",
      description: "Corporate networks might block Google authentication",
      icon: "🔐",
      instructions: [
        "Try using your mobile data instead of office WiFi",
        "Check if you're behind a corporate firewall",
        "Contact your IT department if on a work network",
        "Try using a VPN if available"
      ]
    }
  ];

  const markStepCompleted = (stepIndex) => {
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex]);
    }
  };

  const resetAndRetry = () => {
    setCompletedSteps([]);
    setCurrentStep(0);
    onRetry();
  };

  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    return 'unknown';
  };

  const currentBrowser = getBrowserName();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Google Sign-In Troubleshooting
            </h2>
            <p className="text-blue-200 text-sm">
              Let's fix this step by step
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Progress</span>
            <span className="text-sm text-white/60">
              {completedSteps.length}/{troubleshootingSteps.length} completed
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps.length / troubleshootingSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {troubleshootingSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border rounded-xl p-4 transition-all duration-300 ${
                completedSteps.includes(index)
                  ? 'border-green-400/50 bg-green-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="text-2xl">{step.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">
                      {step.title}
                    </h3>
                    {completedSteps.includes(index) && (
                      <span className="text-green-400 text-sm">✓ Done</span>
                    )}
                  </div>
                  <p className="text-white/80 text-sm mb-3">
                    {step.description}
                  </p>
                  
                  {/* Browser-specific instructions */}
                  {step.browserSpecific && step.browserSpecific[currentBrowser] && (
                    <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 mb-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-blue-300 text-sm font-medium">
                          For your browser:
                        </span>
                      </div>
                      <p className="text-blue-200 text-sm">
                        {step.browserSpecific[currentBrowser]}
                      </p>
                    </div>
                  )}

                  {/* Quick fix */}
                  {step.quickFix && (
                    <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3 mb-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-yellow-300 text-sm font-medium">
                          Quick Fix:
                        </span>
                      </div>
                      <p className="text-yellow-200 text-sm">
                        {step.quickFix}
                      </p>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="space-y-2">
                    {step.instructions.map((instruction, instrIndex) => (
                      <div key={instrIndex} className="flex items-start space-x-2">
                        <span className="text-white/40 text-sm mt-0.5">
                          {instrIndex + 1}.
                        </span>
                        <span className="text-white/70 text-sm">
                          {instruction}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => markStepCompleted(index)}
                    disabled={completedSteps.includes(index)}
                    className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      completedSteps.includes(index)
                        ? 'bg-green-500/20 text-green-300 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {completedSteps.includes(index) ? 'Completed' : 'Mark as Done'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Alternative Options */}
        <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <h3 className="font-semibold text-white mb-3">Still Having Issues?</h3>
          <div className="space-y-2">
            <button
              onClick={resetAndRetry}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
            >
              🔄 Try Google Sign-In Again
            </button>
            <button
              onClick={() => {
                onClose();
                // You could trigger email form here
              }}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
            >
              📧 Use Email Sign-In Instead
            </button>
            <button
              onClick={() => {
                onClose();
                // You could trigger guest access here
              }}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium py-2 px-4 rounded-xl transition-all duration-200"
            >
              👤 Continue as Guest
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-xs text-white/50">
            These issues are usually related to browser security settings.
            Most users can resolve them with steps 1-2.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TroubleshootingGuide;