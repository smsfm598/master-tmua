"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';

// Improved Sidebar Component
export default function Sidebar({ collapsed, setCollapsed, currentPage = '' }) {
  const router = useRouter();
  const { signOut } = useClerk();
  
  const handleNavigation = (path) => {
    router.push(path);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <div className={`bg-gradient-to-b from-[#1a0030] to-[#2a0045] border-r border-[#5c4d7d]/30 h-screen fixed transition-all duration-300 ease-in-out shadow-2xl backdrop-blur-sm flex flex-col z-50 ${
      collapsed 
        ? 'w-12 sm:w-14 md:w-16' 
        : 'w-48 sm:w-56 md:w-64 lg:w-72'
    }`}>
      {/* Header */}
      <div className="p-2 sm:p-3 md:p-4 flex justify-between items-center border-b border-[#5c4d7d]/20 backdrop-blur-sm">
        {!collapsed && (
          <div className="text-sm sm:text-lg md:text-xl font-bold text-white tracking-wide bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Ace TMUA
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="group w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-[#2a0045] to-[#3a0055] flex items-center justify-center text-white hover:from-[#3a0055] hover:to-[#4a0065] transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 active:scale-95"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="mt-4 sm:mt-6 px-1 sm:px-2 flex-1">
        <ul className="space-y-1 sm:space-y-2">
          {/* Dashboard Section */}
          <li>
            <button 
              onClick={() => handleNavigation('/dashboard')}
              className={`group w-full flex items-center px-2 sm:px-3 md:px-4 py-2 sm:py-3 transition-all duration-300 ease-in-out rounded-xl transform hover:scale-[1.02] active:scale-[0.98] ${
                currentPage === 'dashboard'
                  ? 'text-white bg-gradient-to-r from-[#2a0045] to-[#3a0055] shadow-lg shadow-purple-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-[#2a0045] hover:to-[#3a0055] hover:shadow-lg hover:shadow-purple-500/20'
              }`}
            >
              {!collapsed && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <span className="text-xs sm:text-sm font-bold">🏠</span>
                </div>
              )}
              {!collapsed && (
                <span className="font-medium ml-2 sm:ml-3 text-xs sm:text-sm md:text-base">Dashboard</span>
              )}
            </button>
          </li>
          
          {/* Papers Section */}
          <li>
            <button 
              onClick={() => handleNavigation('/papers')}
              className={`group w-full flex items-center px-2 sm:px-3 md:px-4 py-2 sm:py-3 transition-all duration-300 ease-in-out rounded-xl transform hover:scale-[1.02] active:scale-[0.98] ${
                currentPage === 'papers'
                  ? 'text-white bg-gradient-to-r from-[#2a0045] to-[#3a0055] shadow-lg shadow-purple-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-[#2a0045] hover:to-[#3a0055] hover:shadow-lg hover:shadow-purple-500/20'
              }`}
            >
              {!collapsed && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <span className="text-xs sm:text-sm font-bold">📊</span>
                </div>
              )}
              {!collapsed && (
                <span className="font-medium ml-2 sm:ml-3 text-xs sm:text-sm md:text-base">Papers</span>
              )}
            </button>
          </li>
          
          {/* Marks Section */}
          <li>
            <button 
              onClick={() => handleNavigation('/marks')}
              className={`group w-full flex items-center px-2 sm:px-3 md:px-4 py-2 sm:py-3 transition-all duration-300 ease-in-out rounded-xl transform hover:scale-[1.02] active:scale-[0.98] ${
                currentPage === 'marks'
                  ? 'text-white bg-gradient-to-r from-[#2a0045] to-[#3a0055] shadow-lg shadow-purple-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-[#2a0045] hover:to-[#3a0055] hover:shadow-lg hover:shadow-purple-500/20'
              }`}
            >
              {!collapsed && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <span className="text-xs sm:text-sm font-bold">📋</span>
                </div>
              )}
              {!collapsed && (
                <span className="font-medium ml-2 sm:ml-3 text-xs sm:text-sm md:text-base">Marks</span>
              )}
            </button>
          </li>
        </ul>
      </nav>
      
      {/* Sign Out Button */}
      <div className="p-2 sm:p-3 md:p-4 border-t border-[#5c4d7d]/20">
        <button 
          onClick={handleSignOut}
          className="group w-full flex items-center px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-gray-300 hover:text-white transition-all duration-300 ease-in-out rounded-xl hover:bg-gradient-to-r hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:shadow-red-500/20 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          {!collapsed && (
            <span className="font-medium ml-2 sm:ml-3 text-xs sm:text-sm md:text-base">Sign Out</span>
          )}
        </button>
      </div>
      
      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#2a0045] to-transparent pointer-events-none"></div>
    </div>
  );
}