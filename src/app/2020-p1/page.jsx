"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useUser } from '@clerk/nextjs'
import { saveExamResult, calculateScore } from '../../lib/supabase'
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import PaymentGate from "../../components/PaymentGate";

// ✅ Define this once
function renderWithLatex(str = "") {
  if (!str) return null;

  // Split into $$...$$ (block) or $...$ (inline)
  const parts = str.split(/(\$\$.*?\$\$|\$.*?\$)/g);

  return parts.map((part, i) => {
    if (!part) return null;

    if (part.startsWith("$$") && part.endsWith("$$")) {
      return <BlockMath key={i} math={part.slice(2, -2)} />;
    } else if (part.startsWith("$") && part.endsWith("$")) {
      return <InlineMath key={i} math={part.slice(1, -1)} />;
    }
    return <span key={i}>{part}</span>; // normal text
  });
}

function MainComponent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [currentView, setCurrentView] = React.useState("welcome"); // 'welcome', 'instructions', 'exam', 'review'
  const [currentQuestion, setCurrentQuestion] = React.useState(0);
  const [selectedAnswers, setSelectedAnswers] = React.useState({});
  const [flaggedQuestions, setFlaggedQuestions] = React.useState(new Set());
  const [timeRemaining, setTimeRemaining] = React.useState(75 * 60); // 90 minutes in seconds
  const [instructionTime, setInstructionTime] = React.useState(60); // 60 seconds for instructions
  const [colorScheme, setColorScheme] = React.useState("default");
  const [showNavigator, setShowNavigator] = React.useState(false);
  const [showColorSchemeDropdown, setShowColorSchemeDropdown] =
    React.useState(false);
  const [showEndExamModal, setShowEndExamModal] = React.useState(false);
  
  // Add missing variables
  const [user, setUser] = React.useState(null);
  const [examStartTime, setExamStartTime] = React.useState(null);
  const [savingResult, setSavingResult] = React.useState(false);

  // Set user from auth context
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser]);
  // ... existing code ...
  const questionsRaw = [
    {
       id: 1,
      text: `Which of the following is an expression for the first derivative with respect to $x$ of

$$\\frac{x^3 - 5x^2}{2x\\sqrt{x}}$$`,
      options: [
        "$-\\frac{\\sqrt{x}}{2}$",
        "$\\frac{\\sqrt{x}}{4}$",
        "$\\frac{3x - 5}{4\\sqrt{x}}$",
        "$\\frac{3\\sqrt{x} - 5}{4\\sqrt{x}}$",
        "$\\frac{3\\sqrt{x} - 10}{3\\sqrt{x}}$",
        "$\\frac{3x^2 - 10x}{3\\sqrt{x}}$"
      ],
    },
    {
      id: 2,
      text: `$(2x + 1)$ and $(x - 2)$ are factors of $2x^3 + px^2 + q$

What is the value of $2p + q$?`,
      options: [
        "$-10$",
        "$-\\frac{38}{5}$",
        "$-\\frac{22}{3}$",
        "$\\frac{22}{3}$",
        "$\\frac{38}{5}$",
        "$10$"
      ],
    },
    {
      id: 3,
      text: `Find the complete set of values of $x$ for which

$$(x + 4)(x + 3)(1 - x) > 0 \\quad \\text { and } \\quad (x + 2)(x - 2) < 0$$`,
      options: [
        "$1 < x < 2$",
        "$-2 < x < 1$",
        "$-2 < x < 2$",
        "$x < -2$ or $x > 1$",
        "$x < -4$ or $x > 2$",
        "$x < -4$ or $-3 < x < 1$",
        "$-4 < x < -2$ or $x > 1$"
      ],
    },
    {
      id: 4,
      text: `The $1^{st}$, $2^{nd}$ and $3^{rd}$ terms of a geometric progression are also the $1^{st}$, $4^{th}$ and $6^{th}$ terms, respectively, of an arithmetic progression.

The sum to infinity of the geometric progression is 12.

Find the $1^{st}$ term of the geometric progression.`,
      options: [
        "$1$",
        "$2$",
        "$3$",
        "$4$",
        "$5$",
        "$6$"
      ],
    },
    {
      id: 5,
      text: `The curve $S$ has equation

$$y = px^2 + 6x - q$$

where $p$ and $q$ are constants.

$S$ has a line of symmetry at $x = -\\frac{1}{4}$ and touches the $x$-axis at exactly one point.

What is the value of $p + 8q$?`,
      options: [
        "$6$",
        "$18$",
        "$21$",
        "$25$",
        "$38$"
      ],
    },
    {
      id: 6,
      text: `Find the maximum value of the function

$$f(x) = \\frac{1}{5^{2x} - 4(5^x) + 7}$$`,
      options: [
        "$\\frac{1}{7}$",
        "$\\frac{1}{4}$",
        "$\\frac{1}{3}$",
        "$3$",
        "$4$",
        "$7$"
      ],
    },
    {
      id: 7,
      text: `Given that

$$2^{3x} = 8^{(y+3)}$$

and

$$4^{(x+1)} = \\frac{16^{(y+1)}}{8^{(y+3)}}$$

what is the value of $x + y$?`,
      options: [
        "$-23$",
        "$-22$",
        "$-15$",
        "$-14$",
        "$-11$",
        "$-10$"
      ],
    },
    {
      id: 8,
      text: `The function $f$ is defined for all real $x$ as

$$f(x) = (p - x)(x + 2)$$

Find the complete set of values of $p$ for which the maximum value of $f(x)$ is less than 4.`,
      options: [
        "$-2 - 4\\sqrt{2} < p < -2 + 4\\sqrt{2}$",
        "$-2 - 2\\sqrt{2} < p < -2 + 2\\sqrt{2}$",
        "$-2\\sqrt{5} < p < 2\\sqrt{5}$",
        "$-6 < p < 2$",
        "$-4 < p < 0$",
        "$-2 < p < 2$"
      ],
    },
    {
      id: 9,
      text: `The quadratic expression $x^2 - 14x + 9$ factorises as $(x - \\alpha)(x - \\beta)$, where $\\alpha$ and $\\beta$ are positive real numbers.

Which quadratic expression can be factorised as $(x - \\sqrt{\\alpha})(x - \\sqrt{\\beta})$?`,
      options: [
        "$x^2 - \\sqrt{10}x + 3$",
        "$x^2 - \\sqrt{14}x + 3$",
        "$x^2 - \\sqrt{20}x + 3$",
        "$x^2 - 178x + 81$",
        "$x^2 - 176x + 81$",
        "$x^2 + 196x + 81$"
      ],
    },
    {
      id: 10,
      text: `The following sequence of transformations is applied to the curve $y = 4x^2$

1. Translation by $\\begin{pmatrix} 3 \\\\ -5 \\end{pmatrix}$

2. Reflection in the $x$-axis

3. Stretch parallel to the $x$-axis with scale factor 2

What is the equation of the resulting curve?`,
      options: [
        "$y = -x^2 + 12x - 31$",
        "$y = -x^2 + 12x - 41$",
        "$y = x^2 + 12x + 31$",
        "$y = x^2 + 12x + 41$",
        "$y = -16x^2 + 48x - 31$",
        "$y = -16x^2 + 48x - 41$",
        "$y = 16x^2 - 48x + 31$",
        "$y = 16x^2 - 48x + 41$"
      ],
    },
    {
      id: 11,
      text: `The quadratic function shown passes through $(2, 0)$ and $(q, 0)$, where $q > 2$.

What is the value of $q$ such that the area of region $R$ equals the area of region $S$?`,
      options: [
        "$\\sqrt{6}$",
        "$3$",
        "$\\frac{18}{5}$",
        "$4$",
        "$6$",
        "$\\frac{33}{5}$"
      ],
    },
    {
      id: 12,
      text: `How many real solutions are there to the equation

$$3 \\cos x = \\sqrt{x}$$

where $x$ is in radians?`,
      options: [
        "$0$",
        "$1$",
        "$2$",
        "$3$",
        "$4$",
        "$5$",
        "infinitely many"
      ],
    },
    {
      id: 13,
      text: `Find the coefficient of $x^2 y^4$ in the expansion of $(1 + x + y^2)^{7}$`,
      options: [
        "$6$",
        "$10$",
        "$21$",
        "$35$",
        "$105$",
        "$210$"
      ],
    },
    {
      id: 14,
      text: `The area enclosed between the line $y = mx$ and the curve $y = x^3$ is 6.

What is the value of $m$?`,
      options: [
        "$2$",
        "$4$",
        "$\\sqrt{3}$",
        "$\\sqrt{6}$",
        "$2\\sqrt{3}$",
        "$2\\sqrt{6}$"
      ],
    },
    {
      id: 15,
      text: `Find the positive difference between the two real values of $x$ for which

$$(\\log_2 x)^4 + 12 \\left( \\log_2 (\\frac{1}{x}) \\right)^2 - 2^6 = 0$$`,
      options: [
        "$4$",
        "$16$",
        "$\\frac{15}{4}$",
        "$\\frac{17}{4}$",
        "$\\frac{255}{16}$",
        "$\\frac{257}{16}$"
      ],
    },
    {
      id: 16,
      text: `The circle $C_1$ has equation $(x + 2)^2 + (y - 1)^2 = 3$

The circle $C_2$ has equation $(x - 4)^2 + (y - 1)^2 = 3$

The straight line $l$ is a tangent to both $C_1$ and $C_2$ and has positive gradient.

The acute angle between $l$ and the $x$-axis is $\\theta$

Find the value of $\\tan \\theta$`,
      options: [
        "$\\frac{1}{2}$",
        "$2$",
        "$\\frac{\\sqrt{2}}{2}$",
        "$\\sqrt{2}$",
        "$\\frac{\\sqrt{6}}{2}$",
        "$\\frac{\\sqrt{6}}{3}$",
        "$\\frac{\\sqrt{3}}{3}$",
        "$\\sqrt{3}$"
      ],
    },
    {
      id: 17,
      text: `Find the complete set of values of $m$ in terms of $c$ such that the graphs of $y = mx + c$ and $y = \\sqrt{x}$ have two points of intersection.`,
      options: [
        "$0 < m < \\frac{1}{4c}$",
        "$0 < m < 4c^2$",
        "$m > \\frac{1}{4c}$",
        "$m < \\frac{1}{4c}$",
        "$m > 4c^2$",
        "$m < 4c^2$"
      ],
    },
    {
      id: 18,
      text: `Find the number of solutions and the sum of the solutions of the equation

$$1 - 2 \\cos^2 x = |\\cos x|$$

where $0 \\leq x \\leq 180°$`,
      options: [
        "Number of solutions = 2    Sum of solutions = 180°",
        "Number of solutions = 2    Sum of solutions = 240°",
        "Number of solutions = 3    Sum of solutions = 180°",
        "Number of solutions = 3    Sum of solutions = 360°",
        "Number of solutions = 4    Sum of solutions = 240°",
        "Number of solutions = 4    Sum of solutions = 360°"
      ],
    },
    {
      id: 19,
      text: `Find the lowest positive integer for which $x^2 - 52x - 52$ is positive.`,
      options: [
        "$26$",
        "$27$",
        "$51$",
        "$52$",
        "$53$",
        "$54$"
      ],
    },
    {
      id: 20,
      text: `For how many values of $a$ is the equation

$$(x - a)(x^2 - x + a) = 0$$

satisfied by exactly two distinct values of $x$?`,
      options: [
        "$0$",
        "$1$",
        "$2$",
        "$3$",
        "$4$",
        "more than 4"
      ],
    },
  ];

  const questions = questionsRaw.map(q => ({
    ...q,
    text: q.text, // Keep the original text with line breaks
    options: q.options.map((opt, i) => renderWithLatex(opt))
  }));

  // Image mapping for questions with diagrams (no LaTeX formatting)
  const questionImageMap = {
      11: "/images/2020p1q11.png",
  };

  // Timer effects
  React.useEffect(() => {
    if (currentView === "exam" && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (currentView === "exam" && timeRemaining === 0) {
      // Auto-end exam when time runs out
      confirmEndExam();
    }
  }, [currentView, timeRemaining]);

  React.useEffect(() => {
    if (currentView === "instructions" && instructionTime > 0) {
      const timer = setInterval(() => {
        setInstructionTime((prev) => {
          if (prev <= 1) {
            setCurrentView("exam");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentView, instructionTime]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const formatInstructionTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleAnswerSelect = (questionId, answer) => {
    const currentQ = questions.find(q => q.id === questionId);
    if (!currentQ) return;
    const optionIndex = currentQ.options.indexOf(answer);
    const letter = optionIndex >= 0 ? String.fromCharCode(65 + optionIndex) : '';
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: letter,
    }));
  };

  const handleFlagQuestion = () => {
    const questionId = questions[currentQuestion].id;
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleEndExam = () => {
    setShowEndExamModal(true);
  };

  // Enhanced saveExamResult function
  const handleSaveExamResult = async () => {
    setSavingResult(true);
    try {
      if (user) {
        console.log('User object:', user);
        console.log('User ID:', user.id);
        
        // Prepare exam data for Supabase
        const examData = {
          paperName: '2020 Paper 1',
          userAnswers: selectedAnswers,
          timeTaken: (90 * 60) - timeRemaining,
          examType: 'TMUA'
        };
        
        console.log('Exam data being sent to Supabase:', examData);
        console.log('Selected answers:', selectedAnswers);
        
        // Save to Supabase with automatic marking
        const result = await saveExamResult(user.id, examData);
        console.log('Result from saveExamResult:', result);
        
        if (result) {
          alert(`Exam completed! Score: ${result.markingResult.score}/${result.markingResult.totalQuestions} (${Math.round((result.markingResult.score / result.markingResult.totalQuestions) * 100)}%)`);
        } else {
          throw new Error('Failed to save exam result');
        }
      } else {
        console.log('No user object found, skipping save to Supabase');
        // Guest users: do not save, just redirect
        alert('Exam completed! Please sign up to see your marks and dashboard.');
      }
    } catch (error) {
      console.error('Error saving exam result:', error);
      alert('Error saving exam result. Please try again.');
    } finally {
      setSavingResult(false);
    }
  };

  const confirmEndExam = async () => {
    setShowEndExamModal(false);
    if (savingResult) return;
    await handleSaveExamResult();
    if (user) {
      router.push('/marks');
    } else {
      router.push('/sign-up');
    }
  };

  const cancelEndExam = () => {
    setShowEndExamModal(false);
  };

  const startInstructions = () => {
    setCurrentView("instructions");
  };

  const startExam = () => {
    setCurrentView("exam");
  };

  const getQuestionStatus = (questionIndex) => {
    const questionId = questions[questionIndex].id;
    if (selectedAnswers[questionId]) {
      return "Complete";
    } else if (questionIndex <= currentQuestion) {
      return "Incomplete";
    } else {
      return "Unseen";
    }
  };

  const getQuestionStatusColor = (status) => {
    switch (status) {
      case "Complete":
        return "text-black";
      case "Incomplete":
        return "text-red-600";
      case "Unseen":
        return "text-red-600";
      default:
        return "text-black";
    }
  };

  const jumpToQuestion = (questionIndex) => {
    setCurrentQuestion(questionIndex);
    setShowNavigator(false);
  };

  const applyColorScheme = (scheme) => {
    setColorScheme(scheme);
    setShowColorSchemeDropdown(false);
  };

  const getThemeClasses = () => {
    switch (colorScheme) {
      case "high-contrast":
        return "bg-white text-black";
      case "dark":
        return "bg-black text-white";
      case "light-yellow":
        return "bg-[#FFFACD] text-black"; // Light yellow background
      case "salmon":
        return "bg-[#FFA07A] text-black"; // Salmon background
      case "yellow":
        return "bg-[#FFFF00] text-black"; // Bright yellow background
      default:
        return "bg-white text-black";
    }
  };

  const getHeaderTheme = () => {
    switch (colorScheme) {
      case "high-contrast":
        return "bg-black text-white";
      case "dark":
        return "bg-white text-black";
      case "light-yellow":
        return "bg-black text-[#FFFACD]"; // Black header with light yellow text
      case "salmon":
        return "bg-black text-[#FFA07A]"; // Black header with salmon text
      case "yellow":
        return "bg-black text-[#FFFF00]"; // Black header with yellow text
      default:
        return "bg-[#016CAA] text-white";
    }
  };

  if (currentView === "welcome") {
    return (
      <div className="min-h-screen bg-white font-arial">
        {/* Header */}
        <div className="bg-[#016CAA] text-white p-2">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold pl-2 text-white">
              Test of Mathematics for University Admission
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 pb-24 text-black">
          {/* UAT UK Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="https://ucarecdn.com/97d806a1-696c-4c3d-a7b0-5aeffecb590c/-/format/auto/"
              alt="UAT UK Logo"
              className="h-32 w-auto"
              style={{ backgroundColor: "transparent" }}
            />
          </div>

          {/* Welcome Text */}
          <div className="space-y-6">
            <p className="text-lg">
              <strong>
                Welcome to the Test of Mathematics for University Admission.
              </strong>
            </p>

            <p>
              <strong>
                Non-disclosure agreement and general terms of use for tests
                developed for UAT-UK:
              </strong>
            </p>

            <p>
              The test is made available to you as a candidate solely for the
              purpose of being assessed in this test. You are expressly
              prohibited from disclosing, publishing, reproducing or
              transmitting this test, in whole or in part, in any form or by any
              means including visual, verbal, written, electronic or mechanical
              means, for any purpose, without the prior express written
              permission of UAT-UK.
            </p>

            <p>
              Click the <strong>Next (N)</strong> button when you are ready to
              begin the test.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#016CAA] text-white">
          <div className="flex justify-between items-center h-12">
            <button
              className="flex items-center justify-center h-full px-4 bg-transparent border-none"
              onClick={handleEndExam}
            >
              <img
                src="https://ucarecdn.com/4a7da34e-c9f8-4ac8-b921-1ff96b248d46/-/format/auto/"
                alt="End Exam"
                className="h-6 w-auto"
                style={{ backgroundColor: "transparent" }}
              />
            </button>
            <button
              className="flex items-center justify-center h-full px-4 bg-transparent border-none"
              onClick={startInstructions}
            >
              <img
                src="https://ucarecdn.com/a66765a0-2400-4b28-9d02-281de57b04d8/-/format/auto/"
                alt="Next"
                className="h-6 w-auto"
                style={{ backgroundColor: "transparent" }}
              />
            </button>
          </div>
        </div>

        {/* End Exam Modal */}
        {showEndExamModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#016CAA] text-white p-6 rounded max-w-md w-full mx-4">
              <div className="text-center">
                <div className="mb-4">
                  <span className="text-4xl">ℹ️</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">End Exam</h3>
                <div className="w-full h-px bg-white mb-4"></div>
                <p className="mb-2">You have chosen to end this exam.</p>
                <p className="mb-6 font-semibold">
                  Are you sure you want to end this exam?
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    className="px-6 py-2 bg-transparent border border-white text-white hover:bg-white hover:text-[#016CAA]"
                    onClick={confirmEndExam}
                  >
                    Yes
                  </button>
                  <button
                    className="px-6 py-2 bg-transparent border border-white text-white hover:bg-white hover:text-[#016CAA]"
                    onClick={cancelEndExam}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentView === "instructions") {
    return (
      <div className="min-h-screen bg-white font-arial">
        {/* Header */}
        <div className="bg-[#016CAA] text-white p-2">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold pl-2 text-white">
              Test of Mathematics for University Admission
            </h1>
            <div className="flex items-center space-x-4 pr-4">
              <div className="text-white text-base font-mono">
                <i className="fas fa-clock mr-2"></i>
                Time Remaining: {formatInstructionTime(instructionTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 pb-24 text-black">
          <div className="space-y-6">
            <p className="text-lg font-semibold">
              You have 1 minute to read these instructions.
            </p>

            <p className="text-lg">This exam consists of two subtests:</p>

            {/* Table */}
            <div className="my-6">
              <table className="w-full max-w-md border-collapse border border-black">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-3 text-left font-semibold text-black">
                      Subtest
                    </th>
                    <th className="border border-black p-3 text-center font-semibold text-black">
                      Number of Questions
                    </th>
                    <th className="border border-black p-3 text-center font-semibold text-black">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-3 text-black">
                      Paper 1
                    </td>
                    <td className="border border-black p-3 text-center text-black">
                      20
                    </td>
                    <td className="border border-black p-3 text-center text-black">
                      75 minutes
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-3 text-black">
                      Paper 2
                    </td>
                    <td className="border border-black p-3 text-center text-black">
                      20
                    </td>
                    <td className="border border-black p-3 text-center text-black">
                      75 minutes
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              For each question, choose the one answer you consider correct.
            </p>

            <p>
              There are no penalties for incorrect responses, only marks for
              correct answers, so you should attempt all 20 questions. Each
              question is worth one mark.
            </p>

            <p>
              Please click the <strong>Next (N)</strong> button to proceed.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#016CAA] text-white">
          <div className="flex justify-between items-center h-12">
            <button
              className="flex items-center justify-center h-full px-4 bg-transparent border-none"
              onClick={handleEndExam}
            >
              <img
                src="https://ucarecdn.com/4a7da34e-c9f8-4ac8-b921-1ff96b248d46/-/format/auto/"
                alt="End Exam"
                className="h-6 w-auto"
                style={{ backgroundColor: "transparent" }}
              />
            </button>
            <div className="flex items-center space-x-4 h-full">
              <button
                className="flex items-center justify-center h-full px-4 bg-transparent border-none"
                onClick={() => setCurrentView("welcome")}
              >
                <img
                  src="https://ucarecdn.com/f7a11036-f342-497b-a4c3-ecb295a60f0d/-/format/auto/"
                  alt="Previous"
                  className="h-6 w-auto"
                  style={{ backgroundColor: "transparent" }}
                />
              </button>
              <button
                className="flex items-center justify-center h-full px-4 bg-transparent border-none"
                onClick={startExam}
              >
                <img
                  src="https://ucarecdn.com/a66765a0-2400-4b28-9d02-281de57b04d8/-/format/auto/"
                  alt="Next"
                  className="h-6 w-auto"
                  style={{ backgroundColor: "transparent" }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* End Exam Modal */}
        {showEndExamModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#016CAA] text-white p-6 rounded max-w-md w-full mx-4">
              <div className="text-center">
                <div className="mb-4">
                  <span className="text-4xl">ℹ️</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">End Exam</h3>
                <div className="w-full h-px bg-white mb-4"></div>
                <p className="mb-2">You have chosen to end this exam.</p>
                <p className="mb-6 font-semibold">
                  Are you sure you want to end this exam?
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    className="px-6 py-2 bg-transparent border border-white text-white hover:bg-white hover:text-[#016CAA]"
                    onClick={confirmEndExam}
                  >
                    Yes
                  </button>
                  <button
                    className="px-6 py-2 bg-transparent border border-white text-white hover:bg-white hover:text-[#016CAA]"
                    onClick={cancelEndExam}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentView === "review") {
    return (
      <div className="min-h-screen bg-white font-arial p-8">
        <h2 className="text-2xl font-bold mb-6">Answers Review</h2>
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="border-b pb-4">
              <div className="font-semibold mb-1">Q{idx + 1}: {q.text}</div>
              <div className="ml-4">
                <span className="font-medium">Selected Answer: </span>
                <span className="text-purple-700">
                  {selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== '' ? 
                    (() => {
                      const idx = selectedAnswers[q.id].charCodeAt(0) - 65;
                      return q.options[idx] ?? <span className='text-gray-400'>Invalid selection</span>;
                    })() : 
                    <span className='text-gray-400'>No answer selected</span>
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Exam View
  const currentQ = questions[currentQuestion];
  const isQuestionFlagged = flaggedQuestions.has(currentQ.id);

  return (
    <div className={`min-h-screen ${getThemeClasses()} font-arial`}>
      {/* Top Bar */}
      <div className={`${getHeaderTheme()} p-2`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold pl-2 text-white">
              Test of Mathematics for University Admission
            </h1>
          </div>
          <div className="flex flex-col items-end space-y-1 pr-4">
            <div className="text-white text-base font-mono">
              <i className="fas fa-clock mr-2"></i>
              Time Remaining: {formatTime(timeRemaining)}
            </div>
            <div className="text-white text-sm">
              <i className="fas fa-user mr-1"></i>
              {currentQuestion + 1} of 20
            </div>
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="bg-[#4778BF] text-white p-2 border-t border-blue-400">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4 pl-2">
            {/* Empty space for left side */}
          </div>
          <div className="flex items-center space-x-4 pr-4">
            <button
              className={`text-sm ${
                isQuestionFlagged ? "text-yellow-300" : "text-white"
              }`}
              onClick={handleFlagQuestion}
            >
              <span className="mr-1">🏳</span>
              Flag for Review
            </button>
            <div className="relative">
              <button
                className="text-sm text-white hover:text-gray-200"
                onClick={() =>
                  setShowColorSchemeDropdown(!showColorSchemeDropdown)
                }
              >
                <img
                  src="https://ucarecdn.com/5bbfd64a-2c00-42ab-b3fa-79b681b688c2/-/format/auto/"
                  alt="Color Scheme"
                  className="h-6 w-auto"
                />
              </button>
              {showColorSchemeDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-gray-200 text-black border border-gray-300 min-w-[200px] z-50">
                  <div className="bg-[#016CAA] text-white px-3 py-2 font-semibold">
                    Color Scheme
                  </div>
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                    onClick={() => applyColorScheme("default")}
                  >
                    Color Scheme
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 pb-16">
        <div className="pl-2">
          {/* Question Text */}
          <div className="mb-8">
            {/* Replace the single paragraph with this to preserve line breaks */}
            <div className="text-lg leading-relaxed">
              {currentQ.text.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-2">{renderWithLatex(paragraph)}</p>
              ))}
            </div>

            {/* Diagram (placed under text, above options) */}
            {questionImageMap[currentQ.id] && (
              <div className="mt-4 flex justify-center">
                <img
                  src={questionImageMap[currentQ.id]}
                  alt={`Question ${currentQ.id} diagram`}
                  className="max-w-full h-auto"
                />
              </div>
            )}
          </div>

          {/* Answer Options */}
          <div className="space-y-3 mb-8">
            {currentQ.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              return (
                <label key={index} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value={option}
                    checked={selectedAnswers[currentQ.id] === letter}
                    onChange={() => handleAnswerSelect(currentQ.id, option)}
                    className={`mr-3 w-4 h-4 rounded-full border-2 focus:ring-2 focus:ring-blue-500 transition-colors duration-150 ${selectedAnswers[currentQ.id] === letter ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-400'}`}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigator Modal */}
      {showNavigator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded max-w-4xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="bg-[#016CAA] text-white p-3 -m-6 mb-4">
              <h3 className="text-lg font-semibold">
                <img
                  src="https://ucarecdn.com/b91e5732-56f6-4f07-a97b-55f82d79d95f/-/format/auto/"
                  alt="Navigator"
                  className="h-6 w-auto inline mr-2"
                />
                Navigator - select a question to go to it
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-[#016CAA] text-white">
                    <th className="border border-gray-300 p-2 text-left">
                      Question #
                    </th>
                    <th className="border border-gray-300 p-2 text-left">
                      Status
                    </th>
                    <th className="border border-gray-300 p-2 text-left">
                      Flagged for Review
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((question, index) => {
                    const status = getQuestionStatus(index);
                    const isFlagged = flaggedQuestions.has(question.id);
                    const isCurrent = index === currentQuestion;

                    return (
                      <tr
                        key={question.id}
                        className={`cursor-pointer hover:bg-yellow-200 ${
                          isCurrent ? "bg-yellow-200" : "bg-white"
                        }`}
                        onClick={() => jumpToQuestion(index)}
                      >
                        <td className="border border-gray-300 p-2">
                          Question {index + 1}
                          {isFlagged && (
                            <span className="ml-2 text-red-600">▲</span>
                          )}
                        </td>
                        <td
                          className={`border border-gray-300 p-2 ${getQuestionStatusColor(
                            status
                          )}`}
                        >
                          {status}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {isFlagged && <span className="text-red-600">▲</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {questions.filter((_, i) => getQuestionStatus(i) === "Unseen")
                .length +
                questions.filter(
                  (_, i) => getQuestionStatus(i) === "Incomplete"
                ).length}{" "}
              Unseen/Incomplete
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

      {/* End Exam Modal */}
      {showEndExamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#016CAA] text-white p-6 rounded max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <span className="text-4xl">ℹ️</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">End Exam</h3>
              <div className="w-full h-px bg-white mb-4"></div>
              <p className="mb-2">You have chosen to end this exam.</p>
              <p className="mb-6 font-semibold">
                Are you sure you want to end this exam?
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  className="px-6 py-2 bg-transparent border border-white text-white hover:bg-white hover:text-[#016CAA]"
                  onClick={confirmEndExam}
                >
                  Yes
                </button>
                <button
                  className="px-6 py-2 bg-transparent border border-white text-white hover:bg-white hover:text-[#016CAA]"
                  onClick={cancelEndExam}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bg-[#016CAA] text-white p-2 fixed bottom-0 left-0 right-0">
        <div className="flex justify-between items-center">
          <button
            className="text-sm text-white hover:text-gray-200 pl-2 bg-transparent border-none"
            onClick={handleEndExam}
          >
            <img
              src="https://ucarecdn.com/4a7da34e-c9f8-4ac8-b921-1ff96b248d46/-/format/auto/"
              alt="End Exam"
              className="h-6 w-auto"
            />
          </button>

          <div className="flex items-center space-x-4 pr-4">
            {currentQuestion > 0 && (
              <button
                className="text-sm text-white hover:text-gray-200 bg-transparent border-none"
                onClick={handlePrevious}
              >
                <img
                  src="https://ucarecdn.com/f7a11036-f342-497b-a4c3-ecb295a60f0d/-/format/auto/"
                  alt="Previous"
                  className="h-6 w-auto"
                />
              </button>
            )}
            <button
              className="text-sm text-white hover:text-gray-200 bg-transparent border-none"
              onClick={() => setShowNavigator(true)}
            >
              <img
                src="https://ucarecdn.com/b91e5732-56f6-4f07-a97b-55f82d79d95f/-/format/auto/"
                alt="Navigator"
                className="h-6 w-auto"
              />
            </button>
            {currentQuestion < questions.length - 1 && (
            <button
              className="text-sm text-white hover:text-gray-200 bg-transparent border-none"
              onClick={handleNext}
              disabled={currentQuestion === questions.length - 1}
            >
              <img
                src="https://ucarecdn.com/a66765a0-2400-4b28-9d02-281de57b04d8/-/format/auto/"
                alt="Next"
                className="h-6 w-auto"
              />
            </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <PaymentGate paperName="2020 Paper 1"><MainComponent /></PaymentGate>;
}