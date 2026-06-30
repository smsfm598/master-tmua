"use client";
import React, { useState, useEffect } from 'react';
import { createUserProfile, getUserProfile } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignUp, useUser } from '@clerk/nextjs';


export default function SignUp() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { user, isLoaded: userLoaded } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Check if user is already signed in and redirect to dashboard
  useEffect(() => {
    if (userLoaded && user) {
      router.push('/dashboard');
    }
  }, [user, userLoaded, router]);

  // Don't render the signup form if user is already signed in
  if (userLoaded && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] text-white flex items-center justify-center p-4">
        <div className="bg-[#1a0030] rounded-2xl shadow-lg border border-[#5c4d7d] p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Already Signed In</h2>
          <p className="text-gray-300 mb-6">Redirecting you to your dashboard...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  async function handleGoogleSignUp() {
    if (!isLoaded) return;

    try {
      setLoading(true);
      setError('');
      
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    } catch (err) {
      console.error('Google sign-up error:', err);
      setError('Failed to sign up with Google. Please try again.');
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

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setLoading(true);
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      if (result.status === 'missing_requirements') {
        // Email verification required
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setVerificationStep(true);
      } else if (result.status === 'complete') {
        // Account created successfully
        await setActive({ session: result.createdSessionId });
        
        // Create user profile in Supabase
        await createUserProfile(result.createdUserId, email);
        
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Sign-up error:', err);
      
      if (err.errors && err.errors.length > 0) {
        const errorMessage = err.errors[0].message;
        if (errorMessage.includes('already exists')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else if (errorMessage.includes('password')) {
          setError('Password must be at least 8 characters and include a mix of letters and numbers.');
        } else {
          setError(errorMessage);
        }
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerification(e) {
    e.preventDefault();
    setError('');

    console.log('handleVerification called with code:', verificationCode);

    if (!verificationCode) {
      setError('Please enter the verification code.');
      return;
    }

    try {
      setLoading(true);
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      console.log('Verification result:', result);

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        
        // Create user profile in Supabase
        await createUserProfile(result.createdUserId, email);
        
        router.push('/dashboard');
      } else if (result.status === 'needs_first_factor') {
        setError('Please complete additional verification steps.');
      } else {
        console.log('Verification result:', result);
        setError('Verification failed. Please check the code and try again.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      console.error('Verification error details:', err.errors, err.message);
      
      if (err.errors && err.errors.length > 0) {
        setError(err.errors[0].message);
      } else {
        setError(err.message || 'Invalid verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (verificationStep) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] text-white flex items-center justify-center p-4">
        <div className="bg-[#1a0030] rounded-2xl shadow-lg border border-[#5c4d7d] p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Verify Your Email</h1>
            <p className="text-gray-300">We've sent a verification code to <span className="text-purple-400">{email}</span></p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleVerification} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2 text-sm font-medium">Verification Code</label>
              <input 
                type="text" 
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full p-3 bg-[#2a0045] border border-[#5c4d7d] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-center text-lg tracking-widest"
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
                disabled={loading}
              />
            </div>
            
            {/* CAPTCHA widget container for verification step */}
            <div id="clerk-captcha" data-cl-theme="dark" data-cl-size="normal" className="mb-4" />
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#8e44ad] to-[#9b59b6] rounded-lg font-semibold hover:from-[#9b59b6] hover:to-[#a569bd] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Verifying...
                </div>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setVerificationStep(false)}
              className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
            >
              ← Back to sign up
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] text-white flex items-center justify-center p-4">
      <div className="bg-[#1a0030] rounded-2xl shadow-lg border border-[#5c4d7d] p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-300">Join thousands of students preparing for TMUA</p>
        </div>
        
        {/* Google Sign Up Button */}
        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full p-3 mb-6 bg-[#2a0045] border border-[#5c4d7d] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 hover:bg-[#3a0055] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Creating Account...' : 'Continue with Google'}
        </button>
        
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#5c4d7d]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-[#1a0030] text-gray-400">Or create with email</span>
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
              placeholder="Create a strong password"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-[#2a0045] border border-[#5c4d7d] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Confirm your password"
              required
              disabled={loading}
            />
          </div>
          
          <div className="text-xs text-gray-400 mt-2">
            Password must be at least 8 characters long
          </div>
          
          {/* CAPTCHA widget container */}
          <div id="clerk-captcha" data-cl-theme="dark" data-cl-size="normal" className="mb-4" />
          
          <button 
            type="submit" 
            disabled={loading || !isLoaded}
            className="w-full px-6 py-3 bg-gradient-to-r from-[#8e44ad] to-[#9b59b6] rounded-lg font-semibold hover:from-[#9b59b6] hover:to-[#a569bd] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
