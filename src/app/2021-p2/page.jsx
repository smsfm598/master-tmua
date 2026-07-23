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
  
  // TMUA 2021 Paper 2 questions
  const questionsRaw = [
    {
      id: 1,
      text: `Find the value of

$$\\int_1^4 \\left(3\\sqrt{x} + \\frac{4}{x^2}\\right) dx$$`,
      options: [
        "$-0.75$",
        "$7.125$",
        "$11$",
        "$17$",
        "$18$",
        "$21.875$",
        "$34.5$"
      ],
    },
    {
      id: 2,
      text: `$A(0,2)$ and $C(4,0)$ are opposite vertices of the square $ABCD$.

What is the equation of the straight line through $B$ and $D$?`,
      options: [
        "$y = -2x + 5$",
        "$y = -\\frac{1}{2}x - 3$",
        "$y = -\\frac{1}{2}x + 2$",
        "$y = x$",
        "$y = 2x - 3$",
        "$y = 2x + 2$"
      ],
    },
    {
      id: 3,
      text: `A student is chosen at random from a class. Each student is equally likely to be chosen.

Which of the following conditions is/are necessary for the probability that the student wears glasses to equal $\\frac{4}{15}$?

$\\quad I \\quad$ Exactly 11 students in the class do not wear glasses. 
$\\quad II \\quad$ The number of students in the class is divisible by 3.
$\\quad III \\quad$ The class contains 30 students, and 8 of them wear glasses.`,
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
      text: `Consider the following claim about positive integers $a$, $b$ and $c$:

$$\\text{If $a$ is a factor of $bc$, then $a$ is a factor of $b$ or $a$ is a factor of $c$.}$$

Which of the following provide(s) a counterexample to this claim?

$\\quad I \\quad$ $a = 5, b = 10, c = 20$
$\\quad II \\quad$ $a = 8, b = 4, c = 4$
$\\quad III \\quad$ $a = 6, b = 7, c = 12$`,
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
      id: 5,
      text: `On which line is the first error in the following argument?`,
      options: [
        "$\\sin^2 x + \\cos^2 x = 1$ for all values of $x$.",
        "Therefore $\\cos x = \\sqrt{1 - \\sin^2 x}$ for all values of $x$.",
        "Hence $1 + \\cos x = 1 + \\sqrt{1 - \\sin^2 x}$ for all values of $x$.",
        "Thus $(1 + \\cos x)^2 = \\left(1 + \\sqrt{1 - \\sin^2 x}\\right)^2$ for all values of $x$.",
        "Substituting $x = \\pi$ gives $0 = 4$."
      ],
    },
    {
      id: 6,
      text: `Consider the following two statements about the polynomial $f(x)$:

$\\quad P: \\quad$ $f(x) = 0$ for exactly three real values of $x$
$\\quad Q: \\quad$ $f'(x) = 0$ for exactly two real values of $x$

Which one of the following is correct?`,
      options: [
        "$P$ is necessary but not sufficient for $Q$",
        "$P$ is sufficient but not necessary for $Q$",
        "$P$ is necessary and sufficient for $Q$",
        "$P$ is not necessary and not sufficient for $Q$"
      ],
    },
    {
      id: 7,
      text: `A circle has equation $(x - 9)^2 + (y + 2)^2 = 4$

A square has vertices at $(1, 0)$, $(1, 2)$, $(-1, 2)$ and $(-1, 0)$.

A straight line bisects both the area of the circle and the area of the square.

What is the $x$-coordinate of the point where this straight line meets the $x$-axis?`,
      options: [
        "$2$",
        "$3$",
        "$4$",
        "$4.5$",
        "$5$",
        "$6$",
        "The straight line is not uniquely determined by the information given, so there is more than one possible point of intersection.",
        "There is no straight line that bisects both the area of the circle and the area of the square."
      ],
    },
    {
      id: 8,
      text: `Consider the following statement about the polynomial $p(x)$, where $a$ and $b$ are real numbers with $a < b$:

$\\quad (*) \\quad$ There exists a number $c$ with $a < c < b$ such that $p'(c) = 0$.

Which one of the following is true?`,
      options: [
        "The condition $p(a) = p(b)$ is necessary and sufficient for (*)",
        "The condition $p(a) = p(b)$ is necessary but not sufficient for (*)",
        "The condition $p(a) = p(b)$ is sufficient but not necessary for (*)",
        "The condition $p(a) = p(b)$ is not necessary and not sufficient for (*)"
      ],
    },
    {
      id: 9,
      text: `Consider the following statements about a polynomial $f(x)$:

$\\quad I \\quad$ $f(x) = px^3 + qx^2 + rx + s$, where $p \\neq 0$
$\\quad II \\quad$ There is a real number $t$ for which $f'(t) = 0$
$\\quad III \\quad$ There are two numbers $u$ and $v$ for which $f(u) f(v) < 0$

Which of these statements is/are sufficient for the equation $f(x) = 0$ to have a real solution?`,
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
      text: `The first seven terms of a sequence of positive integers are:

$$u_1 = 15$$
$$u_2 = 21$$
$$u_3 = 30$$
$$u_4 = 37$$
$$u_5 = 44$$
$$u_6 = 51$$
$$u_7 = 59$$

Consider the following statement about this sequence:

$$ \\text{$\\quad (\\star) \\quad$ If $n$ is a prime number, then $u_n$ is a multiple of 3 or $u_n$ is a multiple of 5.} $$

What is the smallest value of $n$ that provides a counterexample to (*)?`,
      options: [
        "$1$",
        "$2$",
        "$3$",
        "$4$",
        "$5$",
        "$6$",
        "$7$"
      ],
    },
    {
      id: 11,
      text: `A student attempts to solve the following problem, where $a$ and $b$ are non-zero real numbers:

Show that if $a^2 - 4b^3 \\geq 0$ then there exist real numbers $x$ and $y$ such that $a = xy(x+y)$ and $b = xy$.

Consider the following attempt:

$\\quad(x- y)^2 \\geq 0 \\quad$ (I)

$\\quad$ so $x^2 + y^2 - 2xy \\geq 0 \\quad$ (II)

$\\quad$ so $(x + y)^2 - 4xy \\geq 0 \\quad$ (III)

$\\quad$ so $x^2y^2(x + y)^2 - 4x^3y^3 \\geq 0 \\quad$ (IV)

$\\quad$ so $a^2 - 4b^3 \\geq 0 \\quad$ (V)


Which of the following best describes this attempt?`,
      options: [
        "It is completely correct",
        "It is incorrect, but it would be correct if written in the reverse order",
        "It is incorrect, but the student has correctly proved the converse",
        "It is incorrect because there is an error in line (II)",
        "It is incorrect because there is an error in line (III)",
        "It is incorrect because there is an error in line (IV)"
      ],
    },
    {
      id: 12,
      text: `Which of the following statements about polynomials $f$ and $g$ is/are true?

$\\quad I \\quad$ If $f(x) \\geq g(x)$ for all $x \\geq 0$, then $\\int_0^x f'(t) dt \\geq \\int_0^x g'(t) dt$ for all $x \\geq 0$
$\\quad II \\quad$ If $f(x) \\geq g(x)$ for all $x \\geq 0$, then $f'(x) \\geq g'(x)$ for all $x \\geq 0$
$\\quad III \\quad$ If $f'(x) \\geq g'(x)$ for all $x \\geq 0$, then $f(x) \\geq g(x)$ for all $x \\geq 0$`,
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
      id: 13,
      text: `A region $R$ in the $(x, y)$-plane is defined by the simultaneous inequalities

$$y - x < 3$$

$$y - x^2 < 1$$

Which of the following statements is/are true for every point in $R$?

$\\quad I \\quad$ $-1 < x < 2$
$\\quad II \\quad$ $(y - x)(y - x^2) < 3$
$\\quad III \\quad$ $y < 5$`,
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
      id: 14,
      text: `Consider the following simultaneous equations, where $p$ is a real number:

$$p2^x + \\log_2 y = 2$$

$$2^x + \\log_2 y = 1$$

What is the complete range of $p$ for which these simultaneous equations have a real solution $(x, y)$?`,
      options: [
        "$p < 1$",
        "$p \\neq 1$",
        "$p > 1$",
        "$p < 1$ or $p > 2$",
        "$p \\neq 1$ and $p < 2$",
        "$p > 1$ and $p < 2$",
        "$p > 2$",
        "All real values of $p$"
      ],
    },
    {
      id: 15,
      text: `A circle has equation

$$x^2 + ax + y^2 + by + c = 0$$

where $a$, $b$ and $c$ are non-zero real constants.

Which one of the following is a necessary and sufficient condition for the circle to be tangent to the $y$-axis?`,
      options: [
        "$a^2 = 4c$",
        "$b^2 = 4c$",
        "$\\frac{a}{2} = \\sqrt{\\frac{a^2 + b^2}{4} - c}$",
        "$\\frac{b}{2} = \\sqrt{\\frac{a^2 + b^2}{4} - c}$",
        "$-\\frac{a}{2} = \\sqrt{\\frac{a^2 + b^2}{4} - c}$",
        "$-\\frac{b}{2} = \\sqrt{\\frac{a^2 + b^2}{4} - c}$"
      ],
    },
    {
      id: 16,
      text: `$p$ and $q$ are real numbers, and the equation

$$x |x| = px + q$$

has exactly $k$ distinct real solutions for $x$.

Which one of the following is the complete list of possible values for $k$?`,
      options: [
        "$0, 1, 2$",
        "$0, 1, 2, 3$",
        "$0, 1, 2, 3, 4$",
        "$0, 2, 4$",
        "$1, 2, 3$",
        "$1, 2, 3, 4$"
      ],
    },
    {
      id: 17,
      text: `Consider the following functions defined for $x > 1$:

$$f(x) = \\log_2(\\log_2 \\sqrt{x})$$

$$g(x) = \\log_2(\\sqrt{\\log_2 x})$$

Which one of the following is true for all values of $x > 1$?`,
      options: [
        "$0 \\leq f(x) \\leq g(x)$ or $g(x) \\leq f(x) \\leq 0$",
        "$0 \\leq g(x) \\leq f(x)$ or $f(x) \\leq g(x) \\leq 0$",
        "$\\frac{1}{2} \\leq f(x) \\leq g(x)$ or $g(x) \\leq f(x) \\leq \\frac{1}{2}$",
        "$\\frac{1}{2} \\leq g(x) \\leq f(x)$ or $f(x) \\leq g(x) \\leq \\frac{1}{2}$",
        "$1 \\leq f(x) \\leq g(x)$ or $g(x) \\leq f(x) \\leq 1$",
        "$1 \\leq g(x) \\leq f(x)$ or $f(x) \\leq g(x) \\leq 1$"
      ],
    },
    {
      id: 18,
      text: `A student chooses two distinct real numbers $x$ and $y$ with $0 < x < y < 1$.

The student then attempts to draw a triangle $ABC$ with:

$$AB = 1$$
$$\\sin A = x$$
$$\\sin B = y$$

Which of the following statements is/are correct?

$\\quad I \\quad$ For some choice of $x$ and $y$, there is exactly one triangle the student could draw.
$\\quad II \\quad$ For some choice of $x$ and $y$, there are exactly two different triangles the student could draw.
$\\quad III \\quad$ For some choice of $x$ and $y$, there are exactly three different triangles the student could draw.

(Note that congruent triangles are considered to be the same.)`,
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
      id: 19,
      text: `The angle $\\theta$ can take any of the values $1°, 2°, 3°, \\ldots, 359°, 360°$.

For how many of these values of $\\theta$ is it true that

$$\\sin \\theta \\sqrt{1 + \\sin \\theta} \\sqrt{1 - \\sin \\theta} + \\cos \\theta \\sqrt{1 + \\cos \\theta} \\sqrt{1 - \\cos \\theta} = 0$$`,
      options: [
        "$0$",
        "$1$",
        "$2$",
        "$4$",
        "$93$",
        "$182$",
        "$271$",
        "$360$"
      ],
    },
    {
      id: 20,
      text: `A sequence of functions $f_1, f_2, f_3, \\ldots$ is defined by

$$f_1(x) = |x|$$

$$f_{n+1}(x) = |f_n(x) + x|\\quad \\text{ for } n \\geq 1$$

Find the value of

$$\\int_{-1}^1 f_{99}(x) dx$$`,
      options: [
        "$0$",
        "$0.5$",
        "$1$",
        "$49.5$",
        "$50$",
        "$99$",
        "$99.5$",
        "$100$"
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
      9: "/images/2021p2q9.png",
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
          paperName: '2021 Paper 2',
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
            <h1 className="text-xl font-semibold pl-2 text-white">
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
            <h1 className="text-xl font-semibold pl-2 text-white">
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
            <h1 className="text-xl font-semibold pl-2 text-white">
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
  return <PaymentGate paperName="2021 Paper 2"><MainComponent /></PaymentGate>;
}