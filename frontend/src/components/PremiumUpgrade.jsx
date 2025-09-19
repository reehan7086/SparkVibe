// frontend/src/components/PremiumUpgrade.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { apiPost } from '../utils/safeUtils';

const PremiumUpgrade = ({ currentTier = 'basic' }) => {
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState('pro');
  const [error, setError] = useState(null);

  const tiers = {
    basic: {
      name: 'Basic',
      price: 0,
      features: ['5 Vibe Cards per day', 'Basic templates', 'Limited sharing', 'Basic analytics'],
      color: 'gray'
    },
    pro: {
      name: 'Pro',
      price: 9.99,
      features: [
        'Unlimited Vibe Cards',
        'Advanced templates',
        'Unlimited sharing',
        'Advanced analytics dashboard',
        'Priority support',
        'Custom backgrounds',
        'No ads'
      ],
      color: 'blue',
      popular: true
    },
    enterprise: {
      name: 'Enterprise',
      price: 29.99,
      features: [
        'Everything in Pro',
        'API access',
        'Custom branding',
        'Team collaboration',
        'Dedicated support',
        'Advanced insights',
        'Export data'
      ],
      color: 'purple'
    }
  };

  const handleUpgrade = async (tier) => {
    if (tier === 'basic' || tier === currentTier) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiPost('/premium/create-checkout', {
        tier,
        userId: localStorage.getItem('userId')
      });
      if (response.success && response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        setError('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      setError('Failed to process upgrade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Unlock Premium Features
          </h1>
          <p className="text-gray-400 text-lg">Choose the plan that's right for you</p>
        </div>
        {error && <div className="text-red-400 text-center mb-4">{error}</div>}
        <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(tiers).map(([key, tier]) => (
            <motion.div
              key={key}
              whileHover={{ scale: 1.02 }}
              className={`relative bg-gray-800 rounded-2xl p-6 ${tier.popular ? 'ring-2 ring-blue-500' : ''}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 text-white">{tier.name}</h3>
                <div className="text-4xl font-bold mb-2 text-white">
                  ${tier.price}
                  {tier.price > 0 && <span className="text-lg text-gray-400">/month</span>}
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-300">
                    <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(key)}
                disabled={loading || currentTier === key}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  currentTier === key
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : tier.popular
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {currentTier === key ? 'Current Plan' : loading ? 'Processing...' : 'Upgrade'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PremiumUpgrade;