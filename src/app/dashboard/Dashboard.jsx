"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { getUserExamResults } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';

// Header Component
function Header() {
  const { user } = useUser();
  
  return (
    <header className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Hi {user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User'}!
        </h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
          {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}

// Ready to Test Card Component (Updated for responsiveness)
function ReadyToTestCard({ onReady }) {
  const router = useRouter();
  
  const handleReadyClick = () => {
    router.push('/papers');
  };
  
  return (
    <div className="bg-[#1a0030] p-4 sm:p-6 rounded-xl border border-[#5c4d7d] shadow-lg h-full flex flex-col justify-between min-h-[180px]">
      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Ready To Test?</h3>
        <p className="text-gray-400 text-sm mb-4">Start your practice exam now</p>
      </div>
      <button 
        onClick={handleReadyClick}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
      >
        Ready
      </button>
    </div>
  );
}

// Days Left Counter Component (Updated for responsiveness)
function DaysLeftCounter() {
  const examDate = new Date('2026-10-13');
  const today = new Date();
  const timeDiff = examDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  return (
    <div className="bg-[#1a0030] p-4 sm:p-6 rounded-xl border border-[#5c4d7d] shadow-lg h-full flex flex-col justify-center min-h-[180px]">
      <div className="text-center">
        <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-purple-400 mb-2">{daysLeft}</div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Days Left</h3>
        <p className="text-gray-400 text-xs sm:text-sm">Until TMUA 2025</p>
      </div>
    </div>
  );
}

// Average Score Card Component (Updated for responsiveness)
function AverageScoreCard() {
  const { user } = useUser();
  const [averageScore, setAverageScore] = useState(0);
  const [totalExams, setTotalExams] = useState(0);
  
  const [scoreData, setScoreData] = useState({
    average: 0,
    highest: 0,
    lowest: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      if (!user) return;
      try {
        // Use our shared helper function
        console.log('📊 [AverageScoreCard] Calling getUserExamResults with userId:', user.id);
        const examHistory = await getUserExamResults(user.id);
        console.log('📊 [AverageScoreCard] Received examHistory:', examHistory);
        
        if (examHistory && examHistory.length > 0) {
          const allScores = examHistory.map(r => {
            const percent = Math.round((r.score / r.total_questions) * 100);
            console.log('📊 [AverageScoreCard] Processing result:', r, '→ percent:', percent);
            return percent;
          });
          // Filter out 0% scores for calculations
          const nonZeroScores = allScores.filter(score => score > 0);
          console.log('📊 [AverageScoreCard] nonZeroScores:', nonZeroScores);
          
          if (nonZeroScores.length > 0) {
            const average = Math.round(nonZeroScores.reduce((a, b) => a + b, 0) / nonZeroScores.length);
            const highest = Math.max(...nonZeroScores);
            const lowest = Math.min(...nonZeroScores);
            console.log('📊 [AverageScoreCard] Setting scoreData:', { average, highest, lowest });
            setScoreData({ average, highest, lowest });
          } else {
            // No tests taken or all scores are 0%
            console.log('📊 [AverageScoreCard] No non-zero scores, setting 0s');
            setScoreData({ average: 0, highest: 0, lowest: 0 });
          }
        } else {
          // No exam data found
          console.log('📊 [AverageScoreCard] No exam history found');
          setScoreData({ average: 0, highest: 0, lowest: 0 });
        }
      } catch (error) {
        console.error('❌ [AverageScoreCard] Error loading user scores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-[#1a0030] p-6 rounded-xl border border-[#5c4d7d] shadow-lg h-48 flex items-center justify-center">
        <div className="text-gray-400">Loading scores...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a0030] p-6 rounded-xl border border-[#5c4d7d] shadow-lg h-48">
      <h3 className="text-lg font-semibold text-white mb-2">Average Score</h3>
      <div className="text-4xl font-bold text-white mb-4">{scoreData.average}%</div>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Highest Score</span>
          <span className="text-white">{scoreData.highest}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1">
          <div className="bg-green-500 h-1 rounded-full" style={{width: `${scoreData.highest}%`}}></div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Lowest Score</span>
          <span className="text-white">{scoreData.lowest}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1">
          <div className="bg-orange-500 h-1 rounded-full" style={{width: `${scoreData.lowest}%`}}></div>
        </div>
      </div>
    </div>
  );
}

// Progress Circle Component (Updated for responsiveness)
function ProgressCircle() {
  const { user } = useUser();
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (user) {
      const fetchProgress = async () => {
        try {
          // Use our shared helper function
          console.log('🔵 [ProgressCircle] Calling getUserExamResults with userId:', user.id);
          const examHistory = await getUserExamResults(user.id);
          console.log('🔵 [ProgressCircle] Received examHistory:', examHistory);
          
          // Only include papers with score > 0
          const eligiblePapers = examHistory.filter(r => r.score > 0);
          const uniquePapers = new Set(eligiblePapers.map(r => r.paper_name));
          console.log('🔵 [ProgressCircle] uniquePapers with score > 0:', Array.from(uniquePapers));
          
          const totalPapers = 18; // Update as needed
          const completedPapers = uniquePapers.size;
          const progressPercent = Math.min((completedPapers / totalPapers) * 100, 100);
          console.log('🔵 [ProgressCircle] Setting progress:', Math.round(progressPercent));
          
          setProgress(Math.round(progressPercent));
        } catch (error) {
          console.error('❌ [ProgressCircle] Error loading progress:', error);
        }
      };
      fetchProgress();
    }
  }, [user]);
  
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="bg-[#1a0030] p-6 rounded-xl border border-[#5c4d7d] shadow-lg h-48 flex flex-col items-center justify-center">
      <div className="relative w-24 h-24 mb-4">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#374151"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#8b5cf6"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{progress}%</span>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">Progress</h3>
      <div className="flex items-center space-x-4 text-xs">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-1"></div>
          <span className="text-gray-400">Completed</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-gray-600 rounded-full mr-1"></div>
          <span className="text-gray-400">Remaining</span>
        </div>
      </div>
    </div>
  );
}

// Calendar Widget Component - Updated with navigation and proper date highlighting
function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const today = new Date();
  const examDate = new Date('2025-10-13');
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  
  const days = [];
  
  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };
  
  const isToday = (day) => {
    return day === today.getDate() && 
           currentMonth === today.getMonth() && 
           currentYear === today.getFullYear();
  };
  
  const isExamDay = (day) => {
    return day === examDate.getDate() && 
           currentMonth === examDate.getMonth() && 
           currentYear === examDate.getFullYear();
  };
  
  return (
    <div className="bg-[#1a0030] p-6 rounded-xl border border-[#5c4d7d] shadow-lg h-[28rem]"> {/* Added fixed height */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white">{monthNames[currentMonth]} {currentYear}</h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => navigateMonth('prev')}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded"
          >
            &lt;
          </button>
          <button 
            onClick={() => navigateMonth('next')}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded"
          >
            &gt;
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
          <div key={day} className="text-center text-xs text-gray-400 py-2">{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={index} className="h-8"></div>;
          }
          
          const todayHighlight = isToday(day);
          const examHighlight = isExamDay(day);
          
          return (
            <div key={day} className="relative h-8 flex items-center justify-center">
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                ${todayHighlight ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 
                  examHighlight ? 'bg-red-600 text-white ring-2 ring-red-400' :
                  'text-gray-400 hover:text-white hover:bg-purple-800/30'}
              `}>
                {day}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-xs text-gray-400 space-y-1">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-purple-600 rounded-full mr-2"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
          <span>Exam Day (Oct 13, 2025)</span>
        </div>
      </div>
    </div>
  );
}

function GradeBoundariesGraph() {
  const { user } = useUser();
  const [userScores, setUserScores] = useState({}); // Changed from [] to {}
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Paper structure with all papers from Specimen to 2023
  const papers = [
    { name: 'Spec Paper 1', key: 'specimen_p1', type: 'paper1' },
    { name: 'Spec Paper 2', key: 'specimen_p2', type: 'paper2' },
    { name: 'Practice Paper 1', key: 'practice_p1', type: 'paper1' },
    { name: 'Practice Paper 2', key: 'practice_p2', type: 'paper2' },
    { name: '2017 Paper 1', key: '2017_p1', type: 'paper1' },
    { name: '2017 Paper 2', key: '2017_p2', type: 'paper2' },
    { name: '2018 Paper 1', key: '2018_p1', type: 'paper1' },
    { name: '2018 Paper 2', key: '2018_p2', type: 'paper2' },
    { name: '2019 Paper 1', key: '2019_p1', type: 'paper1' },
    { name: '2019 Paper 2', key: '2019_p2', type: 'paper2' },
    { name: '2020 Paper 1', key: '2020_p1', type: 'paper1' },
    { name: '2020 Paper 2', key: '2020_p2', type: 'paper2' },
    { name: '2021 Paper 1', key: '2021_p1', type: 'paper1' },
    { name: '2021 Paper 2', key: '2021_p2', type: 'paper2' },
    { name: '2022 Paper 1', key: '2022_p1', type: 'paper1' },
    { name: '2022 Paper 2', key: '2022_p2', type: 'paper2' },
    { name: '2023 Paper 1', key: '2023_p1', type: 'paper1' },
    { name: '2023 Paper 2', key: '2023_p2', type: 'paper2' }
  ];
  
  // Grade 7.0 boundaries
  const grade7Boundaries = {
    specimen_p1: 13, specimen_p2: 12,
    practice_p1: 14, practice_p2: 13,
    '2017_p1': 14, '2017_p2': 14,
    '2018_p1': 14, '2018_p2': 12,
    '2019_p1': 14, '2019_p2': 15,
    '2020_p1': 15, '2020_p2': 14,
    '2021_p1': 14, '2021_p2': 15,
    '2022_p1': 13, '2022_p2': 15,
    '2023_p1': 14, '2023_p2': 13
  };
  
  // Grade 9.0 boundaries
  const grade9Boundaries = {
    specimen_p1: 18, specimen_p2: 19,
    practice_p1: 17, practice_p2: 20,
    '2017_p1': 19, '2017_p2': 20,
    '2018_p1': 19, '2018_p2': 18,
    '2019_p1': 19, '2019_p2': 20,
    '2020_p1': 20, '2020_p2': 20,
    '2021_p1': 19, '2021_p2': 20,
    '2022_p1': 17, '2022_p2': 19,
    '2023_p1': 20, '2023_p2': 20
  };
  
  useEffect(() => {
    // Start animation after component mounts
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Add useEffect to load user scores from Supabase
  useEffect(() => {
    loadUserScores();
  }, [user]);
  
  const loadUserScores = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      // Changed from getUserExamHistory to getUserExamResults to get only highest scores
      const { getUserExamResults } = await import('../../lib/supabase');
      const examHistory = await getUserExamResults(user.id);
      
      if (examHistory && examHistory.length > 0) {
        // Create mapping from paper_name to paper key
        const paperNameToKey = {
          'Specimen Paper 1': 'specimen_p1',
          'Specimen Paper 2': 'specimen_p2',
          'Practice Paper 1': 'practice_p1',
          'Practice Paper 2': 'practice_p2',
          '2017 Paper 1': '2017_p1',
          '2017 Paper 2': '2017_p2',
          '2018 Paper 1': '2018_p1',
          '2018 Paper 2': '2018_p2',
          '2019 Paper 1': '2019_p1',
          '2019 Paper 2': '2019_p2',
          '2020 Paper 1': '2020_p1',
          '2020 Paper 2': '2020_p2',
          '2021 Paper 1': '2021_p1',
          '2021 Paper 2': '2021_p2',
          '2022 Paper 1': '2022_p1',
          '2022 Paper 2': '2022_p2',
          '2023 Paper 1': '2023_p1',
          '2023 Paper 2': '2023_p2'
        };
        
        // Map exam results to paper positions - now using highest scores only
        const scoreMap = {};
        examHistory.forEach(exam => {
          if (exam.paper_name && paperNameToKey[exam.paper_name]) {
            const paperKey = paperNameToKey[exam.paper_name];
            scoreMap[paperKey] = exam.score;
          }
        });
        setUserScores(scoreMap);
      } else {
        // No exam history found
        setUserScores({});
      }
    } catch (error) {
      console.error('Error loading user scores:', error);
      setUserScores({});
    } finally {
      setLoading(false);
    }
  };
  
  const maxScore = 21;
  const chartWidth = 10 + papers.length * 50; // Width for horizontal scrolling
  const chartHeight = 320; // Increased significantly for taller chart
  
  return (
    <div className="bg-[#1a0030] p-4 rounded-xl border border-[#5c4d7d] shadow-lg h-[28rem]"> {/* Matched Calendar height */}
      <h3 className="text-base font-semibold text-white mb-2">Grade Boundaries</h3> {/* Reduced scale */}
      
      {/* Chart area with horizontal scroll */}
      <div className="relative h-80 mb-2"> {/* Increased to h-80 (320px) for much taller chart */}
        {/* Y-axis labels - fixed position */}
        <div className="absolute left-0 top-0 flex flex-col justify-between text-xs text-gray-400 pr-2 z-10" style={{ height: `${chartHeight}px` }}>
          <span>20</span>
          <span>16</span>
          <span>12</span>
          <span>8</span>
          <span>4</span>
          <span>0</span>
        </div>
        
        {/* Scrollable chart container */}
        <div className="ml-8 h-full overflow-x-auto overflow-y-hidden" style={{ height: `${chartHeight }px` }}> {/* Added overflow-y-hidden */}
          <div className="relative" style={{ width: `${chartWidth}px`, height: `${chartHeight}px` }}>
            {/* Grid lines */}
            <div className="absolute inset-0">
              {[0, 20, 40, 60, 80, 100].map(percent => (
                <div 
                  key={percent} 
                  className="absolute w-full border-t border-gray-700/30" 
                  style={{ bottom: `${percent}%` }}
                ></div>
              ))}
            </div>
            
            {/* SVG for lines and points */}
            <svg className="absolute inset-0 w-full h-full">
              {/* Grade 7.0 red line with animation */}
              <polyline
                points={papers.map((paper, index) => {
                  const x = (index + 0.5) * 50;
                  const y = chartHeight - (grade7Boundaries[paper.key] / maxScore) * chartHeight;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5" // Slightly reduced from 3
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={animationComplete ? "0" : "1000"}
                strokeDashoffset={animationComplete ? "0" : "1000"}
                style={{
                  transition: 'stroke-dashoffset 2s ease-in-out',
                  transitionDelay: '0.5s'
                }}
              />
              
              {/* Grade 9.0 green line with animation */}
              <polyline
                points={papers.map((paper, index) => {
                  const x = (index + 0.5) * 50;
                  const y = chartHeight - (grade9Boundaries[paper.key] / maxScore) * chartHeight;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5" // Slightly reduced from 3
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={animationComplete ? "0" : "1000"}
                strokeDashoffset={animationComplete ? "0" : "1000"}
                style={{
                  transition: 'stroke-dashoffset 2s ease-in-out',
                  transitionDelay: '1s'
                }}
              />
              
              {/* Grade 7.0 points with staggered animation */}
              {papers.map((paper, index) => {
                const x = (index + 0.5) * 50;
                const y = chartHeight - (grade7Boundaries[paper.key] / maxScore) * chartHeight;
                return (
                  <circle
                    key={`grade7-${index}`}
                    cx={x}
                    cy={y}
                    r={hoveredPoint === `grade7-${index}` ? "5" : "3"} // Slightly reduced sizes
                    fill="#ef4444"
                    stroke="#1a0030"
                    strokeWidth="2"
                    style={{
                      opacity: animationComplete ? 1 : 0,
                      transition: `all 0.3s ease-in-out`,
                      transitionDelay: `${0.5 + index * 0.1}s`,
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredPoint(`grade7-${index}`)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
              
              {/* Grade 9.0 points with staggered animation */}
              {papers.map((paper, index) => {
                const x = (index + 0.5) * 50;
                const y = chartHeight - (grade9Boundaries[paper.key] / maxScore) * chartHeight;
                return (
                  <circle
                    key={`grade9-${index}`}
                    cx={x}
                    cy={y}
                    r={hoveredPoint === `grade9-${index}` ? "5" : "3"} // Slightly reduced sizes
                    fill="#10b981"
                    stroke="#1a0030"
                    strokeWidth="2"
                    style={{
                      opacity: animationComplete ? 1 : 0,
                      transition: `all 0.3s ease-in-out`,
                      transitionDelay: `${1 + index * 0.1}s`,
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredPoint(`grade9-${index}`)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </svg>
            
            {/* Hover tooltip */}
            {hoveredPoint && (
              <div 
                className="absolute bg-black/80 text-white px-2 py-1 rounded text-sm pointer-events-none z-20"
                style={{
                  left: `${(parseInt(hoveredPoint.split('-')[1]) + 0.5) * 50 - 20}px`,
                  top: hoveredPoint.includes('grade7') 
                    ? `${chartHeight - (grade7Boundaries[papers[parseInt(hoveredPoint.split('-')[1])].key] / maxScore) * chartHeight - 30}px`
                    : `${chartHeight - (grade9Boundaries[papers[parseInt(hoveredPoint.split('-')[1])].key] / maxScore) * chartHeight - 30}px`
                }}
              >
                {hoveredPoint.includes('grade7') 
                  ? grade7Boundaries[papers[parseInt(hoveredPoint.split('-')[1])].key]
                  : grade9Boundaries[papers[parseInt(hoveredPoint.split('-')[1])].key]
                }
              </div>
            )}
            
            {/* User scores (bars) - Fixed positioning and visibility */}
            <div className="absolute inset-0">
              {papers.map((paper, index) => {
                const score = userScores[paper.key] || 0;
                const height = (score / maxScore) * chartHeight; // Use pixel height instead of percentage
                const isPaper1 = paper.type === 'paper1';
                const x = index * 50 + 21; // Center the bar within the 50px width
                
                return score > 0 ? (
                  <div
                    key={index}
                    className={`absolute transition-all duration-300 ${
                      isPaper1 ? 'bg-blue-500 hover:bg-blue-400' : 'bg-purple-500 hover:bg-purple-400'
                    }`}
                    style={{
                      left: `${x}px`,
                      bottom: '0px',
                      width: '8px',
                      height: `${height}px`,
                      opacity: animationComplete ? 1 : 0,
                      transition: `all 0.5s ease-in-out`,
                      transitionDelay: `${2 + index * 0.05}s`,
                      borderRadius: '2px 2px 0 0',
                      minHeight: '3px' // Ensure minimum visibility
                    }}
                    title={`${paper.name}: ${score}/20`}
                  />
                ) : null;
              })}
            </div>
            
            {/* X-axis labels inside scrollable area */}
            <div className="absolute bottom-0 left-0 w-full" style={{ transform: 'translateY(40%)' }}> {/* Changed from translateY(100%) to translateY(90%) to move up by 10px */}
              <div className="flex pt-1"> {/* Reduced padding from pt-2 to pt-1 */}
                {papers.map((paper, index) => {
                  const isYear = paper.name.match(/\d{4}/);
                  const paperNum = paper.name.includes('Paper 1') ? 'P1' : 'P2';
                  const yearOrType = isYear ? paper.name.match(/\d{4}/)[0] : paper.name.split(' ')[0];
                  
                  return (
                    <span 
                      key={index} 
                      className="transform -rotate-45 origin-bottom-left text-xs text-gray-400" // Kept text-xs
                      style={{ 
                        width: '50px', 
                        textAlign: 'center',
                        opacity: animationComplete ? 1 : 0,
                        transition: `opacity 0.3s ease-in-out`,
                        transitionDelay: `${2.5 + index * 0.02}s`
                      }}
                    >
                      {yearOrType} {paperNum}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend - properly contained within widget */}
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-xs px-1"> {/* Further reduced gaps and padding */}
        <div className="flex items-center">
          <div className="w-2.5 h-1.5 bg-blue-500 mr-1 rounded"></div> {/* Further reduced sizes */}
          <span className="text-gray-400">Your Score (Paper 1)</span>
        </div>
        <div className="flex items-center">
          <div className="w-2.5 h-1.5 bg-purple-500 mr-1 rounded"></div>
          <span className="text-gray-400">Your Score (Paper 2)</span>
        </div>
        <div className="flex items-center">
          <div className="w-2.5 h-0.5 bg-red-500 mr-1"></div>
          <span className="text-gray-400">Grade 7.0</span>
        </div>
        <div className="flex items-center">
          <div className="w-2.5 h-0.5 bg-green-500 mr-1"></div>
          <span className="text-gray-400">Grade 9.0</span>
        </div>
      </div>
    </div>
  );
}


// Main Dashboard Layout
export default function Dashboard({ onReady }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
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

  // Redirect if not logged in
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/login');
    }
  }, [user, isLoaded, router]);
  
  if (!isLoaded) {
    return <div className="min-h-screen bg-gradient-to-br from-[#1a002d] to-[#33004d] flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>;
  }
  
  if (!user) {
    return null;
  }
  
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a002d] to-[#33004d] flex">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} currentPage="dashboard" />
      <main className={`flex-1 transition-all duration-300 ${
        sidebarCollapsed 
          ? 'ml-12 sm:ml-14 md:ml-16' 
          : 'ml-48 sm:ml-56 md:ml-56 lg:ml-64 xl:ml-72'
      } p-4 sm:p-6 md:p-6 lg:p-8 xl:p-10`}>
        <Header />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-1">
          <div className="sm:col-span-1"><ReadyToTestCard onReady={onReady} /></div>
          <div className="sm:col-span-1"><DaysLeftCounter /></div>
          <div className="sm:col-span-1 xl:col-span-1"><AverageScoreCard /></div>
          <div className="sm:col-span-1 xl:col-span-1"><ProgressCircle /></div>
          <div className="sm:col-span-2 xl:col-span-2"><CalendarWidget /></div>
          <div className="sm:col-span-2 xl:col-span-2"><GradeBoundariesGraph /></div>
        </div>
      </main>
    </div>
  );
}

