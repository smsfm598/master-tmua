"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { checkUserEntitlements, getAllExamResults } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import UpgradeModal from "../../components/UpgradeModal";

const TMUA_SCORE_BY_PERCENT = {
  0: 0.0,
  1: 1.0,
  2: 1.0,
  3: 1.0,
  4: 1.0,
  5: 1.0,
  6: 1.0,
  7: 1.0,
  8: 1.0,
  9: 1.0,
  10: 1.0,
  11: 1.0,
  12: 1.0,
  13: 1.0,
  14: 1.1,
  15: 1.1,
  16: 1.2,
  17: 1.2,
  18: 1.3,
  19: 1.5,
  20: 1.7,
  21: 1.9,
  22: 2.0,
  23: 2.2,
  24: 2.3,
  25: 2.5,
  26: 2.6,
  27: 2.7,
  28: 2.9,
  29: 3.0,
  30: 3.2,
  31: 3.3,
  32: 3.4,
  33: 3.6,
  34: 3.7,
  35: 3.8,
  36: 3.9,
  37: 4.1,
  38: 4.2,
  39: 4.3,
  40: 4.4,
  41: 4.5,
  42: 4.7,
  43: 4.8,
  44: 4.9,
  45: 5.0,
  46: 5.1,
  47: 5.2,
  48: 5.4,
  49: 5.5,
  50: 5.6,
  51: 5.7,
  52: 5.8,
  53: 5.9,
  54: 6.0,
  55: 6.1,
  56: 6.2,
  57: 6.3,
  58: 6.4,
  59: 6.5,
  60: 6.6,
  61: 6.6,
  62: 6.7,
  63: 6.8,
  64: 6.8,
  65: 6.9,
  66: 7.0,
  67: 7.0,
  68: 7.1,
  69: 7.2,
  70: 7.2,
  71: 7.3,
  72: 7.4,
  73: 7.4,
  74: 7.5,
  75: 7.6,
  76: 7.7,
  77: 7.8,
  78: 7.9,
  79: 7.9,
  80: 8.0,
  81: 8.0,
  82: 8.1,
  83: 8.1,
  84: 8.2,
  85: 8.2,
  86: 8.3,
  87: 8.3,
  88: 8.4,
  89: 8.5,
  90: 8.5,
  91: 8.6,
  92: 8.7,
  93: 8.8,
  94: 8.9,
  95: 9.0,
  96: 9.0,
  97: 9.0,
  98: 9.0,
  99: 9.0,
  100: 9.0,
};

function formatMappedTmuaScore(percentage) {
  const normalizedPercent = Math.max(0, Math.min(100, Math.round(percentage || 0)));
  const tmuaScore = TMUA_SCORE_BY_PERCENT[normalizedPercent] ?? 0.0;
  return tmuaScore.toFixed(1);
}

function formatMarksMetric(percentage, examType) {
  if (examType === "Mistake") {
    return `${percentage}%`;
  }

  return formatMappedTmuaScore(percentage);
}

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
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedResults, setExpandedResults] = useState(new Set());
  const [userEntitlements, setUserEntitlements] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, paperName: "" });
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

    const loadPageData = async () => {
      try {
        const [results, entitlements] = await Promise.all([
          getAllExamResults(user.id),
          checkUserEntitlements(),
        ]);

        setUserEntitlements(entitlements);
        
        let processedResults = Array.isArray(results) ? results : [];

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
      } catch (error) {
        console.error("Error loading marks page data:", error);
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
              const displayMetric = formatMarksMetric(percentage, result.exam_type);

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
                      {displayMetric}
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
                  <th className="py-3 px-2 md:px-4 text-left text-sm md:text-base font-medium">Grade</th>
                  <th className="py-3 px-2 md:px-4 text-left text-sm md:text-base font-medium">Wrong Answers</th>
                </tr>
              </thead>
              <tbody>
                {examResults.map((result, index) => {
                  const percentage = typeof result.percentage === "number"
                    ? result.percentage
                    : Math.round((result.score / result.total_questions) * 100);
                  const displayMetric = formatMarksMetric(percentage, result.exam_type);

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
                            {displayMetric}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a002d] to-[#33004d] flex">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} currentPage="marks" />
      
      <main className={`flex-1 transition-all duration-300 ${
        collapsed 
          ? 'ml-12 sm:ml-14 md:ml-16' 
          : 'ml-48 sm:ml-56 md:ml-64 lg:ml-72'
      } p-3 sm:p-4 md:p-6 lg:p-10`}>
        <div className="mb-4 sm:mb-6 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">Your Exam Marks</h1>
            <p className="text-gray-300 text-xs sm:text-sm md:text-base">
              View your results from all completed papers.
            </p>
          </div>

          {userEntitlements && !userEntitlements?.hasFullAccess ? (
            <button
              onClick={() =>
                setUpgradeModal({ isOpen: true, paperName: "All Premium Papers" })
              }
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-sm sm:text-base bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-[#1a0030] shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:from-yellow-300 hover:via-amber-200 hover:to-yellow-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] transition-all duration-300"
            >
              Go Premium
            </button>
          ) : userEntitlements?.hasFullAccess ? (
            <button
              onClick={() => {}}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-sm sm:text-base bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-[#1a0030] shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:from-yellow-300 hover:via-amber-200 hover:to-yellow-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] transition-all duration-300"
            >
              Premium
            </button>
          ) : null}
        </div>

        {renderExamResults()}
      </main>

      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ isOpen: false, paperName: "" })}
        paperName={upgradeModal.paperName}
      />
    </div>
  );
}
