"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignIn, useUser } from '@clerk/nextjs';
import { createUserProfile, getUserProfile } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { user, isLoaded: userLoaded } = useUser();

  // Check if user is already signed in and redirect to dashboard
  useEffect(() => {
    if (userLoaded && user) {
      router.push('/dashboard');
    }
  }, [user, userLoaded, router]);

  // Don't render the login form if user is already signed in
  if (userLoaded && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] text-white flex items-center justify-center p-4">
        <div className="bg-[#1a0030] rounded-2xl shadow-lg border border-[#5c4d7d] p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Signing In</h2>
          <p className="text-gray-300 mb-6">Redirecting you to your dashboard...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  const handleUserProfileSetup = async (user) => {
    try {
      // Check if user profile exists in Supabase
      const existingProfile = await getUserProfile(user.id);
      
      if (!existingProfile) {
        // Create new user profile in Supabase
        await createUserProfile(user.id, user.emailAddresses[0]?.emailAddress);
        console.log('User profile created in Supabase');
      }
    } catch (error) {
      console.error('Error setting up user profile:', error);
    }
  };

  async function handleGoogleSignIn() {
    if (!isLoaded) return;

    try {
      setLoading(true);
      setError('');
      
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isLoaded) {
      setError('Authentication service not ready. Please try again.');
      return;
    }

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        
        // Set up user profile in Supabase
        if (result.createdUserId) {
          await handleUserProfileSetup({ 
            id: result.createdUserId, 
            emailAddresses: [{ emailAddress: email }] 
          });
        }
        
        router.push('/dashboard');
      } else {
        console.log('Sign-in result:', result);
        setError('Login incomplete. Please check your credentials or verify your account.');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.errors && err.errors.length > 0) {
        const errorMessage = err.errors[0].message;
        if (errorMessage.includes('Invalid')) {
          setError('Invalid email or password. Please check your credentials.');
        } else if (errorMessage.includes('not found')) {
          setError('No account found with this email. Please sign up first.');
        } else {
          setError(errorMessage);
        }
      } else {
        setError('Failed to log in. Please check your email and password.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] text-white flex items-center justify-center p-4">
      <div className="bg-[#1a0030] rounded-2xl shadow-lg border border-[#5c4d7d] p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-300">Log in to access your TMUA practice dashboard</p>
        </div>
        
        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full p-3 mb-6 bg-[#2a0045] border border-[#5c4d7d] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 hover:bg-[#3a0055] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
        
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#5c4d7d]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-[#1a0030] text-gray-400">Or continue with email</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-[#2a0045] border border-[#5c4d7d] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-[#2a0045] border border-[#5c4d7d] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !isLoaded}
            className="w-full px-6 py-3 bg-gradient-to-r from-[#8e44ad] to-[#9b59b6] rounded-lg font-semibold hover:from-[#9b59b6] hover:to-[#a569bd] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Signing In...
              </div>
            ) : (
              'Log In'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center text-gray-400">
          Don't have an account?{' '}
          <Link href="/sign-up" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
