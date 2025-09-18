import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiPost } from '../utils/safeUtils';

const SocialSharing = ({ capsuleData, user, onShare }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(null);
  const [customCaption, setCustomCaption] = useState('');

  const socialPlatforms = [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: '🐦',
      color: 'bg-blue-500 hover:bg-blue-600',
      getShareUrl: () => {
        const text = customCaption || capsuleData?.sharing?.captions?.[0] || 
          `Just completed an amazing SparkVibe adventure and earned points! 🌟 #SparkVibe`;
        const url = capsuleData?.sharing?.qrCode || 'https://sparkvibe.app';
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      }
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '📘',
      color: 'bg-blue-600 hover:bg-blue-700',
      getShareUrl: () => {
        const url = capsuleData?.sharing?.qrCode || 'https://sparkvibe.app';
        const quote = customCaption || capsuleData?.sharing?.captions?.[0] || 
          'Just completed an amazing SparkVibe adventure!';
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`;
      }
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📸',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      getShareUrl: () => {
        // Instagram doesn't support direct URL sharing, so we'll provide instructions
        return null;
      },
      isSpecial: true
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: '💼',
      color: 'bg-blue-700 hover:bg-blue-800',
      getShareUrl: () => {
        const text = customCaption || 
          `Completed a personal growth adventure on SparkVibe! Excited about continuous learning and self-improvement. 🚀`;
        const url = capsuleData?.sharing?.qrCode || 'https://sparkvibe.app';
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
      }
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-500 hover:bg-green-600',
      getShareUrl: () => {
        const text = customCaption || 
          `Check out my SparkVibe adventure! ${capsuleData?.sharing?.qrCode || 'https://sparkvibe.app'}`;
        return `https://wa.me/?text=${encodeURIComponent(text)}`;
      }
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: '✈️',
      color: 'bg-blue-400 hover:bg-blue-500',
      getShareUrl: () => {
        const text = customCaption || capsuleData?.sharing?.captions?.[0] || 
          'Just completed an amazing SparkVibe adventure!';
        const url = capsuleData?.sharing?.qrCode || 'https://sparkvibe.app';
        return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      }
    }
  ];

  const handleShare = async (platform) => {
    setIsSharing(true);
    
    try {
      // Track the share
      await apiPost('/track-share', {
        cardId: capsuleData?.id,
        platform: platform.id,
        caption: customCaption
      });

      if (platform.isSpecial) {
        // Handle special platforms like Instagram
        if (platform.id === 'instagram') {
          // Show instructions for Instagram
          setShareSuccess({
            platform: platform.name,
            message: 'Screenshot your vibe card and share it to your Instagram story! Tag @sparkvibe for a chance to be featured.',
            isInstruction: true
          });
        }
      } else {
        // Regular URL sharing
        const shareUrl = platform.getShareUrl();
        if (shareUrl) {
          window.open(shareUrl, '_blank', 'width=600,height=400');
          setShareSuccess({
            platform: platform.name,
            message: 'Successfully shared your vibe!',
            isInstruction: false
          });
        }
      }

      // Call the onShare callback
      onShare?.(platform.id);

      // Update user stats
      if (user && !user.isGuest) {
        // This would typically be handled by the parent component
        console.log('Share completed for user:', user.id);
      }

    } catch (error) {
      console.error('Failed to track share:', error);
      // Still allow sharing even if tracking fails
      const shareUrl = platform.getShareUrl();
      if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
      }
    } finally {
      setIsSharing(false);
    }

    // Clear success message after 3 seconds
    setTimeout(() => setShareSuccess(null), 3000);
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = capsuleData?.sharing?.qrCode || 'https://sparkvibe.app';
      await navigator.clipboard.writeText(shareUrl);
      setShareSuccess({
        platform: 'Clipboard',
        message: 'Link copied to clipboard!',
        isInstruction: false
      });
      setTimeout(() => setShareSuccess(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const getSuggestedCaptions = () => {
    if (capsuleData?.sharing?.captions) {
      return capsuleData.sharing.captions;
    }
    
    return [
      `Just completed an amazing SparkVibe adventure! 🌟 #SparkVibe #PersonalGrowth`,
      `Level up complete! 🚀 Thanks @SparkVibe for the daily inspiration #Adventure`,
      `Another day, another vibe! ✨ Who else is on their growth journey? #SparkVibe`
    ];
  };

  if (!capsuleData) return null;

  return (
    <>
      {/* Share Button */}
      <motion.button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white p-4 rounded-full shadow-2xl z-40"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
      >
        <span className="text-xl">📤</span>
      </motion.button>

      {/* Share Modal */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsVisible(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">📤</span>
                  <h2 className="text-xl font-bold text-white">Share Your Vibe</h2>
                </div>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-white/60 hover:text-white text-xl p-1"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-96">
                {/* Success Message */}
                <AnimatePresence>
                  {shareSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`mb-4 p-3 rounded-xl border ${
                        shareSuccess.isInstruction 
                          ? 'bg-blue-500/20 border-blue-400/30 text-blue-200'
                          : 'bg-green-500/20 border-green-400/30 text-green-200'
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {shareSuccess.isInstruction ? '📋' : '✅'} {shareSuccess.message}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Custom Caption */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Customize your caption
                  </label>
                  <textarea
                    value={customCaption}
                    onChange={(e) => setCustomCaption(e.target.value)}
                    placeholder="Write your own caption or use a suggested one below..."
                    className="w-full h-20 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                    maxLength={280}
                  />
                  <div className="flex justify-between text-xs text-white/60 mt-1">
                    <span>{customCaption.length}/280 characters</span>
                    <button
                      onClick={() => setCustomCaption('')}
                      className="text-purple-300 hover:text-purple-200 underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Suggested Captions */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Suggested captions
                  </label>
                  <div className="space-y-2">
                    {getSuggestedCaptions().map((caption, index) => (
                      <button
                        key={index}
                        onClick={() => setCustomCaption(caption)}
                        className="w-full p-2 text-left text-sm text-white/70 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                      >
                        {caption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Platforms */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/80 mb-3">
                    Share to
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {socialPlatforms.map((platform) => (
                      <motion.button
                        key={platform.id}
                        onClick={() => handleShare(platform)}
                        disabled={isSharing}
                        className={`flex items-center space-x-3 p-3 rounded-xl text-white font-medium transition-all ${platform.color} disabled:opacity-50`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="text-lg">{platform.icon}</span>
                        <span className="text-sm">{platform.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Copy Link */}
                <div className="border-t border-white/10 pt-4">
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-colors"
                  >
                    <span className="text-lg">🔗</span>
                    <span className="text-sm font-medium">Copy Link</span>
                  </button>
                </div>

                {/* Hashtags */}
                {capsuleData?.sharing?.hashtags && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-white/60 mb-2">Suggested hashtags:</p>
                    <div className="flex flex-wrap gap-1">
                      {capsuleData.sharing.hashtags.map((hashtag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full cursor-pointer hover:bg-purple-500/30 transition-colors"
                          onClick={() => {
                            const newCaption = `${customCaption} ${hashtag}`.trim();
                            if (newCaption.length <= 280) {
                              setCustomCaption(newCaption);
                            }
                          }}
                        >
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SocialSharing;