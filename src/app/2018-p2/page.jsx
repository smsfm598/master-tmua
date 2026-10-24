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

  // TMUA 2018 Paper 2 questions
  const questionsRaw = [
    {
      id: 1,
      text: `The function f is given, for $x > 0$, by

$$f(x) = \\frac{x^3 - 4x}{2\\sqrt{x}}$$

Find the value of f'(4).`,
      options: [
        "3",
        "9",
        "9.5",
        "12",
        "39.5",
        "88"
      ],
    },
    {
      id: 2,
      text: `Find the value of the constant term in the expansion of

$$\\left(x^6 - \\frac{1}{x^2}\\right)^{12}$$`,
      options: [
        "-495",
        "-220",
        "-66",
        "66",
        "220",
        "495"
      ],
    },
    {
      id: 3,
      text: `Consider the following statement:

A car journey consists of two parts. In the first part, the average speed is $u \\text{ km/h}$ In the second part, the average speed is $v \\text{ km/h}$ Hence the average speed for the whole journey is $\\frac{1}{2}(u + v) \\text{ km/h}$


Which of the following examples of car journeys provide(s) a counterexample to the statement?


$\\quad I \\quad$ In the first part of the journey, the car travels at a constant speed of 50 km/h for 100 km. In the second part of the journey, the car travels at a constant speed of 40 km/h for 100 km.

$\\quad II \\quad$  In the first part of the journey, the car travels at a constant speed of 50 km/h for one hour. In the second part of the journey, the car travels at a constant speed of 40 km/h for one hour.

$\\quad III \\quad$  In the first part of the journey, the car travels at a constant speed of 50 km/h for 80 km. In the second part of the journey, the car travels at a constant speed of 40 km/h for 100 km.`,
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
      text: `The non-zero real number $c$ is such that the equation $\\cos x = c$ has two solutions for $0 < x < \\frac{3\\pi}{2}$.

How many solutions of the equation $\\cos^2 2x = c^2$ are there in the range $0 < x < \\frac{3\\pi}{2}$?`,
      options: [
        "2",
        "3",
        "4",
        "6",
        "7",
        "8"
      ],
    },
    {
      id: 5,
      text: `The two diagonals of the quadrilateral $Q$ are perpendicular.

Consider the following statements:

$\\quad I \\quad$ One of the diagonals of $Q$ is a line of symmetry of $Q$.
$\\quad II \\quad$ The midpoint of the sides of $Q$ are the vertices of a square.

Which of these statements is/are necessarily true for the quadrilateral $Q$?`,
      options: [
        "neither of them",
        "I only",
        "II only",
        "I and II"
      ],
    },
    {
      id: 6,
      text: `Which one of the following functions provides a counterexample to the statement:

if $f'(x) > 0$ for all real $x$, then $f(x) > 0$ for all real $x$?`,
      options: [
        "$f(x) = x^2 + 1$",
        "$f(x) = x^2 - 1$",
        "$f(x) = x^3 + x + 1$",
        "$f(x) = 1 - x$",
        "$f(x) = 2^x$"
      ],
    },
    {
      id: 7,
      text: `Sequence 1 is an arithmetic progression with first term 11 and common difference 3.

Sequence 2 is an arithmetic progression with first term 2 and common difference 5.

Some numbers that appear in Sequence 1 also appear in Sequence 2. Let $N$ be the $20$th such number.

What is the remainder when $N$ is divided by 7?`,
      options: [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6"
      ],
    },
    {
      id: 8,
      text: `The diagram shows an example of a mountain profile.

This consists of upstrokes which go upwards from left to right, and downstrokes which go downwards from left to right. The example shows has six upstrokes and six downstrokes.

A mountain profile of order $n$ consists of $n$ upstrokes and $n$ downstrokes, with the condition that the profile begins and ends at sea level and never goes below sea level (although it might reach sea level at any point). So the example shown is a mountain profile of order 6.
Mountain profiles can be coded by using U to indicate an upstroke and D to indicate a downstroke. The example shown has the code UDUUUDUDDUDD. A sequence of U’s and D’s obtained from a mountain profile in this way is known as a valid code.

Which of the following statements is/are true?

$\\quad I \\quad$ If a valid code is written in reverse order, the result is always a valid code.
$\\quad II \\quad$ If each U in a valid code is replaced by D and each D by U, the result is always a valid code.
$\\quad III \\quad$ If U is added at the beginning of a valid code and D is added at the end of the code, the result is always a valid code.`,
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
      id: 9,
      text: `Consider the following attempt to solve the equation $4x\\sqrt{2x - 1} = 10x - 5$.

$$4x\\sqrt{2x - 1} = 10x - 5 \\quad $$

$$4x\\sqrt{2x - 1} = 5(2x - 1) \\quad (I)$$

$$16x^2(2x - 1) = 25(2x - 1)^2 \\quad (II)$$

$$16x^2 = 25(2x - 1) \\quad (III)$$

$$16x^2 - 50x + 25 = 0 \\quad (IV)$$

$$(8x - 5)(2x - 5) = 0 \\quad (V)$$

$\\quad$ The solutions of the original equation are $x = \\frac{5}{8}$ and $x = \\frac{5}{2} \\quad (VI)$ .

Which one of the following is true?`,
      options: [
        "The solution is correct.",
        "Only one of $x = \\frac{5}{8}$ and $x = \\frac{5}{2}$ is correct and the error arises as a result of step (II).",
        "Only one of $x = \\frac{5}{8}$ and $x = \\frac{5}{2}$ is correct and the error arises as a result of step (III).",
        "Only one of $x = \\frac{5}{8}$ and $x = \\frac{5}{2}$ is correct and the error arises as a result of step (IV).",
        "There is another value of $x$ that satisfies the original equation and the error arises as a result of step (II).",
        "There is another value of $x$ that satisfies the original equation and the error arises as a result of step (III).",
        "There is another value of $x$ that satisfies the original equation and the error arises as a result of step (IV)."
      ],
    },
    {
      id: 10,
      text: `The function $f(x)$ is defined for all real numbers.

Consider the following three conditions, where $a$ is a real constant:

$\\quad I\\quad f(a - x) = f(a + x)$ for all real $x$
$\\quad II \\quad f(2a - x) = f(x)$ for all real $x$
$\\quad III \\quad f(a - x) = f(x)$ for all real $x$

Which of these conditions is/are necessary and sufficient for the graph of $y = f(x)$ to have reflection symmetry about the line $x = a$?`,
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
      id: 11,
      text: `Consider the equation $2^x = mx + c$, where $a$ and $c$ are real constants.

Which of the following statements is/are necessarily true?

$\\quad I \\quad$ The equation has a negative real solution only if $c > 1$.
$\\quad II \\quad$ The equation has two distinct real solutions if $c > 1$.
$\\quad III \\quad$ The equation has two distinct positive real solutions if and only if $c \\leq 1$.`,
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
      id: 12,
      text: `Consider the following statement:

For any positive integer $N$ there is a positive integer $K$ such that $N(Km + 1) - 1$ is not prime for any positive integer $n$.

Which one of the following is the negation of this statement?`,
      options: [
        "For any positive integer $N$ there is a positive integer $K$ such that there is a positive integer $m$ for which $N(Km + 1) - 1$ is prime.",
        "For any positive integer $N$ there is a positive integer $K$ such that there is a positive integer $m$ for which $N(Km + 1) - 1$ is not prime.",
        "For any positive integer $N$ there is a positive integer $K$ such that for any positive integer $m$, $N(Km + 1) - 1$ is not prime.",
        "For any positive integer $N$, any positive integer $K$ and any positive integer $m$, there is a positive integer $m$ for which $N(Km + 1) - 1$ is not prime.",
        "There is a positive integer $N$ such that for any positive integer $K$ there is a positive integer $n$ for which $N(Km + 1) - 1$ is not prime.",
        "There is a positive integer $N$ such that for any positive integer $K$ there is a positive integer $m$ for which $N(Km + 1) - 1$ is prime.",
        "There is a positive integer $N$ such that for any positive integer $K$ and for any positive integer $m$, $N(Km + 1) - 1$ is prime.",
        "There is a positive integer $N$ and a positive integer $K$ for which there is no positive integer $m$ for which $N(Km + 1) - 1$ is prime."
      ],
    },
    {
      id: 13,
      text: `The following is an attempted proof of the conjecture:

If $\\tan \\theta > 0$, then $\\sin \\theta + \\cos \\theta > 1$.

Suppose $\\tan \\theta > 0$, so in particular $\\cos \\theta \\neq 0$.

Since $\\tan \\theta = \\frac{\\sin \\theta}{\\cos \\theta}$, then $\\sin \\theta \\cos \\theta = \\tan \\theta \\cos^2 \\theta > 0$. $\\quad$(I)

It follows that $1 + 2 \\sin \\theta \\cos \\theta > 1$. $\\quad$ (II)

Therefore $\\sin^2 \\theta + 2 \\sin \\theta \\cos \\theta + \\cos^2 \\theta > 1$, $\\quad$ (III)

which factorises to give $(\\sin \\theta + \\cos \\theta)^2 > 1$. $\\quad$ (IV)

Therefore $\\sin \\theta + \\cos \\theta > 1$. $\\quad$ (V)

Which one of the following is the case?`,
      options: [
        "The proof is correct.",
        "The proof is incorrect, and the first error occurs in line (I).",
        "The proof is incorrect, and the first error occurs in line (II).",
        "The proof is incorrect, and the first error occurs in line (III).",
        "The proof is incorrect, and the first error occurs in line (IV).",
        "The proof is incorrect, and the first error occurs in line (V)."
      ],
    },
    {
      id: 14,
      text: `In the triangle $PQR$, $PR = 2$, $QR = p$ and $\\angle RPQ = 30°$.

What is the set of all the values of $p$ for which this information uniquely determines the length of $PQ$?`,
      options: [
        "$p = 1$",
        "$p = \\sqrt{3}$",
        "$1 \\leq p < 2$",
        "$\\sqrt{3} \\leq p < 2$",
        "$p = 1$ or $p \\geq 2$",
        "$p = \\sqrt{3}$ or $p \\geq 2$",
        "$p < 2$",
        "$p \\geq 2$"
      ],
    },
    {
      id: 15,
      text: `It is given that $f(x) = x^3 + 3gx^2 + 2$ where $g$ is a real constant.

The equation $f(x) = 0$ has 3 distinct real roots.

Which of the following statements is/are necessarily true?

        $\\quad I \\quad$ The equation $f(x) + 1 = 0$ has 3 distinct real roots.
        $\\quad II \\quad$ The equation $f(x + 1) = 0$ has 3 distinct real roots.
        $\\quad III \\quad$ The equation $f(-x) - 1 = 0$ has 3 distinct real roots.`,
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
      id: 16,
      text: `In this question, $x_1, x_2, x_3, \\ldots$ is an arithmetic progression, all of whose terms are integers.

Let $n$ be a positive integer. If the median of the first $n$ terms of the sequence is an integer, which of the following three statements must be true?

$\\quad I \\quad$ The median of the first $n + 2$ terms is an integer.
$\\quad II \\quad$ The median of the first $2n$ terms is an integer.
$\\quad III \\quad$ The median of $x_2, x_4, x_6, \\ldots, x_{2n}$ is an integer.`,
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
      text: `A positive integer is called a squaresum if and only if it can be written as the sum of the squares of two integers. For example, 61 and 9 are both squaresums since $61 = 5^2 + 6^2$ and $9 = 3^2 + 0^2$.

A prime number is called awkward if and only if it has a remainder of 3 when divided by 4. For example, 23 is awkward since $23 = 5 \\times 4 + 3$.

A (true) theorem due to Fermat states that:

A positive integer is a squaresum if and only if each of its awkward prime factors occurs to an even power in its prime factorisation.

It follows that $5 \\times 23^2$ is a squaresum, since 23 occurs to the power 2, but $5 \\times 23^3$ is not, since 23 occurs to the power 3.

Which one of the following statements is not true?`,
      options: [
        "Every square number is a squaresum.",
        "If $N$ and $M$ are squaresums, then so is $NM$.",
        "If $NM$ is a squaresum, then $N$ and $M$ are squaresums.",
        "If $N$ is not a squaresum, then $kN$ is a squaresum for some number $k$ which is a product of awkward primes."
      ],
    },
    {
      id: 18,
      text: `$f(x)$ is a polynomial function defined for all real $x$.

Which of the following is a necessary condition for the inequality

$$\\frac{f(a) + f(b)}{2} \\geq f\\left(\\frac{a + b}{2}\\right)$$

to be true for all real numbers $a$ and $b$ with $a < b$?`,
      options: [
        "$f(x) \\geq 0$ for all real $x$",
        "$f'(x) \\geq 0$ for all real $x$",
        "$f''(x) \\geq 0$ for all real $x$",
        "$f(x) \\leq 0$ for all real $x$",
        "$f'(x) \\leq 0$ for all real $x$",
        "$f''(x) \\leq 0$ for all real $x$"
      ],
    },
    {
      id: 19,
      text: `Three real numbers $x$, $y$ and $z$ satisfy $x > y > z > 1$.

Which one of the following statements must be true?`,
      options: [
        "$\\frac{2^{z+1}}{2^x} > \\frac{2^x + 2^z}{2^y}$",
        "$2 > \\frac{3^x + 3^z}{3^y}$",
        "$\\frac {2 \\times 5^x}{5^z} < \\frac{5^x + 5^z}{5^y}$",
        "$2 < \\frac{7^x + 7^z}{7^y}$"
      ],
    },
    {
      id: 20,
      text: `It is given that the equation $\\sqrt{x + p} + \\sqrt{x} = p$ has at least one real solution for $x$, where $p$ is a real constant.

What is the complete set of possible values for $p$?`,
      options: [
        "$p = 0$ or $p = 1$",
        "$p = 0$ or $p \\geq 1$",
        "$p \\geq -x$",
        "$p \\geq \\sqrt{x}$",
        "$p \\geq 0$",
        "$p \\geq 1$"
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
      8: "/images/2018p2q8.png",
      10: "/images/2018p2q10.png",

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
          paperName: '2018 Paper 2',
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
              Master TMUA
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
              Master TMUA
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
              Master TMUA
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
  return <PaymentGate paperName="2018 Paper 2"><MainComponent /></PaymentGate>;
}