"use client";
import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { FaCheck, FaTimes } from 'react-icons/fa';

export default function UpgradeModal({ isOpen, onClose, paperName }) {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      // Redirect to sign up if not authenticated
      window.location.href = '/sign-up';
      return;
    }

    setIsLoading(true);
    try {
      console.log('🚀 Starting checkout process from UpgradeModal...');
      console.log('📋 Price ID:', process.env.NEXT_PUBLIC_STRIPE_PRICE_ID);
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
        }),
      });

      const data = await response.json();
      console.log('📡 API Response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { sessionId } = data;
      
      // Redirect to Stripe Checkout
      const stripe = await import('@stripe/stripe-js').then(m => 
        m.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      );
      
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('❌ Purchase error:', error);
      alert(`Something went wrong: ${error.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#150025] to-[#280040] rounded-2xl shadow-2xl border border-[#5c4d7d] max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#5c4d7d]">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">
              {paperName ? 'Upgrade Required' : 'Go Premium'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>
          {paperName && (
            <p className="text-gray-300 mt-2">
              {paperName} requires a premium subscription to access.
            </p>
          )}
        </div>

        {/* Pricing Card - Reusing from Landing Page */}
        <div className="p-6">
          <div className="bg-[#1a0030] rounded-2xl shadow-lg border border-[#5c4d7d] p-8">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold text-white">Premium Access</h3>
              <p className="text-gray-400">Unlock all exam papers</p>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> Access to all past papers (2017-2023)
              </li>
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> Specimen and practice papers
              </li>
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> Detailed analytics and progress tracking
              </li>
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> Authentic exam interface
              </li>
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> Unlimited practice attempts
              </li>
            </ul>
            <button 
              onClick={handlePurchase}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-[#8e44ad] rounded-xl font-semibold hover:bg-[#9b59b6] transition-all duration-300 shadow-[0_0_20px_rgba(142,68,173,0.8)] disabled:opacity-50 text-white"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                'Join Today'
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <p className="text-center text-gray-400 text-sm">
            Practice Papers 1 & 2 remain free forever
          </p>
        </div>
      </div>
    </div>
  );
}