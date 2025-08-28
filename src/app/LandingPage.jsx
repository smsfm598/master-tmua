'use client';
import React, { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { FaDesktop, FaRegClock, FaChartLine } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';

export default function LandingPage() {
  const pricingRef = useRef(null);
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePurchase = async () => {
    if (!user) {
      // Redirect to sign up if not authenticated
      window.location.href = '/sign-up';
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID, // You'll need to add this
        }),
      });

      const { sessionId } = await response.json();
      
      // Redirect to Stripe Checkout
      const stripe = await import('@stripe/stripe-js').then(m => 
        m.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      );
      
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="text-xl font-bold">Master TMUA</div>
        <div className="flex gap-4">
          <Link href="/login">
            <button className="px-4 py-2 rounded-full border border-[#5c4d7d] hover:bg-[#5c4d7d]/20 transition-all duration-300">
              Log In
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="px-4 py-2 bg-[#8e44ad] rounded-full hover:bg-[#9b59b6] transition-all duration-300 shadow-[0_0_15px_rgba(142,68,173,0.5)]">
              Sign Up
            </button>
          </Link>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Master the exam interface<br />before test day.
        </h1>
        <p className="text-xl mb-10 text-gray-300 max-w-3xl">
          Train in a real exam environment that looks and feels exactly like the
          Pearson VUE system, with smart analytics to track progress and boost performance
        </p>
        <div className="flex flex-wrap gap-6 justify-center mb-16">
           <Link href="/specimen-p1" className="inline-block">
            <button
              className="px-8 py-4 bg-[#8e44ad] rounded-full font-semibold hover:bg-[#9b59b6] transition-all duration-300 shadow-[0_0_15px_rgba(142,68,173,0.5)] hover:shadow-[0_0_20px_rgba(142,68,173,0.8)]">
              Try Demo
            </button>
          </Link>
          <button
            onClick={() => scrollToSection(pricingRef)}
            className="px-8 py-4 bg-transparent border-2 border-[#5c4d7d] rounded-full font-semibold hover:bg-[#5c4d7d]/20 transition-all duration-300 shadow-[0_0_15px_rgba(92,77,125,0.3)] hover:shadow-[0_0_20px_rgba(92,77,125,0.5)]"
          >
            Join Today
          </button>
        </div>
        <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(142,68,173,0.5)] border border-[#5c4d7d]">
          <img src="/dashboard-sample.png" alt="TMUA Dashboard" className="w-full h-auto" />
        </div>
      </section>
{/* Exam Interface Section Replacement */}
<section className="container mx-auto px-4 py-20">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
    
    {/* Column 1 */}
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="bg-[#1a0030]/50 rounded-3xl border border-[#5c4d7d] shadow-[0_0_30px_rgba(92,77,125,0.3)] p-8 flex flex-col items-center space-y-4"
    >
      <FaDesktop className="text-purple-400 text-5xl" />
      <h3 className="text-2xl font-bold">Authentic Exam Feel</h3>
      <p className="text-gray-300">
        Practice in an environment that looks and feels exactly like the real Pearson VUE TMUA exam.
      </p>
    </motion.div>

    {/* Column 2 */}
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      viewport={{ once: true }}
      className="bg-[#1a0030]/50 rounded-3xl border border-[#5c4d7d] shadow-[0_0_30px_rgba(92,77,125,0.3)] p-8 flex flex-col items-center space-y-4"
    >
      <FaRegClock className="text-purple-400 text-5xl" />
      <h3 className="text-2xl font-bold">Train in Real Time</h3>
      <p className="text-gray-300">
        Experience real exam timing with built-in countdowns and navigation tools.
      </p>
    </motion.div>

    {/* Column 3 */}
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      viewport={{ once: true }}
      className="bg-[#1a0030]/50 rounded-3xl border border-[#5c4d7d] shadow-[0_0_30px_rgba(92,77,125,0.3)] p-8 flex flex-col items-center space-y-4"
    >
      <FaChartLine className="text-purple-400 text-5xl" />
      <h3 className="text-2xl font-bold">Stay Motivated</h3>
      <p className="text-gray-300">
        Track your progress over time and see how your preparation pays off.
      </p>
    </motion.div>

  </div>
</section>

      {/* Pricing Section */}
      <section ref={pricingRef} className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">Get Started Today</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Free Plan */}
          <div className="bg-[#1a0030] rounded-2xl shadow-lg border border-[#5c4d7d] p-8 flex flex-col">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold">Free</h3>
              <p className="text-gray-400">Free Forever</p>
            </div>
            <ul className="flex-1 space-y-3 mb-6">
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> Access to sample paper
              </li>
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> Personalised dashboard view
              </li>
              <li className="flex items-center text-gray-400">
                <FaTimes className="text-red-400 mr-3" /> No in depth analytics
              </li>
              <li className="flex items-center text-gray-400">
                <FaTimes className="text-red-400 mr-3" /> Single paper access
              </li>
              <li className="flex items-center text-gray-400">
                <FaTimes className="text-red-400 mr-3" /> Less practice
              </li>
            </ul>
            <Link href="/sign-up">
              <button className="w-full px-6 py-3 bg-transparent border-2 border-[#5c4d7d] rounded-xl font-semibold hover:bg-[#5c4d7d]/20 transition-all duration-300">
                Sign Up
              </button>
            </Link>
          </div>

          {/* Paid Plan */}
          <div className="bg-[#1a0030] rounded-2xl shadow-lg border-2 border-purple-500 p-8 flex flex-col shadow-[0_0_25px_rgba(142,68,173,0.7)] hover:shadow-[0_0_35px_rgba(142,68,173,1)] transition-all duration-300">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold">Master TMUA Premium</h3>
              <span className="text-gray-400 line-through text-xl">£24.99</span>
              <span className="text-3xl font-bold ml-3 text-purple-400">£9.99</span>
            </div>
            <ul className="flex-1 space-y-3 mb-6">
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> 1:1 replica of Pearson exam interface
              </li>
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> In depth analytics for personal growth
              </li>
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> All your papers in one place
              </li>
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> Very high value for money, lowest price on the market
              </li>
              <li className="flex items-center text-gray-300">
                <FaCheck className="text-green-400 mr-3" /> Review your progress over time
              </li>
            </ul>
            <Link href="/sign-up">
              <button 
                onClick={handlePurchase}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-[#8e44ad] rounded-xl font-semibold hover:bg-[#9b59b6] transition-all duration-300 shadow-[0_0_20px_rgba(142,68,173,0.8)] disabled:opacity-50"
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
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0c0015] py-10 border-t border-[#5c4d7d]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About */}
            <div>
              <h3 className="text-xl font-semibold mb-4">About Our Platform</h3>
              <p className="text-gray-400">
                We provide the most authentic TMUA practice experience with an interface that exactly matches the Pearson VUE system used in the real exam.
              </p>
            </div>

            {/* Navigation */}
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
              <nav className="flex flex-col space-y-2">
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
                <Link href="/practice-p1" className="text-gray-400 hover:text-white transition-colors">Demo</Link>
                <button onClick={() => scrollToSection(pricingRef)} className="text-gray-400 hover:text-white transition-colors text-left">Pricing</button>
                <Link href="mailto:mastertmua@outlook.com" className="text-gray-400 hover:text-white transition-colors">Contact</Link>
              </nav>
            </div>

            {/* Contact */}
            <div className="flex flex-col items-end">
              <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
              <a href="mailto:mastertmua@outlook.com" className="text-gray-400 hover:text-white transition-colors">
                acetmua@outlook.com
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-[#5c4d7d] text-center text-gray-500">
            <p>© {new Date().getFullYear()} Master TMUA. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
