"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { createUserProfile, supabase } from '../lib/supabase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const [isClerkReady, setIsClerkReady] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (clerk.loaded) {
      setIsClerkReady(true);
    } else {
      // Wait for Clerk to load
      const checkClerk = setInterval(() => {
        if (clerk.loaded) {
          setIsClerkReady(true);
          clearInterval(checkClerk);
        }
      }, 100);

      return () => clearInterval(checkClerk);
    }
  }, [clerk.loaded]);

  // Check and create user profile in Supabase
  useEffect(() => {
    const checkAndCreateProfile = async () => {
      if (clerkUser && isClerkReady && !profileChecked) {
        try {
          // Check if profile already exists
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('clerk_user_id', clerkUser.id)
            .single();

          if (error && error.code === 'PGRST116') { // Profile not found
            // Create new profile
            const email = clerkUser.primaryEmailAddress?.emailAddress;
            if (email) {
              await createUserProfile(clerkUser.id, email);
              console.log('Created new user profile in Supabase');
            }
          }
        } catch (error) {
          console.error('Error checking/creating user profile:', error);
        } finally {
          setProfileChecked(true);
        }
      }
    };

    checkAndCreateProfile();
  }, [clerkUser, isClerkReady, profileChecked]);

  // Transform Clerk user to match existing interface
  const currentUser = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress,
    name: clerkUser.fullName || clerkUser.firstName || 'User'
  } : null;

  const value = {
    currentUser,
    loading: !isLoaded || !isClerkReady || !profileChecked,
    isSignedIn: isSignedIn && isClerkReady
  };

  // Show loading state while Clerk initializes or we check profile
  if (!isClerkReady || (isSignedIn && !profileChecked)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#150025] to-[#280040]">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}