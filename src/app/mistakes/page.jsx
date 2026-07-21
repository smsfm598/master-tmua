"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";

function formatShortDate(value) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function MistakesPage() {
  const [mistakePapers, setMistakePapers] = useState([]);
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
      router.push("/login");
      return;
    }

    const loadMistakePapers = async () => {
      try {
        const response = await fetch("/api/mistake-papers", {
          method: "GET",
          cache: "no-store",
        });

        const payload = await response.json().catch(() => ({}));

        if (response.ok) {
          setMistakePapers(
            Array.isArray(payload.mistakePapers)
              ? payload.mistakePapers
              : [],
          );
        } else {
          console.error(
            "Failed to load mistake papers:",
            payload.error || "Unknown error",
          );
          setMistakePapers([]);
        }
      } catch (error) {
        console.error("Error loading mistake papers:", error);
        setMistakePapers([]);
      } finally {
        setLoading(false);
      }
    };

    loadMistakePapers();
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
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} currentPage="mistakes" />
      
      <main className={`flex-1 transition-all duration-300 ${
        collapsed 
          ? 'ml-12 sm:ml-14 md:ml-16' 
          : 'ml-48 sm:ml-56 md:ml-64 lg:ml-72'
      } p-3 sm:p-4 md:p-6 lg:p-10`}>
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">Your Mistake Papers</h1>
          <p className="text-gray-300 text-xs sm:text-sm md:text-base">
            Review and practice the questions you got wrong in previous exams.
          </p>
        </div>

        <div className="bg-[#1a0030] rounded-xl border border-[#5c4d7d] shadow-lg p-4 sm:p-6">
          {mistakePapers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm sm:text-base">No mistake papers are available yet.</p>
              <p className="text-xs sm:text-sm mt-2">
                Complete a paper with a score above 0 and at least one mistake to generate one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {mistakePapers.map((paper) => (
                <div
                  key={paper.id}
                  className="group rounded-xl border p-4 sm:p-6 transition-all duration-300 cursor-pointer bg-gradient-to-br from-[#1a0030] to-[#2a0045] border-[#5c4d7d] hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105"
                  onClick={() => router.push(`/mistake-papers/${paper.id}`)}
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-transform duration-300 bg-gradient-to-br from-orange-500 to-red-500 group-hover:scale-110">
                      <span className="text-white font-bold text-sm sm:text-lg">📈</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Test Date</div>
                      <div className="text-xs sm:text-sm font-semibold text-white">{formatShortDate(paper.createdAt)}</div>
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-lg font-semibold mb-2 text-white group-hover:text-purple-300 transition-colors duration-300">
                    {paper.title}
                  </h3>

                  <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                    Multiple choice
                  </p>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-yellow-300">{paper.questionCount} QUESTIONS</span>
                    <div className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300 bg-[#8e44ad] text-white group-hover:bg-[#9b59b6]">
                      Start
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
