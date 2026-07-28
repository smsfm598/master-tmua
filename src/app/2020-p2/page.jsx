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
  // TMUA 2020 Paper 2 questions
  const questionsRaw = [
    {
      id: 1,
      text: `Find the complete set of values of $k$ for which the line $y = x - 2$ crosses or touches the curve $y = x^2 + kx + 2$`,
      options: [
        "$-1 \\leq k \\leq 3$",
        "$-3 \\leq k \\leq 5$",
        "$-4 \\leq k \\leq 4$",
        "$k \\leq -1$ or $k \\geq 3$",
        "$k \\leq -3$ or $k \\geq 5$",
        "$k \\leq -4$ or $k \\geq 4$"
      ],
    },
    {
      id: 2,
      text: `Given that $\\tan \\theta = 2$ and $180° < \\theta < 360°$, find the value of $\\cos \\theta$`,
      options: [
        "$\\sqrt{3}$",
        "$-\\sqrt{3}$",
        "$\\frac{\\sqrt{3}}{2}$",
        "$-\\frac{\\sqrt{3}}{2}$",
        "$\\frac{\\sqrt{5}}{5}$",
        "$-\\frac{\\sqrt{5}}{5}$",
        "$\\frac{2\\sqrt{5}}{5}$",
        "$-\\frac{2\\sqrt{5}}{5}$"
      ],
    },
{
  id: 3,
  text: `A student makes the following claim:

$$\\text{For all integers } n\\text{, the expression } 4\\left(\\frac{9n+1}{2} - \\frac{3n-1}{2}\\right) \\text{ is divisible by 3.}$$

Here is the student's argument:

$$4\\left(\\frac{9n+1}{2} - \\frac{3n-1}{2}\\right) = 2\\left(2\\left(\\frac{9n+1}{2} - \\frac{3n-1}{2}\\right)\\right) \\quad \\text{  (I)}$$

$$= 2(9n + 1 - 3n - 1) \\quad \\text{  (II)}$$

$$= 2(6n) \\quad \\text{  (III)}$$

$$= 12n \\quad \\text{  (IV)}$$

$$= 3(4n)\\quad  \\text{  (V)}$$

$$\\text{which is always a multiple of 3.} \\quad \\text{  (VI)}$$

$$\\text{So the expression } 4\\left(\\frac{9n+1}{2} - \\frac{3n-1}{2}\\right) \\text{ is always divisible by 3.}$$`,
  options: [
    "The argument is correct.",
    "The argument is incorrect. There is an error in step (I).",
    "The argument is incorrect. There is an error in step (II).",
    "The argument is incorrect. There is an error in step (III).",
    "The argument is incorrect. There is an error in step (IV).",
    "The argument is incorrect. There is an error in step (V).",
    "The argument is incorrect. There is an error in step (VI)."
  ],
},
    {
      id: 4,
      text: `Consider the following statement:

Every positive integer $N$ that is greater than 6 can be written as the sum of two non-prime integers that are greater than 1.

Which of the following is/are counterexample(s) to this statement?

I. $N = 5$
II. $N = 7$
III. $N = 9$`,
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
      text: `Which one of the following shows the graph of

$y = \\frac{2^x}{1+2^x}$

(Dotted lines indicate asymptotes.)`,
      options: [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F"
      ],
    },
    {
      id: 6,
      text: `The function $f(x)$ is defined for all real values of $x$.

Which of the following conditions on $f(x)$ is/are necessary to ensure that

$$\\int_{-5}^{0} f(x) dx =\\int_{0}^{5} f(x) dx$$

Condition I: $f(x) = f(-x)$ for $-5 \\leq x \\leq 5$
Condition II: $f(x) = c$ for $-5 \\leq x \\leq 5$, where $c$ is a constant
Condition III: $f(x) = -f(-x)$ for $-5 \\leq x \\leq 5$`,
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
      text: `Consider the following conditions on a parallelogram $PQRS$, labelled anticlockwise:

I. length of $PQ =$ length of $QR$
II. The diagonal $PR$ intersects the diagonal $QS$ at right angles
III. $\\angle PQR = \\angle QRS$

Which of these conditions is/are individually sufficient for the parallelogram $PQRS$ to be a square?`,
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
      id: 8,
      text: `A student is asked to prove whether the following statement (*) is true or false:

(*) For all real numbers $a$ and $b$, $|a + b| < |a| + |b|$

The student's proof is as follows:

Statement (*) is false. A counterexample is $a = 3, b = 4$, as $|3 + 4| = 7$ and $|3| + |4| = 7$, but $7 < 7$ is false.

Which of the following best describes the student's proof?`,
      options: [
        "The statement (*) is true, and the student's proof is not correct.",
        "The statement (*) is false, but the student's proof is not correct: the counterexample is not valid.",
        "The statement (*) is false, but the student's proof is not correct: the student needs to give all the values of $a$ and $b$ where $|a + b| < |a| + |b|$ is false.",
        "The statement (*) is false, but the student's proof is not correct: the student should have instead stated that for all real numbers $a$ and $b$, $|a + b| \\leq |a| + |b|$.",
        "The statement (*) is false, and the student's proof is fully correct."
      ],
    },
    {
      id: 9,
      text: `A student wishes to evaluate the function $f(x) = x \\sin x$, where $x$ is in radians, but has a calculator that only works in degrees.

What could the student type into their calculator to correctly evaluate $f(4)$?`,
      options: [
        "$(\\pi \\times 4 \\div 180) \\times \\sin(4)$",
        "$(\\pi \\times 4 \\div 180)) \\times \\sin(\\pi \\times 4 \\div 180)$",
        "$4 \\times \\sin(\\pi \\times 4 \\div 180)$",
        "$(180 \\times 4 \\div \\pi) \\times \\sin(4)$",
        "$(180 \\times 4 \\div \\pi) \\times \\sin(180 \\times 4 \\div \\pi)$",
        "$4 \\times \\sin(180 \\times 4 \\div \\pi)$"
      ],
    },
    {
      id: 10,
      text: `The real numbers $a, b$ and $c$ satisfy both

$$0 < a + b < c + d$$

and

$$0 < a + c < b + d$$

Which of the following inequalities must be true?

$\\quad I \\quad a < d$
$\\quad II \\quad b < c$
$\\quad III \\quad a + b + c + d > 0$`,
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
      text: `A spiral line is drawn as shown.

This spiral pattern continues indefinitely.

Which one of the following points is not on the spiral line?`,
      options: [
        "$(99, 100)$",
        "$(99, -100)$",
        "$(-99, 100)$",
        "$(-99, -100)$",
        "$(100, 99)$",
        "$(100, -99)$",
        "$(-100, 99)$",
        "$(-100, -99)$"
      ],
    },
    {
      id: 12,
      text: `Which one of $A - F$ correctly completes the following statement?

Given that $a < b$ and $f(x) > 0$ for all $x$ with $a < x < b$, the trapezium rule produces an overestimate for $ \\int_{a}^{b} f(x) dx$`,
      options: [
        "... if $f'(x) > 0$ and $f''(x) < 0$ for all $x$ with $a < x < b$",
        "... only if $f'(x) > 0$ and $f''(x) < 0$ for all $x$ with $a < x < b$",
        "... if and only if $f'(x) > 0$ and $f''(x) < 0$ for all $x$ with $a < x < b$",
        "... if $f'(x) < 0$ and $f''(x) > 0$ for all $x$ with $a < x < b$",
        "... only if $f'(x) < 0$ and $f''(x) > 0$ for all $x$ with $a < x < b$",
        "... if and only if $f'(x) < 0$ and $f''(x) > 0$ for all $x$ with $a < x < b$"
      ],
    },
    {
      id: 13,
      text: `$f(x)$ is a function for which

$$\\int_{0}^{3} [f(x)]^2 dx + \\int_{0}^{3} f(x) dx = \\int_{0}^{1} f(x) dx$$

Which of the following claims about $f(x)$ is/are necessarily true?

$\\quad I \\quad f(x) \\leq 0$ for some $x$ with $1 \\leq x \\leq 3$
$\\quad II \\quad \\int_{0}^{3} f(x) dx \\leq \\int_{0}^{1} f(x) dx$`,
      options: [
        "neither of them",
        "I only",
        "II only",
        "I and II"
      ],
    },
    {
      id: 14,
      text: `An arithmetic sequence $T$ has first term $a$ and common difference $d$, where $a$ and $d$ are non-zero integers.

Property P is:

For some positive integer $m$, the sum of the first $m$ terms of the sequence is equal to the sum of the first $2m$ terms of the sequence.

For example, when $a = 11$ and $d = -2$, the sequence $T$ has property P, because:

$\\quad \\quad 11 + 9 + 7 + 5 = 11 + 9 + 7 + 5 + 3 + 1 + (-1) + (-3)$

i.e. the sum of the first 4 terms equals the sum of the first 8 terms.

Which of the following statements is/are true?

$\\quad I \\quad$ For $T$ to have property P, it is sufficient that $ad < 0$.
$\\quad II \\quad$ For $T$ to have property P, it is necessary that $d$ is even.`,
      options: [
        "neither of them",
        "I only",
        "II only",
        "I and II"
      ],
    },
    {
      id: 15,
      text: `Which one of the following is a necessary and sufficient condition for

$$\\sum_{k=1}^{n} \\sin\\left(\\frac{k\\pi}{3}\\right) = \\frac{\\sqrt{3}}{2}$$

to be true?`,
      options: [
        "$n = 1$",
        "$n$ is a multiple of 3",
        "$n$ is a multiple of 6",
        "$n$ is 1 more than a multiple of 3",
        "$n$ is 1 more than a multiple of 6",
        "$n$ is 1 more than a multiple of 6 or $n$ is 2 more than a multiple of 6"
      ],
    },
    {
  id: 16,
  text: `The Fundamental Theorem of Calculus (FTC) tells us that for any polynomial $f$:

$$\\frac{d}{dx}\\left(\\int_0^x f(t) dt\\right) = f(x)$$

A student calculates $\\frac{d}{dx}\\left(\\int_x^{2x} t^2 dt\\right)$ as follows:

(I)$ \\quad \\int_x^{2x} t^2 dt = \\int_0^{2x} t^2 dt - \\int_0^x t^2 dt$

(II) $ \\quad$ By FTC,$ \\frac{d}{dx}\\left(\\int_0^x t^2 dt\\right) = x^2$

(III)$  \\quad$ By FTC,$ \\frac{d}{dx}\\left(\\int_0^{2x} t^2 dt\\right) = (2x)^2 = 4x^2$

(IV)$ \\quad$ So$ \\frac{d}{dx}\\left(\\int_x^{2x} t^2 dt\\right) = 4x^2 - x^2$

(V)$ \\quad$ giving$ \\frac{d}{dx}\\left(\\int_x^{2x} t^2 dt\\right) = 3x^2$

Which of the following best describes the student's calculation?`,
  options: [
    "The calculation is completely correct.",
    "The calculation is incorrect, and the first error occurs on line (I).",
    "The calculation is incorrect, and the first error occurs on line (II).",
    "The calculation is incorrect, and the first error occurs on line (III).",
    "The calculation is incorrect, and the first error occurs on line (IV).",
    "The calculation is incorrect, and the first error occurs on line (V)."
  ],
},
    {
      id: 17,
      text: `A set of six distinct integers is split into two sets of three.

The first set of three integers has a mean of 10 and a median of 8.

The second set of three integers has a mean of 12 and a median of 9.

What is the smallest possible range of the set of all six integers?`,
      options: [
        "8",
        "10",
        "11",
        "12",
        "14",
        "15"
      ],
    },
    {
      id: 18,
      text: `In this question, $f(x) = ax^3 + bx^2 + cx + d$ and $g(x) = px^3 + qx^2 + rx + s$ are cubic polynomials.

If $f(x) - g(x) > 0$ for every real $x$, which of the following is/are necessarily true?

$\\quad I \\quad$ $a > p$
$\\quad II\\quad$ If $b = q$, then $c = r$
$\\quad III \\quad$ $d > s$`,
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
      text: `Nine people are sitting in the squares of a 3 by 3 grid, one in each square, as shown.

Two people are called neighbours if they are sitting in squares that share a side.

(People in diagonally adjacent squares, which only share a point in common, are not called neighbours.)

Each of the nine people in the grid is either a truth-teller who always tells the truth, or a liar who always lies.

Every person in the grid says "My neighbours are all liars".

Given only this information, what are the smallest number and the largest number of people who could be telling the truth?`,
      options: [
        "smallest: 1, largest: 4",
        "smallest: 2, largest: 4",
        "smallest: 2, largest: 5",
        "smallest: 3, largest: 4",
        "smallest: 3, largest: 5",
        "smallest: 4, largest: 4",
        "smallest: 4, largest: 5",
        "smallest: 5, largest: 5"
      ],
    },
    {
      id: 20,
      text: `$x$ is a real number and $f$ is a function.

Given that exactly one of the following statements is true, which one is it? `,
      options: [
        "$x \\geq 0$ only if $f(x) < 0$",
        "$x < 0$ if $f(x) \\geq 0$",
        "$x \\geq $ only if $f(x) \\geq 0$",
        "$f(x) < 0$ if $x < 0$",
        "$f(x) \\geq 0$ only if $x ≥ 0$",
        "$f(x) ≥ 0$ if and only if $x < 0$"
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
      5: "/images/2020p2q5.png",
      7: "/images/2020p2q7.png",
      11: "/images/2020p2q11.png",
      19: "/images/2020p2q19.png",
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
          paperName: '2020 Paper 2',
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
  return <PaymentGate paperName="2020 Paper 2"><MainComponent /></PaymentGate>;
}