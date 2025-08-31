"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const [isClerkReady, setIsClerkReady] = useState(false);

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

  // Transform Clerk user to match existing interface
  const currentUser = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress,
    name: clerkUser.fullName || clerkUser.firstName || 'User'
  } : null;

  const value = {
    currentUser,
    loading: !isLoaded || !isClerkReady,
    isSignedIn: isSignedIn && isClerkReady
  };

  // Show loading state while Clerk initializes
  if (!isClerkReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}