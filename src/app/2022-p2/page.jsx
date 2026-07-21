"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useUser } from '@clerk/nextjs'
import { saveExamResult, calculateScore } from '../../lib/supabase'
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import PaymentGate from "../../../components/PaymentGate";

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
  // TMUA 2022 Paper 2 questions
  const questionsRaw = [
    {
      id: 1,
      text: `Determine the number of stationary points on the curve with equation

$$y = 3x^4 + 4x^3 + 6x^2 - 5$$`,
      options: [
        "0",
        "1",
        "2",
        "3",
        "4"
      ],
    },
    {
      id: 2,
      text: `Find the coefficient of the $x^5$ term in the expansion of

$$(1 + x)^5 \\times \\sum_{i=0}^{5} x^i$$`,
      options: [
        "1",
        "5",
        "16",
        "25",
        "32"
      ],
    },
    {
      id: 3,
      text: `Consider the following statement about the positive integer $n$:

$$ \\text{If $n$ is prime, then $n^2 + 2$ is not prime}$$

Which of the following is a counterexample to this statement?
      
        $\\quad I \\quad n = 2$
        $\\quad II \\quad n = 3$
        $\\quad III \\quad n = 4$`,
        options: [
        "none of them",
        "I only",
        "II only",
        "III only",
        "I and II only",
        "I and III only",
        "II and III only",
        "I, II and III"
      ],
    },
    {
      id: 4,
      text: `The point $P$ has coordinates $(p, q)$, and the equation of a circle is

$$x^2 + 2fx + y^2 + 2gy + h = 0$$

where $f$, $g$, $h$ and $q$ are all real constants.

Let $L$ be the distance between the centre of the circle and the point $P$.

Which one of the following is sufficient on its own to be able to calculate $L$?`,
      options: [
        "the values of $f, g$ and $h$",
        "the values of $f, g, p$ and $q$",
        "the values of $f, h, p$ and $q$",
        "the values of $g, h, p$ and $q$",
        "none of the options A-D is sufficient on its own"
      ],
    },
    {
      id: 5,
      text: `A straight line $L$ passes through $(1, 2)$.

Let $P$ be the statement

$$ \\text{If the $y$-intercept of $L$ is negative, then the $x$-intercept of $L$ is positive.}$$

Which of the following statements must be true?

        $\\quad I \\quad $P$$
        $\\quad II \\quad$ the converse of P$$
        $\\quad III \\quad$ the contrapositive of P $$ `,
      
      options: [
        "none of them",
        "I only",
        "II only",
        "III only",
        "I and II only",
        "I and III only",
        "II and III only",
        "I, II and III"
      ],
    },
    {
      id: 6,
      text: `A list consists of 6 integers.

Consider the following statements:

$ \\quad$ P: $\\quad$ $n$ is odd.
$ \\quad$ Q: $\\quad$ The median of the list is one of the numbers in the list.

Which one of the following is true?`,
      options: [
        "P is necessary and sufficient for Q.",
        "P is necessary but not sufficient for Q.",
        "P is sufficient but not necessary for Q.",
        "P is not necessary and not sufficient for Q."
      ],
    },
    {
      id: 7,
      text: `Consider the following claim:

$\\quad$ The difference between two consecutive positive cube numbers is always prime.

Here is an attempted proof of this claim:

$ \\quad I \\quad$ $(x + 1)^3 = x^3 + 3x^2 + 3x + 1$
$ \\quad II \\quad$ Taking $x$ to be a positive integer, the difference between two consecutive cube numbers can be expressed as $(x + 1)^3 - x^3 = 3x^2 + 3x + 1$
$ \\quad III \\quad$ It is impossible to factorise $3x^2 + 3x + 1$ into two linear factors with integer coefficients because its discriminant is negative.
$ \\quad IV \\quad$ Therefore for every positive integer value of $x$ the integer $3x^2 + 3x + 1$ cannot be factorised.
$ \\quad V \\quad$ Hence, the difference between two consecutive cube numbers will always be prime.

Which of the following best describes this proof?`,
      options: [
        "The proof is completely correct, and the claim is true.",
        "The proof is completely correct, but there are counterexamples to the claim.",
        "The proof is wrong, and the first error occurs on line I.",
        "The proof is wrong, and the first error occurs on line II.",
        "The proof is wrong, and the first error occurs on line III.",
        "The proof is wrong, and the first error occurs on line IV.",
        "The proof is wrong, and the first error occurs on line V."
      ],
    },
    {
      id: 8,
      text: `A selection, $S$, of $n$ terms is taken from the arithmetic sequence $1, 4, 7, 10, \\ldots, 70$.

Consider the following statement:

$$ \\quad \\text{ (*)  There are two distinct terms in $S$ whose sum is 74.}$$

What is the smallest value of $n$ for which (*) is necessarily true?`,
      options: [
        "12",
        "13",
        "14",
        "21",
        "22",
        "23"
      ],
    },
    {
      id: 9,
      text: `Consider the following statement:

$$ \\quad \\text{ (*)  For all real numbers $x$, if $x < k$ then $x^2 < k$.}$$

What is the complete set of values of $k$ for which (*) is true?`,
      options: [
        "no real numbers",
        "$k > 0$",
        "$k < 1$",
        "$k \\leq 1$",
        "$0 < k < 1$",
        "$0 \\leq k \\leq 1$",
        "all real numbers"
      ],
    },
    {
      id: 10,
      text: `Which of the following statements is/are true?

$ \\quad I \\quad$ For all real numbers $x$ and for all positive integers $n$, $x < n$
$ \\quad II \\quad$ For all real numbers $x$, there exists a positive integer $n$ such that $x < n$
$ \\quad III \\quad$ There exists a real number $x$ such that for all positive integers $n$, $x < n$`,
      options: [
        "none of them",
        "I only",
        "II only",
        "III only",
        "I and II only",
        "I and III only",
        "II and III only",
        "I, II and III"
      ],
    },
    {
      id: 11,
      text: `The diagram shows a kite $PQRS$ whose diagonals meet at $O$.

$\\quad OP = x$
$\\quad OQ = y$
$\\quad OR = x$
$\\quad OS = z$

Which of the following is necessary and sufficient for angle $SPQ$ to be a right angle?`,
      options: [
        "$x = y = z$",
        "$2x = y + z$",
        "$x^2 = yz$",
        "$y = z$",
        "$y^2 = x^2 + z^2$"
      ],
    },
    {
      id: 12,
      text: `Place the following integrals in order of size, starting with the smallest.

$$P = \\int_0^{1} 2^{\\sqrt{x}} \\, dx$$

$$Q = \\int_0^{1} 2^x \\, dx$$

$$R = \\int_0^{1} (\\sqrt{2})^x \\, dx$$`,
      options: [
        "$P < Q < R$",
        "$P < R < Q$",
        "$Q < P < R$",
        "$Q < R < P$",
        "$R < P < Q$",
        "$R < Q < P$"
      ],
    },
    {
      id: 13,
      text: `Consider the statement (*) about a real number $x$:

$$\\quad (*) \\text{ There exists a real number }y\\text{ such that} x - xy + y \\text{ is negative.}$$

For how many real values of $x$ is (*) true?`,
      options: [
        "no values of $x$",
        "exactly one value of $x$",
        "exactly two values of $x$",
        "all except exactly two values of $x$",
        "all except exactly one value of $x$",
        "all values of $x$"
      ],
    },
    {
      id: 14,
      text: `Consider the two inequalities:

$$|x + 5| < |x + 11|$$

$$|x + 11| < |x + 1|$$

Which one of the following is correct?`,
      options: [
        "There is no real number for which both inequalities are true.",
        "There is exactly one real number for which both inequalities are true.",
        "The real numbers for which both inequalities are true form an interval of length 1.",
        "The real numbers for which both inequalities are true form an interval of length 2.",
        "The real numbers for which both inequalities are true form an interval of length 3.",
        "The real numbers for which both inequalities are true form an interval of length 4.",
        "The real numbers for which both inequalities are true form an interval of length 5."
      ],
    },
    {
      id: 15,
      text: `The real numbers $x$, $y$ and $z$ are all greater than 1, and satisfy the equations

$$\\log_x y = z\\text{ and } \\log_y z = x$$

Which of the following equations for $\\log_z x$ must be true?`,
      options: [
        "$\\log_z x = y$",
        "$\\log_z x = \\frac{1}{y}$",
        "$\\log_z x = xy$",
        "$\\log_z x = \\frac{1}{xy}$",
        "$\\log_z x = xz$",
        "$\\log_z x = \\frac{1}{xz}$",
        "$\\log_z x = yz$",
        "$\\log_z x = \\frac{1}{yz}$"
      ],
    },
    {
      id: 16,
      text: `In this question, $a_1, \\ldots, a_{100}$ and $b_1, \\ldots, b_{100}$ and $c_1, \\ldots, c_{100}$ are three sequences of integers such that

$$a_n \\leq b_n + c_n$$

for each $n$.

Which of the following statements must be true?

$\\quad I \\quad$ (minimum of $a_1, \\ldots, a_{100}$) $\\leq$ (minimum of $b_1, \\ldots, b_{100}$) + (minimum of $c_1, \\ldots, c_{100}$)
$\\quad II \\quad$ (minimum of $a_1, \\ldots, a_{100}$) $\\leq$ (minimum of $b_1, \\ldots, b_{100}$) + (minimum of $c_1, \\ldots, c_{100}$)
$\\quad III \\quad$ (maximum of $a_1, \\ldots, a_{100}$) $\\leq$ (maximum of $b_1, \\ldots, b_{100}$) + (maximum of $c_1, \\ldots, c_{100}$)`,
      options: [
        "none of them",
        "I only",
        "II only",
        "III only",
        "I and II only",
        "I and III only",
        "II and III only",
        "I, II and III"
      ],
    },
       {
      id: 17,
      text: `A student answered the following question:

$$\\quad a\\text{ and }b\\text{ are non-zero real numbers.}$$

$$\\quad Prove that the equation }x^3 + ax^2 + b = 0$ has three distinct real roots if $27b\\left(b + \\frac{4a^3}{27}\\right)< 0$\\quad$$

Here is the student's solution:

$\\quad I \\quad$ We differentiate $y = x^3 + ax^2 + b$ to get $\\frac{dy}{dx} = 3x^2 + 2ax = x(3x + 2a)$

$\\quad$ Solving $\\frac{dy}{dx} = 0$ shows that the stationary points are at $(0, b)$ and $\\left(-\\frac{2a}{3}, b + \\frac{4a^3}{27}\\right)$.

$\\quad II \\quad$ If $27b\\left(b + \\frac{4a^3}{27}\\right) < 0$, then $b$ and $b + \\frac{4a^3}{27}$ must have opposite signs, and so one of the stationary points is above the $x$-axis and one is below.

$\\quad III \\quad$ If the cubic has three distinct real roots, then one of the stationary points is above the $x$-axis and one is below.

$\\quad IV \\quad$ Hence if $27b\\left(b + \\frac{4a^3}{27}\\right) < 0$, then the equation has three distinct real roots.

Which one of the following options best describes the student's solution?`,
      options: [
        "It is a completely correct solution.",
        "The student has instead proved the converse of the statement in the question.",
        "The solution is wrong, because the student should have stated step II after step III.",
        "The solution is wrong, because the student should have shown the converse of the result in step II.",
        "The solution is wrong, because the student should have shown the converse of the result in step III."
      ],
    },
    {
      id: 18,
      text: `P, Q, R and S show the graphs of

$$y = (\\cos x)^{\\cos x}$, $y = (\\sin x)^{\\sin x}$, $y = (\\cos x)^{\\sin x}$ \\text{ and } $y = (\\sin x)^{\\cos x}$$

for $0 < x < \\frac{\\pi}{2}$ in some order.

Which row in the following table correctly identifies the graphs?`,
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
      id: 19,
      text: `A polygon has $n$ vertices, where $n \\geq 3$. It has the following properties:

$ \\quad$ $\\quad$ • Every vertex of the polygon lies on the circumference of a circle $C$.
$ \\quad$ $\\quad$ • The centre of the circle $C$ is inside the polygon.
$ \\quad$ $\\quad$ • The radii from the centre of the circle $C$ to the vertices of the polygon cuts the polygon into $n$ triangles of equal area.

For which values of $n$ are these properties sufficient to deduce that the polygon is regular?`,
      options: [
        "no values of $n$",
        "$n = 3$ only",
        "$n = 3$ and $n = 4$ only",
        "$n = 3$ and $n ≥ 5$ only",
        "all values of $n$"
      ],
    },
    {
      id: 20,
      text: `The functions $f$, $g$, $t$ are defined on the real numbers by

$$f_1(x) = \\cos x$$
$$f_2(x) = \\sin(\\cos x)$$
$$f_3(x) = \\cos(\\sin(\\cos x))$$
$$f_4(x) = \\sin(\\cos(\\sin(\\cos x)))$$
$$f_5(x) = \\cos(\\sin(\\cos(\\sin(\\cos x))))$$

where all numbers are taken to be in radians.

These functions have maximum values $m_1, m_2, m_3, m_4$ and $m_5$ respectively.

Which one of the following statements is true?`,
      options: [
        "$m_1, m_2, m_3, m_4$ and $m_5$ are all equal to 1",
        "$0 < m_5 < m_4 < m_3 < m_2 < m_1 = 1$",
        "$m_1 = m_3 = m_5 = 1$ and $0 < m_2 = m_4 < 1$",
        "$m_1 = m_3 = m_5 = 1$ and $0 < m_4 < m_2 < 1$",
        "$m_1 = m_3 = 1$ and $0 < m_2 = m_4 < 1$ and $0 < m_5 < 1$",
        "$m_1 = m_3 = 1$ and $0 < m_4 < m_2 < 1$ and $0 < m_5 < 1$"
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
      11: "/images/2022p2q11.png",
      18: "/images/2022p2q18.png",
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
          paperName: '2022 Paper 2',
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
            <h1 className="text-base font-normal pl-2 font-mono text-white">
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
  return <PaymentGate paperName="2022 Paper 2"><MainComponent /></PaymentGate>;
}