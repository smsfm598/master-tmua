"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useUser } from '@clerk/nextjs'
import { saveExamResult, calculateScore } from '../../lib/supabase'
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

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

function MainComponent({ onReturnToDashboard }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [currentView, setCurrentView] = React.useState("welcome"); // 'welcome', 'instructions', 'exam', 'review'
  const [currentQuestion, setCurrentQuestion] = React.useState(0);
  const [selectedAnswers, setSelectedAnswers] = React.useState({});
  const [flaggedQuestions, setFlaggedQuestions] = React.useState(new Set());
  const [timeRemaining, setTimeRemaining] = React.useState(90 * 60); // 90 minutes in seconds
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

  const questionsRaw = [
    {
      id: 1,
      text: "Find the value of $\\int_1^2 (x^2 - \\frac{4}{x^2})^2 dx$",
      options: [
        "$\\frac{43}{15}$",
        "$3$",
        "$\\frac{97}{15}$",
        "$\\frac{103}{15}$",
        "$\\frac{163}{15}$",
        "$18$"
      ],
    },
    {
      id: 2,
      text: "$$f(x) = \\frac{(x^2 + 5)(2x)}{\\sqrt[4]{x^3}}, \\quad x > 0$$\n\nWhich one of the following is equal to $f'(x)$?",
      options: [
        "$8x^{\\frac{4}{9}} + \\frac{40}{3}x^{\\frac{1}{4}}$",
        "$\\frac{9}{2}x^{\\frac{5}{4}} + \\frac{5}{2}x^{-\\frac{3}{4}}$",
        "$8x^{\\frac{4}{9}} +  \\frac{40}{3}x^{-\\frac{1}{4}}$",
        "$\\frac{8}{13}x^{\\frac{13}{4}} +8x^{\\frac{5}{4}} $"
      ],
    },
    {
      id: 3,
      text: "What is the value in radians, of the largest angle $x$ in the range $0 \\le x \\le 2\\pi$ that satisfies the equation $8 \\sin^2 x + 4 \\cos^2 x = 7$?",
      options: [
        "$\\frac{2\\pi}{3}$",
        "$\\frac{5\\pi}{6}$",
        "$\\frac{4\\pi}{3}$",
        "$\\frac{5\\pi}{3}$",
        "$\\frac{7\\pi}{4}$",
        "$\\frac{11\\pi}{6}$"
      ],
    },
    {
      id: 4,
      text: "Five sealed urns, labelled P, Q, R, S, and T, each contain the same (non-zero) number of balls. The following statements are attached to the urns.\n\nUrn P: $\\quad$ This urn contains one or four balls.\nUrn Q: $\\quad$This urn contains two or four balls.\nUrn R:$\\quad$ This urn contains more than two balls and fewer than five balls.\nUrn S:$\\quad$ This urn contains one or two balls.\nUrn T: $\\quad$This urn contains fewer than three balls.\n\nExactly one of the urns has a true statement attached to it.\n\nWhich urn is it?",
      options: [
        "Urn P",
        "Urn Q",
        "Urn R",
        "Urn S",
        "Urn T"
      ],
    },
    {
      id: 5,
      text: "Consider the statement:\n\n(*) A whole number $n$ is prime if $n$ is 1 less than or 5 less than a multiple of 6.\n\nHow many counterexamples (*) are there in the range $0 < n < 50$?",
      options: [
        "2",
        "3",
        "4",
        "5",
        "6"
      ],
    },
    {
      id: 6,
      text: "The sequence of functions $f_1(x), f_2(x), f_3(x), \\ldots$ is defined as follows:\n\n$$f_1(x) = x^{10}$$\n\n$$f_{n+1}(x) = xf_n'(x) \\quad \\text{ for } n \\ge 1$$\n\nwhere $f_n'(x) = \\frac{df_n(x)}{dx}$\n\nFind the value of $$\\sum_{n=1}^{20} f_n(x)$$",
      options: [
        "$\\frac{x^{10}(x^{20} - 1)}{x - 1}$",
        "$\\frac{x^{10}(x^{21} - 1)}{x - 1}$",
        "$\\left(\\frac{10^{20} - 1}{9}\\right) x^{10}$",
        "$\\left(\\frac{10^{21} - 1}{9}\\right) x^{10}$",
        "$\\left(\\frac{(10x)^{20} - 1}{10x - 1}\\right) x^{10}$",
        "$\\left(\\frac{(10x)^{21} - 1}{10x - 1}\\right) x^{10}$",
        "$x^{10} + x^9 + x^8 + \\ldots + x + 1$",
        "$x^{10} + 10x^9 + (10 \\times 9)x^8 + \\ldots +(10 \\times 9 \\times \\ldots \\times 2)x + (10 \\times 9 \\times \\ldots \\times 2 \\times 1)$"
      ],
    },
    {
      id: 7,
      text: "The four real numbers $a, b, c$ and $d$ are all greater than 1.\n\nSuppose that they satisfy the equation $\\log_a d = (\\log_a b)^2$.\n\nUse some of the lines given to construct a proof that, in this case, it follows that\n\n$$(*) \\log_b d = (\\log_a b)(\\log_a c)$$\n\n(1) Let $x = \\log_a b$ and $y = \\log_a c$\n\n(2) $d = (c^x)^2$\n(3) $d = c^{(x^2)}$\n(4) $d = b^{xy}$\n\n(5) $d = (a^y)^{(x^2)}$\n(6) $d = ((a^y)^x)^2$\n(7) $d = (a^{x})^{xy}$\n\n(8) $d = a^{(y^{2x})}$\n(9) $d = a^{(x^2y)}$",
      options: [
        "(1). Then (2), so (6), so (8), so (7), and therefore (4), hence (*) as required.",
        "(1). Then (2), so (7), so (8), so (6), and therefore (4), hence (*) as required.",
        "(1). Then (3), so (5), so (9), so (7), and therefore (4), hence (*) as required.",
        "(1). Then (3), so (7), so (9), so (5), and therefore (4), hence (*) as required.",
        "(1). Then (4), so (5), so (9), so (7), and therefore (3), hence (*) as required.",
        "(1). Then (4), so (6), so (8), so (7), and therefore (2), hence (*) as required.",
        "(1). Then (4), so (7), so (8), so (6), and therefore (2), hence (*) as required.",
        "(1). Then (4), so (7), so (9), so (5), and therefore (3), hence (*) as required."
      ],
    },
    {
      id: 8,
      text: "A region is defined by the inequalities $x + y > 6$ and $x - y > -4$\n\nConsider the three statements:\n\n$\\quad$ 1$\\quad$ $x > 1$\n $\\quad$ 2 $\\quad$ $y > 5$\n $\\quad$ 3$\\quad$ $(x + y)(x - y) > -24$\n\nWhich of the above statements is/are true for every point in the region?",
      options: [
        "none",
        "1 only",
        "2 only",
        "3 only",
        "1 and 2 only",
        "1 and 3 only",
        "2 and 3 only",
        "1, 2 and 3"
      ],
    },
    {
      id: 9,
      text: "Triangles $ABC$ and $XYZ$ have the same area.\n\nWhich of these extra conditions, taken independently, would imply that they are congruent?\n\n$\\quad$(1)$\\quad$ $AB = XY$ and $BC = YZ$\n$\\quad$(2)$\\quad$ $AB = XY$ and $\\angle ABC = \\angle XYZ$\n$\\quad$(3)$\\quad$ $\\angle ABC = \\angle XYZ$ and $\\angle BCA = \\angle YZX$",
      options: [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H"
      ],
    },
    {
      id: 10,
      text: "In this question $x$ and $y$ are non-zero real numbers.\n\nWhich one of the following is sufficient to conclude that $x < y$?",
      options: [
        "$x^4 < y^4$",
        "$y^4 < x^4$",
        "$x^{-1} < y^{-1}$",
        "$y^{-1} < x^{-1}$",
        "$x^{\\frac{3}{5}} < y^{\\frac{3}{5}}$",
        "$y^{\\frac{3}{5}} < x^{\\frac{3}{5}}$"
      ],
    },
    {
      id: 11,
      text: "$f(x)$ is a polynomial with real coefficients.\n\nThe polynomial $f(x) = 0$ has exactly two real roots, $x = -p$ and $x = p$ where $p > 0$.\n\nConsider the following three statements:\n\n $\\quad$ 1  $\\quad$ $f'(x) = 0$ for exactly one value of $x$ between $-p$ and $p$ \n\n$\\quad$2 $\\quad$The area between the curve $y = f(x)$ and the x-axis and the lines $x = -p$ and $x = p$ is given by $2 \\int_0^p |f(x)| dx$\n\n$\\quad$3$\\quad$ The graph of $y = -f(-x)$ intersects the x-axis at the points $x = -p$ and $x = p$ only\n\nWhich of the above statements must be true?",
      options: [
        "none",
        "1 only",
        "2 only",
        "3 only",
        "1 and 2 only",
        "1 and 3 only",
        "2 and 3 only",
        "1, 2 and 3"
      ],
    },
    {
      id: 12,
      text: "The first term of an arithmetic sequence is $a$ and the common difference is $d$.\n\nSuppose that the first $n$ terms is denoted by $S_n$.\n\nIf $S_8 > 3S_6$, what can be deduced about the sign of $a$ and the sign of $d$?",
      options: [
        "both $a$ and $d$ are negative",
        "$a$ is positive, $d$ is negative",
        "$a$ is negative, $d$ is positive",
        "$a$ is negative, but the sign of $d$ cannot be deduced",
        "$d$ is negative, but the sign of $a$ cannot be deduced",
        "neither the sign of $a$ nor the sign of $d$ can be deduced"
      ],
    },
    {
      id: 13,
      text: "In this question, $a, b$ and $c$ are positive integers.\n\n The following is an attempted proof of the false statement:\n\n$\\quad$If $a$ divides $b$, then $a$ divides $b$ or $a$ divides $c$.\n\n [$a$ divides $bc$ means '$a$ is a factor of $bc$']\n\nWhich one of the following gives the error in the proof?\n\n$\\quad$1. The statement is equivalent to 'if $a$ does not divide $b$ and $a$ does not divide $c$ then $a$ does not divide $bc$'.\n$\\quad$2. Suppose $a$ does not divide $b$ and $a$ does not divide $c$. Then the remainder when dividing $b$ by $a$ is $r$ where $0 < r < a$, and the remainder when dividing $c$ by $a$ is $s$ where $0 < s < a$.\n$\\quad$3. So $b = ax + r$ and $c = ay + s$ for some integers $x$ and $y$.\n$\\quad$4. Thus $bc = a(axy + xs + yr) + rs$ .\n$\\quad$5. So the remainder when dividing $bc$ by $a$ is $rs$\n$\\quad$6. Since $r > 0$ and $s > 0 $ it follows that $rs > 0$.\n$\\quad$7. Hence $a$ does not divide $bc$.",
      options: [
        "Line 1",
        "Line 2",
        "Line 3",
        "Line 4",
        "Line 5",
        "Line 6"
      ],
    },
    {
      id: 14,
      text: "$f(x) = ax^4 + bx^3 + cx^2 + dx + e$ where $a, b, c, d$ and $e$ are real numbers.\n\nSuppose $f(x) = 1$ has $p$ distinct real solutions, $f(x) = 3$ has $r$ distinct real solutions, and $f(x) = 4$ has $s$ distinct real solutions.\n\nWhich one of the following is not possible?",
      options: [
        "$p = 1, q = 2, r = 4$ and $s = 3$",
        "$p = 1, q = 3, r = 2$ and $s = 4$",
        "$p = 1, q = 4, r = 3$ and $s = 2$",
        "$p = 2, q = 4, r = 3$ and $s = 1$",
        "$p = 4, q = 3, r = 2$ and $s = 1$"
      ],
    },
    {
      id: 15,
      text: "Consider the quadratic $f(x) = x^2 - 2ax + a$ and the statement:\n\n$\\quad$(*) $f(x) = 0$ has two real roots whose difference is greater than 2 and less than 4.\n\nWhich one of the following statements is true if and only if (*) is true?",
      options: [
        "$q < p^2 < q + 4$",
        "$\\sqrt{q + 1} < p < \\sqrt{q + 4}$",
        "$q - 3 < p^2 - 4< q$",
        "$q < p^2 - 1 < q + 3$",
        "$q - 2 < p^2 - 3 < q + 2$"
      ],
    },
    {
      id: 16,
      text: "In the figure, $PQRS$ is a trapezium with $PQ$ parallel to $SR$.\n\nThe diagonals of the trapezium meet at $X$.\n\n$U$ lies on $SP$ and $T$ lies on $RQ$ such that $UT$ is a line segment through $X$ parallel to $PQ$.\n\nThe length of $PQ$ is 12 cm and the length of $SR$ is 3 cm.\n\nWhat, in centimetres, is the length of $UT$?",
      options: [
        "4.2",
        "4.5",
        "4.8",
        "5.25",
        "6"
      ],
    },
    {
      id: 17,
      text: "Consider these simultaneous equations, where $c$ is a constant:\n\n$$y = 3 \\sin x + 2$$\n\n$$y = x + c$$\n\nWhich of the following statements is/are true?\n\n $\\quad$1$\\quad$ For some value of $c$, there is exactly one solution with $0 \\le x \\le \\pi$ and there is at least one solution with $-\\pi < x < 0 $.\n\n $\\quad$2$\\quad$ For some value of $c$, there is exactly one solution with $0 \\le x \\le \\pi$ and there are no solutions with $ -\\pi < x < 0$.\n\n$\\quad$3$\\quad$ For some value of $c$, there is exactly one solution with $0 < x \\le \\pi$ and there are no solutions with $x > \\pi$.",
      options: [
        "none",
        "1 only",
        "2 only",
        "3 only",
        "1 and 2 only",
        "1 and 3 only",
        "2 and 3 only",
        "1, 2 and 3"
      ],
    },
    {
      id: 18,
      text: "Consider this statement about a function $f(x)$:\n\n$\\quad$(*) If $f(x) \\le 1$ for all $-1 \\le x \\le 1$ then $\\int_{-1}^{1} (f(x))^2 dx \\le \\int_{-1}^{1} f(x) dx$\n\nWhich one of the following functions provides a counterexample to (*)?",
      options: [
        "$f(x) = x + \\frac{1}{2}$",
        "$f(x) = x - \\frac{1}{2}$",
        "$f(x) = x + x^3$",
        "$f(x) = x - x^3$",
        "$f(x) = x^2 + x^4$",
        "$f(x) = x^2 - x^4$"
      ],
    },
    {
      id: 19,
      text: "Some identical unit cubes are used to construct a three-dimensional object by gluing them together face to face.\n\nSketches of this object are made by looking at it from the right-hand side, from the front and from above. These sketches are called the side elevation, the front elevation, and the plan view respectively.\n\nHow many cubes were used to construct the object?",
      options: [
        "exactly 6",
        "either 6 or 7",
        "exactly 7",
        "either 7 or 8",
        "exactly 8",
        "either 8 or 9",
        "exactly 9"
      ],
    },
    {
      id: 20,
      text: "Each interior angle of a regular polygon with $n$ sides is $\\frac{3}{4}$ of each interior angle of a second regular polygon with $m$ sides.\n\nHow many pairs of positive integers $n$ and $m$ are there for which this statement is true?",
      options: [
        "none",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "infinitely many"
      ],
    },
  ];
// ... existing code ...

  const questions = questionsRaw.map(q => ({
    ...q,
    text: q.text, // Keep the original text with line breaks
    options: q.options.map((opt, i) => renderWithLatex(opt))
  }));

  // Image mapping for questions with diagrams (no LaTeX formatting)
  const questionImageMap = {
      9: "/images/pracp2q9.png",
      16: "/images/pracp2q16.png",
      19: "/images/pracp2q19.png",
  };

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
          paperName: 'Practice Paper 2',
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
            <h1 className="text-xl font-semibold pl-2">
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
            <h1 className="text-xl font-semibold pl-2">
              Test of Mathematics for University Admission
            </h1>
            <div className="flex items-center space-x-4 pr-4">
              <div className="text-yellow-300 text-lg font-mono">
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
            <div className="text-yellow-300 text-lg font-mono">
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

export default MainComponent;