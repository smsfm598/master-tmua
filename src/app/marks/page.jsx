"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { getUserExamResults } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';

export default function MarksPage() {
  const [examResults, setExamResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    const loadExamResults = async () => {
      try {
        const results = await getUserExamResults(user.id);
        let processedResults = Array.isArray(results) ? results : [];
        
        // Filter out attempts with 0% scores
        processedResults = processedResults.filter(result => {
          const percentage = typeof result.percentage === 'number'
            ? result.percentage
            : (result.total_questions > 0 && !isNaN(result.score) && !isNaN(result.total_questions))
              ? Math.round((result.score / result.total_questions) * 100)
              : 0;
          return percentage > 0;
        });
        
        // Sort by newest to oldest (created_at descending)
        processedResults.sort((a, b) => {
          const dateA = new Date(a.created_at || a.date);
          const dateB = new Date(b.created_at || b.date);
          return dateB - dateA; // Newest first
        });
        
        setExamResults(processedResults);
      } catch (error) {
        console.error('Error loading exam results from Supabase:', error);
        setExamResults([]);
      } finally {
        setLoading(false);
      }
    };

    loadExamResults();
  }, [user, isLoaded, router]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a002d] to-[#33004d] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a002d] to-[#33004d] flex">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} currentPage="marks" />
      
      <main className={`flex-1 transition-all duration-300 ${
        collapsed 
          ? 'ml-12 sm:ml-14 md:ml-16' 
          : 'ml-48 sm:ml-56 md:ml-64 lg:ml-72'
      } p-3 sm:p-4 md:p-6 lg:p-10`}>
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">Your Exam Marks</h1>
          <p className="text-gray-300 text-xs sm:text-sm md:text-base">View all your test results (excluding 0% scores)</p>
        </div>

        <div className="bg-[#1a0030] rounded-xl border border-[#5c4d7d] shadow-lg p-3 sm:p-4 md:p-6">
          {examResults.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-400">
              <p className="text-sm sm:text-base">You haven't completed any exams with a score above 0% yet.</p>
              <button 
                onClick={() => router.push('/papers')}
                className="mt-4 px-4 py-2 bg-[#8e44ad] rounded-lg text-white hover:bg-[#9b59b6] transition-all duration-300 text-sm sm:text-base"
              >
                Take an Exam
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {examResults.map((result, index) => {
                  const date = new Date(result.created_at || result.date);
                  const formattedDate = date.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit'
                  });
                  const percentage = typeof result.percentage === 'number'
                    ? result.percentage
                    : (result.total_questions > 0 && !isNaN(result.score) && !isNaN(result.total_questions))
                      ? Math.round((result.score / result.total_questions) * 100)
                      : 0; // Handle division by zero and NaN values

                  return (
                    <div key={index} className="bg-[#2a0045] rounded-lg p-4 border border-[#5c4d7d]/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-white font-semibold text-sm">{result.paper_name || 'TMUA Practice'}</h3>
                          <p className="text-gray-400 text-xs">{formattedDate}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          percentage >= 90 ? 'bg-green-600' :
                          percentage >= 80 ? 'bg-green-500' :
                          percentage >= 70 ? 'bg-yellow-500' :
                          percentage >= 60 ? 'bg-yellow-400' :
                          percentage >= 50 ? 'bg-orange-500' :
                          percentage >= 40 ? 'bg-orange-400' :
                          'bg-red-500'
                        }`}>
                          {percentage}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">Score:</span>
                        <span className="text-white font-medium text-sm">{result.score}/{result.total_questions}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-[#5c4d7d]">
                      <th className="py-3 px-2 md:px-4 text-left text-sm md:text-base font-medium">Test Date</th>
                      <th className="py-3 px-2 md:px-4 text-left text-sm md:text-base font-medium">Paper</th>
                      <th className="py-3 px-2 md:px-4 text-left text-sm md:text-base font-medium">Score</th>
                      <th className="py-3 px-2 md:px-4 text-left text-sm md:text-base font-medium">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.map((result, index) => {
                      const date = new Date(result.created_at || result.date);
                      const formattedDate = date.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: window.innerWidth < 768 ? '2-digit' : 'numeric'
                      });
                      const percentage = typeof result.percentage === 'number'
                        ? result.percentage
                        : Math.round((result.score / result.total_questions) * 100);

                      return (
                        <tr key={index} className="border-b border-[#5c4d7d] hover:bg-[#2a0045] transition-colors">
                          <td className="py-3 px-2 md:px-4 text-xs md:text-sm">{formattedDate}</td>
                          <td className="py-3 px-2 md:px-4 text-xs md:text-sm">
                            <span className="truncate block max-w-[120px] sm:max-w-none">
                              {result.paper_name || 'TMUA Practice'}
                            </span>
                          </td>
                          <td className="py-3 px-2 md:px-4 text-xs md:text-sm font-mono">{result.score}/{result.total_questions}</td>
                          <td className="py-3 px-2 md:px-4 text-xs md:text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              percentage >= 90 ? 'bg-green-600' :
                              percentage >= 80 ? 'bg-green-500' :
                              percentage >= 70 ? 'bg-yellow-500' :
                              percentage >= 60 ? 'bg-yellow-400' :
                              percentage >= 50 ? 'bg-orange-500' :
                              percentage >= 40 ? 'bg-orange-400' :
                              'bg-red-500'
                            }`}>
                              {percentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}