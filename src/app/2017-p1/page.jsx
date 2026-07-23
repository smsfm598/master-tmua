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
    // Convert newlines to <br> tags for normal text
    return (
      <span key={i}>
        {part.split('\n').map((line, lineIndex, array) => (
          <React.Fragment key={lineIndex}>
            {line}
            {lineIndex < array.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
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



   // TMUA questions
  const questionsRaw = [
    
  {
    id: 1,
    text: `Given that

$$\\frac{dy}{dx} = 3x^2 - \\frac{2-3x}{x^3}, \\quad x \\neq 0$$

and y = 5 when x = 1, find y in terms of x.`,
    options: [
      "$$y = \\frac{1}{3}x^3 + x^{-2} - 3x^{-1} + 6 \\frac{2}{3}$$",
      "$$y = x^3 + \\frac{1}{2}x^{-2} - 3x^{-1} + 6 \\frac{1}{2}$$",
      "$$y = x^3 + x^{-2} - 3x^{-1} + 6$$",
      "$$y = x^3 + x^{-2} - x^{-1} + 4$$",
      "$$y = x^3 + 2x^{-2} - x^{-1} + 3$$",
      "$$y = 3x^3 + x^{-2} - x^{-1} + 2$$"
    ],
  },
  {
    id: 2,
    text: `The function f is given by

$$f(x) = \\left(\\frac{2}{x} - \\frac{1}{2x^2}\\right)^2, \\quad x \\neq 0$$ What is the value of f''(1)?`,
    options: ["$-3$", "$-1$", "$5$", "$17$", "$29$", "$80$"],
  },
  {
    id: 3,
    text: `A line l has equation $$y = 6 - 2x$$ A second line is perpendicular to l and passes through the point (-6, 0).

Find the area of the region enclosed by the two lines and the x-axis.`,
    options: [
      "$16 \\frac{1}{5}$",
      "$18$",
      "$21 \\frac{3}{5}$",
      "$27$",
      "$40 \\frac{1}{2}$"
    ],
  },
  {
    id: 4,
    text: `When $(3x^2 + 8x - 3)$ is multiplied by $(px - 1)$ and the resulting product is divided by $(x + 1)$, the remainder is 24.

What is the value of p?`,
    options: ["$-4$", "$2$", "$4$", "$\\frac{8}{7}$", "$\\frac{11}{4}$"],
  },
  {
    id: 5,
    text: `S is the complete set of values of x which satisfy both the inequalities

$$x^2 - 8x + 12 < 0 \\quad \\text{and} \\quad 2x + 1 > 9$$ The set S can also be represented as a single inequality.

Which one of the following single inequalities represents the set S?`,
    options: [
      "$(x^2 - 8x + 12)(2x + 1) < 0$",
      "$(x^2 - 8x + 12)(2x + 1) > 0$",
      "$x^2 - 10x + 24 < 0$",
      "$x^2 - 10x + 24 > 0$",
      "$x^2 - 6x + 8 < 0$",
      "$x^2 - 6x + 8 > 0$",
      "$x < 2$",
      "$x > 6$"
    ],
  },
  {
    id: 6,
    text: `A tangent to the circle $x^2 + y^2 = 144$ passes through the point (20, 0) and crosses the positive y-axis.

What is the value of y at the point where the tangent meets the y-axis?`,
    options: ["$12$", "$15$", "$\\frac{49}{3}$", "$20$", "$\\frac{64}{3}$", "$\\frac{80}{3}$"],
  },
  {
    id: 7,
    text: `The first three terms of an arithmetic progression are p, q and p² respectively, where p < 0.

The first three terms of a geometric progression are p, p² and q respectively.

Find the sum of the first 10 terms of the arithmetic progression.`,
    options: ["$\\frac{23}{8}$", "$\\frac{95}{8}$", "$\\frac{115}{8}$", "$\\frac{185}{8}$"],
  },
  {
    id: 8,
    text: `Find the complete set of values of x, with $0 \\le x \\le \\pi$, for which
$$(1 - 2 \\sin x) \\cos x \\ge 0$$`,
    options: [
      "$$0 \\le x \\le \\frac{\\pi}{6}, \\frac{\\pi}{2} \\le x \\le \\frac{5\\pi}{6}$$",
      "$$0 \\le x \\le \\frac{\\pi}{6}, \\frac{5\\pi}{6} \\le x \\le \\pi$$",
      "$$\\frac{\\pi}{6} \\le x \\le \\frac{\\pi}{2}, \\frac{5\\pi}{6} \\le x \\le \\pi$$",
      "$$\\frac{\\pi}{6} \\le x \\le \\frac{5\\pi}{6}$$"
    ],
  },
  {
    id: 9,
    text: `A circle has equation $x^2 + y^2 - 18x - 22y + 178 = 0$

A regular hexagon is drawn inside this circle so that the vertices of the hexagon touch the circle.

What is the area of the hexagon?`,
    options: ["$6$", "$6\\sqrt{3}$", "$18$", "$18\\sqrt{3}$", "$36$", "$36\\sqrt{3}$", "$48$", "$48\\sqrt{3}$"],
  },
  {
    id: 10,
    text: `A curve C has equation $y = f(x)$ where
$$f(x) = p^3 - 6p^2x + 3px^2 - x^3$$

and p is real.

The gradient of the normal to the curve C at the point where x = -1 is M.

What is the greatest possible value of M as p varies?`,
    options: [
      "$-\\frac{3}{2}$",
      "$-\\frac{2}{3}$",
      "$-\\frac{1}{2}$",
      "$\\frac{1}{4}$",
      "$\\frac{2}{3}$",
      "$\\frac{3}{2}$"
    ],
  },
  {
    id: 11,
    text: `The sequence $x_n$ is defined by the rules

$$x_1 = 7$$ $$x_{n+1} = \\frac{23x_n - 53}{5x_n + 1}$$ The first three terms in the sequence are 7, 3, 1.

What is the value of $x_{100}$?`,
    options: ["$-5$", "$0$", "$1$", "$3$", "$7$"],
  },
  {
    id: 12,
    text: `The polynomial function f(x) is such that f(x) > 0 for all values of x.

Given $\\int_{2}^{4} f(x) \\, dx = A$, which one of the following statements must be correct?`,
    options: [
      "$\\int_{0}^{2} [f(x + 2) + 1] dx = A + 1$",
      "$\\int_{0}^{2} [f(x + 2) + 1] dx = A + 2$",
      "$\\int_{2}^{4} [f(x + 2) + 1] dx = A + 1$",
      "$\\int_{2}^{4} [f(x + 2) + 1] dx = A + 2$",
      "$\\int_{4}^{6} [f(x + 2) + 1] dx = A + 1$",
      "$\\int_{4}^{6} [f(x + 2) + 1] dx = A + 2$"
    ],
  },
  {
    id: 13,
    text: `In the expansion of $(a + bx)^5$ the coefficient of $x^4$ is 8 times the coefficient of $x^2$.

Given that a and b are non-zero positive integers, what is the smallest possible value of a + b?`,
    options: ["$3$", "$4$", "$5$", "$9$", "$13$", "$17$"],
  },
  {
    id: 14,
    text: `The solution of the simultaneous equations

$$2^x + 3 \\times 2^y = 3$$
$$2^{2x} - 9 \\times 2^{2y} = 6$$

is x = p, y = q.

Find the value of p - q`,
    options: ["$\\frac{5}{12}$", "$\\frac{7}{3}$", "$\\log_2 \\frac{5}{12}$", "$\\log_2 \\frac{7}{3}$", "$\\log_2 9$", "$\\log_2 15$"],
  },
  {
    id: 15,
    text: `It is given that $f(x) = -2x^2 + 10$

Consider the following three curves:

(1) y = f(x)  
(2) y = f(x + 1)  
(3) the curve y = f(x + 1) reflected in the line y = 6  

The trapezium rule is used to estimate the area under each of these three curves between x = 0 and x = 1.

State whether the trapezium rule gives an overestimate or underestimate for each of these areas.`,
    options: [
      "(1) underestimate, (2) underestimate, (3) underestimate",
      "(1) underestimate, (2) underestimate, (3) overestimate",
      "(1) underestimate, (2) overestimate, (3) underestimate",
      "(1) underestimate, (2) overestimate, (3) overestimate",
      "(1) overestimate, (2) underestimate, (3) underestimate",
      "(1) overestimate, (2) underestimate, (3) overestimate",
      "(1) overestimate, (2) overestimate, (3) underestimate",
      "(1) overestimate, (2) overestimate, (3) overestimate"
    ],
  },
  {
    id: 16,
    text: `The functions f and g are given by $f(x) = 3x^2 + 12x + 4$ and $g(x) = x^3 + 6x^2 + 9x - 8$.

What is the complete set of values of x for which one of the functions is increasing and the other decreasing?`,
    options: ["$x \\ge -1$", "$x \\le -1$", "$-3 \\le x \\le -2, x \\ge -1$", "$x \\le -2, x \\ge -1$", "$x \\le -3, -2 \\le x \\le -1$", "$x \\le -3, x \\ge -2$", "$-2 \\le x \\le -1$"],
  },
  {
    id: 17,
    text: `The two functions $F(n)$ and $G(n)$ are defined as follows for positive integers n:

$$F(n) = \\frac{1}{n} \\int_0^n (n - x) dx$$
$$G(n) = \\sum_{r=1}^n F(r)$$

What is the smallest positive integer n such that $G(n) > 150?$`,
    options: ["$22$", "$23$", "$24$", "$25$", "$26$"],
  },
  {
    id: 18,
    text: `The graph of $y = \\log_{10}x$ is translated in the positive y-direction by 2 units.

This translation is equivalent to a stretch of factor k parallel to the x-axis.

What is the value of k?`,
    options: ["$0.01$", "$\\log_{10} 2$", "$0.5$", "$2$", "$\\log_{2} 10$", "$100$"],
  },
  {
    id: 19,
    text: `The set of solutions to the inequality $x^2 + bx + c < 0$ is the interval $p < x < q$

where $b, c, p $ and $q$ are real constants with $c< 0 $ .

In terms of $p, q $ and $c$, what is the set of solutions to the inequality $x^2 + bcx + c^3 < 0$?`,
    options: [
      "$\\frac{p}{c} < x < \\frac{q}{c}$",
      "$\\frac{q}{c} < x < \\frac{p}{c}$",
      "$pc < x < qc$",
      "$qc < x < pc$",
      "$pc^2 < x < qc^2$",
      "$qc^2 < x < pc^2$"
    ],
  },
  {
    id: 20,
    text: `The lengths of the sides QR, RP and PQ in triangle PQR are $a$, $a + d$ and $a + 2d$ respectively, where $ a$ and $d$ are positive and such that $3d > 2a$.

What is the full range, in degrees, of possible values for angle PRQ?`,
    options: [
      "$0 < \\text{angle PRQ} < 60$",
      "$0 < \\text{angle PRQ} < 120$",
      "$60 < \\text{angle PRQ} < 120$",
      "$60 < \\text{angle PRQ} < 180$",
      "$120 < \\text{angle PRQ} < 180$"
    ],
  },
];
const questions = questionsRaw.map(q => ({
  ...q,
  text: renderWithLatex(q.text),
  options: q.options.map((opt, i) => renderWithLatex(opt))
}));
  // Timer effects
  React.useEffect(() => {
    if (currentView === "exam" && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
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
          paperName: '2017 Paper 1',
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
          alert(`Exam completed! Score: ${result.markingResult.score}/${result.markingResult.totalQuestions} (${result.percentage}%)`);
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
            <h1 className="text-xl font-semibold pl-2 font-mono text-white">
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
            <h1 className="text-xl font-semibold pl-2 font-mono text-white">
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
            <h1 className="text-base font-normal pl-2">
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
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                    onClick={() => applyColorScheme("light-yellow")}
                  >
                    Black on Light Yellow
                  </button>
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                    onClick={() => applyColorScheme("salmon")}
                  >
                    Black on Salmon
                  </button>
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                    onClick={() => applyColorScheme("high-contrast")}
                  >
                    Black on White
                  </button>
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                    onClick={() => applyColorScheme("yellow")}
                  >
                    Black on Yellow
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
            <p className="text-lg leading-relaxed">{currentQ.text}</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}


export default function Page() {
  return <PaymentGate paperName="2017 Paper 1"><MainComponent /></PaymentGate>;
}