"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { getAllExamResults } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";

function formatShortDate(value) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatLongDate(value) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function MarksPage() {
  const [examResults, setExamResults] = useState([]);
  const [mistakePapers, setMistakePapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedResults, setExpandedResults] = useState(new Set());
  const [activeTab, setActiveTab] = useState("results");
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

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
    const tabFromQuery = searchParams.get("tab");
    if (tabFromQuery === "mistakes") {
      setActiveTab("mistakes");
    } else {
      setActiveTab("results");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const loadPageData = async () => {
      try {
        const [resultsOutcome, mistakePapersOutcome] = await Promise.allSettled([
          getAllExamResults(user.id),
          fetch("/api/mistake-papers", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        const results =
          resultsOutcome.status === "fulfilled" && Array.isArray(resultsOutcome.value)
            ? resultsOutcome.value
            : [];

        let processedResults = results;

        processedResults = processedResults.filter((result) => {
          const score = parseInt(result.score, 10) || 0;
          const totalQuestions = parseInt(result.total_questions, 10) || 0;

          if (totalQuestions > 0 && !Number.isNaN(score)) {
            const percentage = Math.round((score / totalQuestions) * 100);
            return percentage > 0;
          }

          return true;
        });

        processedResults.sort((a, b) => {
          const dateA = new Date(a.created_at || a.date);
          const dateB = new Date(b.created_at || b.date);
          return dateB - dateA;
        });

        setExamResults(processedResults);

        if (mistakePapersOutcome.status === "fulfilled") {
          const mistakePaperResponse = mistakePapersOutcome.value;
          const mistakePaperPayload = await mistakePaperResponse.json().catch(() => ({}));

          if (mistakePaperResponse.ok) {
            setMistakePapers(
              Array.isArray(mistakePaperPayload.mistakePapers)
                ? mistakePaperPayload.mistakePapers
                : [],
            );
          } else {
            console.error(
              "Failed to load mistake papers:",
              mistakePaperPayload.error || "Unknown error",
            );
            setMistakePapers([]);
          }
        } else {
          console.error("Failed to load mistake papers:", mistakePapersOutcome.reason);
          setMistakePapers([]);
        }
      } catch (error) {
        console.error("Error loading marks page data:", error);
        setMistakePapers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
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

  const toggleResultExpansion = (index) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  const WrongAnswersDisplay = ({ wrongAnswers, isExpanded }) => {
    if (!wrongAnswers || wrongAnswers.length === 0) {
      return (
        <div className="mt-2 text-green-400 text-xs">
          🎉 Perfect score! No wrong answers.
        </div>
      );
    }

    if (!isExpanded) {
          const wrongQuestionNumbers = wrongAnswers.map((wa) => wa.questionNumber).join(", ");
      return (
        <div className="mt-2 text-red-400 text-xs">
          Wrong questions: {wrongQuestionNumbers}
        </div>
      );
    }

    return (
      <div className="mt-3 space-y-2">
        <h4 className="text-red-400 text-sm font-semibold">Wrong Answers Details:</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {wrongAnswers.map((wa, idx) => (
            <div key={idx} className="bg-[#1a0030] p-2 rounded text-xs border border-red-500/30">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">Q{wa.questionNumber}:</span>
                <div className="flex gap-2">
                  <span className="text-red-400">You: {wa.userAnswer || "No answer"}</span>
                  <span className="text-green-400">Correct: {wa.correctAnswer}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderExamResults = () => (
    <div className="bg-[#1a0030] rounded-xl border border-[#5c4d7d] shadow-lg p-3 sm:p-4 md:p-6">
      {examResults.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-gray-400">
          <p className="text-sm sm:text-base">You haven't completed any exams with a score above 0% yet.</p>
          <button
            onClick={() => router.push("/papers")}
            className="mt-4 px-4 py-2 bg-[#8e44ad] rounded-lg text-white hover:bg-[#9b59b6] transition-all duration-300 text-sm sm:text-base"
          >
            Take an Exam
          </button>
        </div>
      ) : (
        <>
          <div className="block sm:hidden space-y-3">
            {examResults.map((result, index) => {
              const percentage = typeof result.percentage === "number"
                ? result.percentage
                : (result.total_questions > 0 && !isNaN(result.score) && !isNaN(result.total_questions))
                  ? Math.round((result.score / result.total_questions) * 100)
                  : 0;

              const isExpanded = expandedResults.has(index);

              return (
                <div key={index} className="bg-[#2a0045] rounded-lg p-4 border border-[#5c4d7d]/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-white font-semibold text-sm">
                        {result.exam_type === "Mistake" ? "Mistake Paper: " : ""}
                        {result.paper_name || "TMUA Practice"}
                      </h3>
                      <p className="text-gray-400 text-xs">{formatShortDate(result.created_at || result.date)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      percentage >= 90 ? "bg-green-600" :
                      percentage >= 80 ? "bg-green-500" :
                      percentage >= 70 ? "bg-yellow-500" :
                      percentage >= 60 ? "bg-yellow-400" :
                      percentage >= 50 ? "bg-orange-500" :
                      percentage >= 40 ? "bg-orange-400" :
                      "bg-red-500"
                    }`}>
                      {percentage}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">Score:</span>
                    <span className="text-white font-medium text-sm">{result.score}/{result.total_questions}</span>
                  </div>

                  <WrongAnswersDisplay
                    wrongAnswers={result.wrong_answers}
                    isExpanded={isExpanded}
                  />

                  <button
                    onClick={() => toggleResultExpansion(index)}
                    className="mt-2 text-[#8e44ad] hover:text-[#9b59b6] text-xs underline transition-colors"
                  >
                    {isExpanded ? "Hide Details" : "Show Wrong Answer Details"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-[#5c4d7d]">
                  <th className="py-3 px-2 md:px-4 text-left text-sm md:text-base font-medium">Test Date</th>
                  <th className="py-3 px-2 md:px-4 text-left text-sm md:text-base font-medium">Paper</th>
                  <th className="py-3 px-2 md:px-4 text-left text-sm md:text-base font-medium">Score</th>
                  <th className="py-3 px-2 md:px-4 text-left text-sm md:text-base font-medium">Percentage</th>
                  <th className="py-3 px-2 md:px-4 text-left text-sm md:text-base font-medium">Wrong Answers</th>
                </tr>
              </thead>
              <tbody>
                {examResults.map((result, index) => {
                  const percentage = typeof result.percentage === "number"
                    ? result.percentage
                    : Math.round((result.score / result.total_questions) * 100);

                  const isExpanded = expandedResults.has(index);

                  return (
                    <React.Fragment key={index}>
                      <tr className="border-b border-[#5c4d7d] hover:bg-[#2a0045] transition-colors">
                        <td className="py-3 px-2 md:px-4 text-xs md:text-sm">{formatLongDate(result.created_at || result.date)}</td>
                        <td className="py-3 px-2 md:px-4 text-xs md:text-sm">
                          <span className="truncate block max-w-[120px] sm:max-w-none">
                            {result.exam_type === "Mistake" ? (
                              <span className="text-yellow-400 font-semibold mr-1">Mistake Paper:</span>
                            ) : null}
                            {result.paper_name || "TMUA Practice"}
                          </span>
                        </td>
                        <td className="py-3 px-2 md:px-4 text-xs md:text-sm font-mono">{result.score}/{result.total_questions}</td>
                        <td className="py-3 px-2 md:px-4 text-xs md:text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            percentage >= 90 ? "bg-green-600" :
                            percentage >= 80 ? "bg-green-500" :
                            percentage >= 70 ? "bg-yellow-500" :
                            percentage >= 60 ? "bg-yellow-400" :
                            percentage >= 50 ? "bg-orange-500" :
                            percentage >= 40 ? "bg-orange-400" :
                            "bg-red-500"
                          }`}>
                            {percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-2 md:px-4 text-xs md:text-sm">
                          <button
                            onClick={() => toggleResultExpansion(index)}
                            className="text-[#8e44ad] hover:text-[#9b59b6] underline transition-colors"
                          >
                            {result.wrong_answers && result.wrong_answers.length > 0
                              ? `${result.wrong_answers.length} wrong ${isExpanded ? "▼" : "▶"}`
                              : "Perfect! 🎉"
                            }
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="5" className="py-2 px-2 md:px-4 bg-[#2a0045]">
                            <WrongAnswersDisplay
                              wrongAnswers={result.wrong_answers}
                              isExpanded={true}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  const renderMistakePapers = () => (
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
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-transform duration-300 bg-gradient-to-br from-purple-500 to-pink-500 group-hover:scale-110">
                  <span className="text-white font-bold text-sm sm:text-lg">✎</span>
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
                {paper.questionCount} questions • Multiple choice
              </p>

              <div className="flex justify-between items-center">
                <span className="text-xs text-yellow-300">No duration</span>
                <div className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300 bg-[#8e44ad] text-white group-hover:bg-[#9b59b6]">
                  Start
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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
          <p className="text-gray-300 text-xs sm:text-sm md:text-base">
            View your results and generated mistake papers.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-4 sm:mb-6">
          <button
            onClick={() => {
              setActiveTab("results");
              router.push("/marks");
            }}
            className={`px-4 py-2 rounded-lg text-sm sm:text-base transition-all duration-300 ${
              activeTab === "results"
                ? "bg-[#8e44ad] text-white shadow-lg"
                : "bg-[#1a0030] text-gray-300 border border-[#5c4d7d] hover:bg-[#2a0045]"
            }`}
          >
            Marks
          </button>
          <button
            onClick={() => {
              setActiveTab("mistakes");
              router.push("/marks?tab=mistakes");
            }}
            className={`px-4 py-2 rounded-lg text-sm sm:text-base transition-all duration-300 ${
              activeTab === "mistakes"
                ? "bg-[#8e44ad] text-white shadow-lg"
                : "bg-[#1a0030] text-gray-300 border border-[#5c4d7d] hover:bg-[#2a0045]"
            }`}
          >
            Mistake Papers
          </button>
        </div>

        {activeTab === "mistakes" ? renderMistakePapers() : renderExamResults()}
      </main>
    </div>
  );
}
