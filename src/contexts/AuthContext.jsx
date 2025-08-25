"use client";
import React, { createContext, useContext } from 'react';
import { useUser } from '@clerk/nextjs';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();

  // Transform Clerk user to match existing interface
  const currentUser = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress,
    name: clerkUser.fullName || clerkUser.firstName || 'User'
  } : null;

  const value = {
    currentUser,
    loading: !isLoaded,
    isSignedIn
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}