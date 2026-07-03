"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Sidebar from '../../components/Sidebar';
import UpgradeModal from '../../components/UpgradeModal';
import { checkUserEntitlements, isPaperFree } from '../../lib/supabase';

export default function PapersPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [selectedYear, setSelectedYear] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userEntitlements, setUserEntitlements] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, paperName: '' });
  const [loading, setLoading] = useState(true);
  
  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check user entitlements when user loads
  useEffect(() => {
    const checkEntitlements = async () => {
      if (user) {
        const entitlements = await checkUserEntitlements(user.id);
        setUserEntitlements(entitlements);
      }
      setLoading(false);
    };

    if (isLoaded) {
      checkEntitlements();
    }
  }, [user, isLoaded]);
  
  // Show loading state while Clerk initializes
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }
  
  // Complete paper list organized by year
  const papersByYear = {
    'Practice': ['Practice Paper 1', 'Practice Paper 2'],
    'Specimen': ['Specimen Paper 1', 'Specimen Paper 2'],
    '2017': ['2017 Paper 1', '2017 Paper 2'],
    '2018': ['2018 Paper 1', '2018 Paper 2'],
    '2019': ['2019 Paper 1', '2019 Paper 2'],
    '2020': ['2020 Paper 1', '2020 Paper 2'],
    '2021': ['2021 Paper 1', '2021 Paper 2'],
    '2022': ['2022 Paper 1', '2022 Paper 2'],
    '2023': ['2023 Paper 1', '2023 Paper 2']
  };
  
  const allPapers = Object.values(papersByYear).flat();
  const displayPapers = selectedYear === 'all' ? allPapers : papersByYear[selectedYear] || [];
  
  // Function to map paper names to their corresponding routes
  const getPaperRoute = (paperName) => {
    const routeMap = {
      'Specimen Paper 1': '/specimen-p1',
      'Specimen Paper 2': '/specimen-p2',
      'Practice Paper 1': '/practice-p1',
      'Practice Paper 2': '/practice-p2',
      '2017 Paper 1': '/2017-p1',
      '2017 Paper 2': '/2017-p2',
      '2018 Paper 1': '/2018-p1',
      '2018 Paper 2': '/2018-p2',
      '2019 Paper 1': '/2019-p1',
      '2019 Paper 2': '/2019-p2',
      '2020 Paper 1': '/2020-p1',
      '2020 Paper 2': '/2020-p2',
      '2021 Paper 1': '/2021-p1',
      '2021 Paper 2': '/2021-p2',
      '2022 Paper 1': '/2022-p1',
      '2022 Paper 2': '/2022-p2',
      '2023 Paper 1': '/2023-p1',
      '2023 Paper 2': '/2023-p2'
    };
    return routeMap[paperName] || '/exam-interface';
  };
  
  const handlePaperClick = (paperName) => {
    // All papers are accessible for now
    console.log(`Starting: ${paperName}`);
    const route = getPaperRoute(paperName);
    router.push(route);
  };

  const getPaperStatus = (paperName) => {
    // All papers are accessible for now
    return 'accessible';
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} currentPage="papers" />
      
      <main className={`flex-1 transition-all duration-300 ${
        sidebarCollapsed 
          ? 'ml-12 sm:ml-14 md:ml-16' 
          : 'ml-48 sm:ml-56 md:ml-64 lg:ml-72'
      }`}>
        {/* Header */}
        <div className="bg-[#1a0030]/80 backdrop-blur-sm border-b border-[#5c4d7d]/30 sticky top-0 z-10">
          <div className="px-4 sm:px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">TMUA Papers</h1>
              <p className="text-gray-300 text-sm sm:text-base">
                Choose any paper to practice
              </p>
            </div>
            {!userEntitlements?.hasFullAccess && (
              <button
                onClick={() => setUpgradeModal({ isOpen: true, paperName: 'All Premium Papers' })}
                className="bg-[#8e44ad] hover:bg-[#9b59b6] text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Upgrade Now
              </button>
            )}
          </div>
        </div>
        
        <div className="px-4 sm:px-6 py-6 sm:py-8">
          {/* Filter Buttons */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Filter by Year:</h2>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => setSelectedYear('all')}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-300 text-xs sm:text-sm ${
                  selectedYear === 'all'
                    ? 'bg-[#8e44ad] text-white shadow-lg'
                    : 'bg-[#1a0030] text-gray-300 border border-[#5c4d7d] hover:bg-[#2a0045]'
                }`}
              >
                All Papers
              </button>
              {Object.keys(papersByYear).map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-300 text-xs sm:text-sm ${
                    selectedYear === year
                      ? 'bg-[#8e44ad] text-white shadow-lg'
                      : 'bg-[#1a0030] text-gray-300 border border-[#5c4d7d] hover:bg-[#2a0045]'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          
          {/* Papers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {displayPapers.map((paper, index) => {
              const status = getPaperStatus(paper);
              const isLocked = status === 'locked';
              
              return (
                <div
                  key={index}
                  className={`group rounded-xl border p-4 sm:p-6 transition-all duration-300 cursor-pointer ${
                    isLocked
                      ? 'bg-gradient-to-br from-[#1a0030]/50 to-[#2a0045]/50 border-[#5c4d7d]/50 hover:border-[#8e44ad]/50'
                      : 'bg-gradient-to-br from-[#1a0030] to-[#2a0045] border-[#5c4d7d] hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105'
                  }`}
                  onClick={() => handlePaperClick(paper)}
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-transform duration-300 ${
                      isLocked
                        ? 'bg-gradient-to-br from-gray-500 to-gray-600'
                        : 'bg-gradient-to-br from-purple-500 to-pink-500 group-hover:scale-110'
                    }`}>
                      <span className="text-white font-bold text-sm sm:text-lg">
                        {isLocked ? '🔒' : '📊'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Duration</div>
                      <div className="text-xs sm:text-sm font-semibold text-white">75 min</div>
                    </div>
                  </div>
                  
                  <h3 className={`text-sm sm:text-lg font-semibold mb-2 transition-colors duration-300 ${
                    isLocked
                      ? 'text-gray-400'
                      : 'text-white group-hover:text-purple-300'
                  }`}>
                    {paper}
                  </h3>
                  
                  <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                    20 questions • Multiple choice
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${
                      status === 'free' ? 'text-green-400' :
                      status === 'accessible' ? 'text-blue-400' :
                      'text-gray-500'
                    }`}>
                      {status === 'free' ? 'FREE' :
                       status === 'accessible' ? 'EXAM SIMULATION' :
                       'LOCKED'}
                    </span>
                    <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300 ${
                      isLocked
                        ? 'bg-gray-600 text-gray-300'
                        : 'bg-[#8e44ad] text-white group-hover:bg-[#9b59b6]'
                    }`}>
                      {isLocked ? 'Upgrade' : 'Start'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {displayPapers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-base sm:text-lg">No papers found for the selected filter.</div>
            </div>
          )}
        </div>
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ isOpen: false, paperName: '' })}
        paperName={upgradeModal.paperName}
      />
    </div>
  );
}