"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

function renderWithLatex(str = "") {
  if (!str) return null;

  const parts = str.split(/(\$\$.*?\$\$|\$.*?\$)/g);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith("$$") && part.endsWith("$$")) {
      return <BlockMath key={index} math={part.slice(2, -2)} />;
    }

    if (part.startsWith("$") && part.endsWith("$")) {
      return <InlineMath key={index} math={part.slice(1, -1)} />;
    }

    return (
      <span key={index}>
        {part.split("\n").map((line, lineIndex, lines) => (
          <React.Fragment key={lineIndex}>
            {line}
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  });
}

function formatDisplayDate(value) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Page({ params }) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [mistakePaper, setMistakePaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showNavigator, setShowNavigator] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    const loadMistakePaper = async () => {
      try {
        const response = await fetch(`/api/mistake-papers/${params.resultId}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load mistake paper");
        }

        setMistakePaper(payload.mistakePaper || null);
      } catch (fetchError) {
        console.error("Error loading mistake paper:", fetchError);
        setError(fetchError.message || "Failed to load mistake paper");
      } finally {
        setLoading(false);
      }
    };

    loadMistakePaper();
  }, [isLoaded, params.resultId, router, user]);

  const questions = useMemo(() => mistakePaper?.questions || [], [mistakePaper]);
  const currentQ = questions[currentQuestion];

  const handleAnswerSelect = (questionId, optionIndex) => {
    const letter = String.fromCharCode(65 + optionIndex);

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: letter,
    }));
  };

  const getQuestionStatus = (index) => {
    const question = questions[index];

    if (!question) {
      return "Unseen";
    }

    if (selectedAnswers[question.id]) {
      return "Complete";
    }

    if (index <= currentQuestion) {
      return "Incomplete";
    }

    return "Unseen";
  };

  const finishMistakePaper = async () => {
    const score = questions.reduce((total, question) => {
      return total + (selectedAnswers[question.id] === question.correctAnswer ? 1 : 0);
    }, 0);

    const wrongAnswers = questions
      .filter((q) => selectedAnswers[q.id] !== q.correctAnswer)
      .map((q) => ({
        questionNumber: q.originalQuestionNumber,
        userAnswer: selectedAnswers[q.id] || "No answer",
        correctAnswer: q.correctAnswer,
      }));

    try {
      const response = await fetch("/api/save-mistake-result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paperName: mistakePaper.paperName,
          score: score,
          totalQuestions: questions.length,
          wrongAnswers: wrongAnswers,
          timeTaken: 0, // Mistake papers are untimed
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save result");
      }

      alert(`Mistake paper completed! Score: ${score}/${questions.length}. Your result has been saved.`);
    } catch (error) {
      console.error("Error saving result:", error);
      alert(`Mistake paper completed! Score: ${score}/${questions.length}. (Error saving result)`);
    }

    router.push("/marks?tab=mistakes");
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !mistakePaper || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex items-center justify-center px-4">
        <div className="bg-[#1a0030] border border-[#5c4d7d] rounded-2xl p-8 max-w-xl w-full text-center text-white">
          <h1 className="text-2xl font-bold mb-3">Mistake Paper Unavailable</h1>
          <p className="text-gray-300 mb-6">
            {error || "This mistake paper is no longer available."}
          </p>
          <button
            onClick={() => router.push("/marks?tab=mistakes")}
            className="px-5 py-2.5 bg-[#8e44ad] rounded-lg hover:bg-[#9b59b6] transition-colors"
          >
            Back to Marks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-arial">
      <div className="bg-[#016CAA] text-white p-2">
        <div className="flex justify-between items-center">
          <div className="pl-2">
            <h1 className="text-base font-normal font-mono text-white">
              {mistakePaper.title}
            </h1>
            <p className="text-xs text-blue-100 mt-1">
              Based on {mistakePaper.paperName} from {formatDisplayDate(mistakePaper.createdAt)}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-1 pr-4">
            <div className="text-yellow-300 text-lg font-mono">No duration</div>
            <div className="text-white text-sm">
              {currentQuestion + 1} of {questions.length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#4778BF] text-white p-2 border-t border-blue-400">
        <div className="flex justify-between items-center">
          <div className="pl-2 text-sm">
            Multiple choice
          </div>
          <div className="pr-4 text-sm">
            Original question {currentQ.originalQuestionNumber}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 pb-16 text-black">
        <div className="mb-8">
          <p className="text-lg leading-relaxed whitespace-pre-line">
            {renderWithLatex(currentQ.text)}
          </p>
        </div>

        {currentQ.image && (
          <div className="mb-8">
            <img
              src={currentQ.image}
              alt={`Diagram for Question ${currentQ.originalQuestionNumber}`}
              className="max-w-full h-auto rounded shadow-sm"
            />
          </div>
        )}

        <div className="space-y-3 mb-8">
          {currentQ.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index);

            return (
              <label key={index} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`question-${currentQ.id}`}
                  checked={selectedAnswers[currentQ.id] === letter}
                  onChange={() => handleAnswerSelect(currentQ.id, index)}
                  className={`mr-3 w-4 h-4 rounded-full border-2 focus:ring-2 focus:ring-blue-500 transition-colors duration-150 ${
                    selectedAnswers[currentQ.id] === letter
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-400"
                  }`}
                />
                <span>{renderWithLatex(option)}</span>
              </label>
            );
          })}
        </div>
      </div>

      {showNavigator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded max-w-4xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="bg-[#016CAA] text-white p-3 -m-6 mb-4">
              <h3 className="text-lg font-semibold">Navigator</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-[#016CAA] text-white">
                    <th className="border border-gray-300 p-2 text-left">Question #</th>
                    <th className="border border-gray-300 p-2 text-left">Original #</th>
                    <th className="border border-gray-300 p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((question, index) => {
                    const status = getQuestionStatus(index);

                    return (
                      <tr
                        key={question.id}
                        className={`cursor-pointer hover:bg-yellow-200 ${
                          index === currentQuestion ? "bg-yellow-200" : "bg-white"
                        }`}
                        onClick={() => {
                          setCurrentQuestion(index);
                          setShowNavigator(false);
                        }}
                      >
                        <td className="border border-gray-300 p-2">Question {index + 1}</td>
                        <td className="border border-gray-300 p-2">{question.originalQuestionNumber}</td>
                        <td className="border border-gray-300 p-2">{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-[#016CAA] text-white hover:bg-blue-600"
                onClick={() => setShowNavigator(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#016CAA] text-white p-6 rounded max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Finish Mistake Paper</h3>
              <div className="w-full h-px bg-white mb-4"></div>
              <p className="mb-6 font-semibold">
                Are you sure you want to finish this mistake paper?
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  className="px-6 py-2 bg-transparent border border-white text-white hover:bg-white hover:text-[#016CAA]"
                  onClick={finishMistakePaper}
                >
                  Yes
                </button>
                <button
                  className="px-6 py-2 bg-transparent border border-white text-white hover:bg-white hover:text-[#016CAA]"
                  onClick={() => setShowEndModal(false)}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#016CAA] text-white p-2 fixed bottom-0 left-0 right-0">
        <div className="flex justify-between items-center">
          <button
            className="text-sm text-white hover:text-gray-200 pl-2 bg-transparent border-none"
            onClick={() => setShowEndModal(true)}
          >
            End Mistake Paper
          </button>

          <div className="flex items-center space-x-4 pr-4">
            {currentQuestion > 0 && (
              <button
                className="text-sm text-white hover:text-gray-200 bg-transparent border-none"
                onClick={() => setCurrentQuestion((prev) => prev - 1)}
              >
                Previous
              </button>
            )}
            <button
              className="text-sm text-white hover:text-gray-200 bg-transparent border-none"
              onClick={() => setShowNavigator(true)}
            >
              Navigator
            </button>
            {currentQuestion < questions.length - 1 ? (
              <button
                className="text-sm text-white hover:text-gray-200 bg-transparent border-none"
                onClick={() => setCurrentQuestion((prev) => prev + 1)}
              >
                Next
              </button>
            ) : (
              <button
                className="text-sm text-white hover:text-gray-200 bg-transparent border-none"
                onClick={() => setShowEndModal(true)}
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
