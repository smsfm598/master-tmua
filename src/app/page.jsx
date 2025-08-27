"use client";
import React, { useState } from "react";
import Dashboard from './dashboard/Dashboard';
import LandingPage from './LandingPage';
import { useUser } from '@clerk/nextjs';
import 'katex/dist/katex.min.css';


// Import the exam component from the separate file
import ExamInterface from './practice-p1/page';

export default function Home() {
  const [showExam, setShowExam] = useState(false);
  const { user, isLoaded } = useUser();
  
  // Show loading state while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  
  if (showExam) {
    return <ExamInterface onReturnToDashboard={() => setShowExam(false)} />;
  }
  
  // Always show LandingPage first - users can navigate to login/signup from there
  // Only show Dashboard if user is authenticated AND not on landing page
  if (user) {
    return <Dashboard onReady={() => setShowExam(true)} />;
  }
  
  // Show LandingPage as the default first page
  return <LandingPage onGetStarted={() => {}} />;
}