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

function MainComponent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  // Add this function for navigation
  const handleReturnToDashboard = () => {
    router.push('/');
  };
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

  // TMUA 2023 Paper 2 questions
  const questionsRaw = [
    {
      id: 1,
      text: `Given that

$$\\frac{1}{\\sqrt{x}-6} - \\frac{1}{\\sqrt{x}+6} = \\frac{3}{11}$$

what is the value of $x$?`,
      options: [
        "$2\\sqrt{15}$",
        "$4\\sqrt{5}$",
        "$5\\sqrt{2}$",
        "$\\sqrt{58}$",
        "$50$",
        "$58$",
        "$60$",
        "$80$"
      ],
    },
    {
      id: 2,
      text: `Evaluate

$$\\int_9^{16} \\left(\\frac{1}{\\sqrt{x}} + \\sqrt{x}\\right)^2 dx - \\int_9^{16} \\left(\\frac{1}{\\sqrt{x}} - \\sqrt{x}\\right)^2 dx$$`,
      options: [
        "$0$",
        "$2$",
        "$4$",
        "$7$",
        "$14$",
        "$28$",
        "$75$",
        "$175$"
      ],
    },
        {
      id: 3,
      text: `Consider the claim:

For all positive real numbers $x$ and $y$,

$$\\sqrt{x^y} = x^{\\sqrt{y}}$$

Which of the following is/are a counterexample to the claim?

$\\quad I \\quad$ $x = 1, y = 16$
$\\quad II \\quad$ $x = 2, y = 8$
$\\quad III \\quad$ $x = 3, y = 4$`,
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
      text: `A student attempts to answer the following question.

$$\text{What is the largest number of consecutive odd integers that are all prime?}$$

The student's attempt is as follows:

$\\quad$I$\\quad$ There are two consecutive odd integers that are prime (for example: 17, 19).

$\\quad$II$\\quad$ Any three consecutive odd integers can be written in the form $n - 2, n, n + 2$ for some $n$.

$\\quad$III$\\quad$ If $n$ is one more than a multiple of 3, then $n + 2$ is a multiple of 3.

$\\quad$IV$\\quad$ If $n$ is two more than a multiple of 3, then $n - 2$ is a multiple of 3.

$\\quad$V$\\quad$ The only other possibility is that $n$ is a multiple of 3.

$\\quad$VI$\\quad$ In each case, one of the integers is a multiple of 3, so not prime.

$\\quad$VII$\\quad$ Therefore the largest number of consecutive odd integers that are all prime is two.

Which of the following best describes this attempt?`,
      options: [
        "It is completely correct.",
        "It is incorrect, and the first error is on line I.",
        "It is incorrect, and the first error is on line II.",
        "It is incorrect, and the first error is on line III.",
        "It is incorrect, and the first error is on line IV.",
        "It is incorrect, and the first error is on line V.",
        "It is incorrect, and the first error is on line VI.",
        "It is incorrect, and the first error is on line VII."
      ],
    },
    {
      id: 5,
      text: `Consider the two statements

$\\quad$R:$\\quad$ $k$ is an integer multiple of $\\pi$.
$\\quad$S:$\\quad$ $\\int_0^k \\sin 2x dx = 0$

Which of the following statements is true?`,
      options: [
        "R is necessary and sufficient for S.",
        "R is necessary but not sufficient for S.",
        "R is sufficient but not necessary for S.",
        "R is not necessary and not sufficient for S."
      ],
    },
       {
      id: 6,
      text: `Consider the following equation where $a$ is a real number and $a > 1$:

$$(*) \\quad a^x = x$$

Which of the following equations must have the same number of real solutions as $(*)$?

$\\quad I \\quad \\log_a x = x$
$\\quad II \\quad a^{2x} = x^2$
$\\quad III \\quad a^{2x} = 2x$`,
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
      id: 7,
      text: `The graph of the line $ax + by + c = 0$ is drawn, where $a$, $b$ and $c$ are real non-zero constants.

Which one of the following is a necessary but not sufficient condition for the line to have a positive gradient and a positive $y$-intercept?`,
      options: [
        "$\\frac{c}{b} > 0$ and $\\frac{a}{b} < 0$",
        "$\\frac{c}{b} < 0$ and $\\frac{a}{b} > 0$",
        "$a > b > c$",
        "$a < b < c$",
        "$a$ and $c$ have opposite signs",
        "$a$ and $c$ have the same sign"
      ],
    },
    {
      id: 8,
      text: `A student draws a triangle that is acute-angled or obtuse-angled but not right-angled.

The student counts the number of straight lines that divide the triangle into two triangles, at least one of which is right-angled.

Which of the following statements is/are true?

$\\quad I \\quad$ The student can draw a triangle for which there is exactly 1 such straight line.
$\\quad II \\quad$ The student can draw a triangle for which there are exactly 2 such straight lines.
$\\quad III \\quad$ The student can draw a triangle for which there are exactly 3 such straight lines.`,
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
      text: `Consider the following statement about a pentagon $P$:

$(*)$ If at least one of the interior angles in $P$ is $108°$, then all the interior angles in $P$ form an arithmetic sequence.

Which of the following is/are true?
$\\quad I \\quad$ The statement (*)
$\\quad II \\quad$ The contrapositive of (*)
$\\quad III \\quad$ The converse of (*)`,
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
      id: 10,
      text: `Here is an attempt to solve the inequality $x^4 - 2x^2 - 3 > 0$ by completing the square:

$$x^4 - 2x^2 - 3 > 0$$

$\\quad I \\quad$ if and only if $x^4 - 2x^2 + 1 < 4$
$\\quad II \\quad$ if and only if $(x^2 - 1)^2 < 4$
$\\quad III \\quad$ if and only if $-2 < x^2 - 1 < 2$
$\\quad IV \\quad$ if and only if $x^2 -1 < 0$
$\\quad V \\quad$ if and only if $x^2 < 3$
$\\quad VI \\quad$ if and only if $-\\sqrt{3} < x < \\sqrt{3}$

Which of the following statements is true?`,
      options: [
        "The argument is completely correct.",
        "The first error occurs in line I.",
        "The first error occurs in line II.",
        "The first error occurs in line III.",
        "The first error occurs in line IV.",
        "The first error occurs in line V.",
        "The first error occurs in line VI."
      ],
    },
    {
      id: 11,
      text: `In this question, $k$ is a positive integer.

Consider the following theorem:

$$\\text{If $2^k + 1$ is a prime, then $k$ is a power of $2$. $(*)$} $$

Which of the following statements, taken individually, is/are equivalent to $(*)$?

$\\quad I \\quad$ If $k$ is a power of $2$, then $2^k + 1$ is prime.
$\\quad II \\quad$ $2^k + 1$ is not prime only if $k$ is not a power of $2$.
$\\quad III \\quad$ A sufficient condition for $k$ to be a power of $2$ is that $2^k + 1$ is prime.`,
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
      id: 12,
      text: `In this question, $p$ is a real constant.

The equation $\\sin x \\cos^2 x = p^2 \\sin x$ has $n$ distinct solutions in the range $0 \\leq x \\leq 2\\pi$.
$\\quad I \\quad$ $n = 3$ is sufficient for $ p > 1$
$\\quad II \\quad$ $n = 7$ only if  $ -1<p<1$
Which of the following statements is/are true?`,
      options: [
        "none of them",
        "I only",
        "II only",
        "I and II only"
      ],
    },
    {
      id: 13,
      text: `Let $x$ be a real number.

Which one of the following statements is a sufficient condition for exactly three of the other four statements?`,
      options: [
        "$x \\geq 0$",
        "$x = 1$",
        "$x = 0$ or $x = 1$",
        "$x \\geq 0$ or $x \\leq 1$",
        "$x \\geq 0$ and $x \\leq 1$"
      ],
    },
    {
      id: 14,
      text: `Three lines are given by the equations:

$$ax + by + c = 0$$
$$bx + cy + a = 0$$
$$cx + ay + b = 0$$

where $a$, $b$ and $c$ are non-zero real numbers.

Which one of the following is correct?`,
      options: [
        "If two of the lines are parallel, then all three lines are parallel.",
        "If two of the lines are parallel, then the third is perpendicular to the other two.",
        "If two of the lines are parallel, then the third is parallel to $y = x$.",
        "If two of the lines are parallel, then the third is perpendicular to $y = x$.",
        "If two of the lines are perpendicular, then all three meet at a point.",
        "If two of the lines are perpendicular, then the third is parallel to $y = x$.",
        "If two of the lines are perpendicular, then the third is perpendicular to $y = x$."
      ],
    },
    {
      id: 15,
      text: `The base 10 number 0.03841 has the value

$$0 \\times 10^{-1} + 3 \\times 10^{-2} + 8 \\times 10^{-3} + 4 \\times 10^{-4} + 1 \\times 10^{-5} = 0.03841$$

Similarly, the base 2 number 0.01101 has the value

$$0 \\times 2^{-1} + 1 \\times 2^{-2} + 1 \\times 2^{-3} + 0 \\times 2^{-4} + 1 \\times 2^{-5} = \\frac{13}{32}$$

What is the value of the recurring base 2 number $0.\\overline{0}01\\overline{1} = 0.001100110011...$?`,
      options: [
        "$\\frac{1}{3}$",
        "$\\frac{1}{5}$",
        "$\\frac{1}{15}$",
        "$\\frac{2}{15}$",
        "$\\frac{4}{15}$",
        "$\\frac{3}{16}$",
        "$\\frac{5}{16}$",
        "$\\frac{6}{31}$"
      ],
    },
    {
      id: 16,
      text: `A sequence is defined by:

$$u_1 = a$$
$$u_2 = b$$
$$u_{n+1} = u_n + u_{n-1} \\text{ for } n \\geq 1$$

where $a$ and $b$ are positive integers. The highest common factor of $a$ and $b$ is $7$.

Which of the following statements must be true?

$\\quad I \\quad$ $u_{2023}$ is a multiple of 7

$\\quad II \\quad$ If $u_1$ is not a factor of $u_2$, then $u_1$ is not a factor of $u_n$ for any $n > 1$

$\\quad III \\quad$ The highest common factor of $u_1$ and $u_5$ is 7`,
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
      text: `The ceiling of $x$, written $\\lceil x \\rceil$, is defined to be the value of $x$ rounded up to the nearest integer.

For example: $\\lceil \\pi \\rceil = 4$, $\\lceil 2.1 \\rceil = 3$, $\\lceil 8 \\rceil = 8$

What is the value of the following integral?

$$\\int_0^{99} 2^{\\lceil x \\rceil} dx$$`,
      options: [
        "$2^{99}$",
        "$2^{99} - 1$",
        "$2^{99} - 2$",
        "$2^{100}$",
        "$2^{100} - 1$",
        "$2^{100} - 2$"
      ],
    },
    {
      id: 18,
      text: `The equation $x^4 + bx^2 + c = 0$ has four distinct real roots if and only if which of the following conditions is satisfied?`,
      options: [
        "$b^2 > 4c$",
        "$b^2 < 4c$",
        "$c > 0$ and $b > 2\\sqrt{c}$",
        "$c > 0$ and $b < -2\\sqrt{c}$",
        "$c < 0$ and $b < 0$",
        "$c < 0$ and $b > 0$"
      ],
    },
    {
      id: 19,
      text: `In this question, $f(x)$ is a non-constant polynomial, and $g(x) = x f'(x)$.

$f(x) = 0$ for exactly $M$ values of $x$.

$g(x) = 0$ for exactly $N$ values of $x$.

Which of the following statements is/are true?

$\\quad I \\quad$ It is possible that $M < N$

$\\quad II \\quad$ It is possible that $M = N$

$\\quad III \\quad$ It is possible that $M > N$`,
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
      id: 20,
      text: `Let $f$ be a polynomial with real coefficients.

The integral $I_{p,q}$ where $p < q$ is defined by

$$I_{p,q} = \\int_p^q (f(x))^2 - (f(|x|))^2 dx$$

Which of the following statements must be true?

$\\quad$ 1 $\\quad$ $I_{p,q} = 0$ only if $0 < p$

$\\quad$ 2 $\\quad$ $f'(x) < 0$ for all $x$ only if $I_{p,q} < 0$ for all $p < q < 0$

$\\quad$ 3 $\\quad$ $I_{p,q} > 0$ only if $p < 0$`,
      // ... existing code ...
    
      options: [
        "none of them",
        "1 only",
        "2 only",
        "3 only",
        "1 and 2 only",
        "1 and 3 only",
        "2 and 3 only",
        "1, 2 and 3"
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
      11: "/images/2023p2q11.png",
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
          paperName: '2023 Paper 2',
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

// Wrap MainComponent in Page export
export default function Page() {
  return <MainComponent />;
}