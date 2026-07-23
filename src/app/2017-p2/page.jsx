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
  
  // Handle return to dashboard navigation
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

  // TMUA 2017 Paper 2 questions
  const questionsRaw = [
    {
      id: 1,
      text: `Given that $y = \\frac{(1-3x)^2}{2x^{\\frac{3}{2}}}$, which one of the following is a correct expression for $\\frac{dy}{dx}$?`,
      options: [
        "$$\\frac{9}{4}x^{-\\frac{1}{2}} + \\frac{3}{2}x^{-\\frac{3}{2}} - \\frac{3}{4}x^{-\\frac{5}{2}}$$",
        "$$\\frac{9}{4}x^{-\\frac{1}{2}} - \\frac{3}{2}x^{-\\frac{3}{2}} + \\frac{3}{4}x^{-\\frac{5}{2}}$$",
        "$$\\frac{9}{4}x^{-\\frac{1}{2}} - \\frac{3}{2}x^{-\\frac{3}{2}} - \\frac{3}{4}x^{-\\frac{5}{2}}$$",
        "$$-\\frac{9}{4}x^{-\\frac{1}{2}} + \\frac{3}{2}x^{-\\frac{3}{2}} + \\frac{3}{4}x^{-\\frac{5}{2}}$$",
        "$$-\\frac{9}{4}x^{-\\frac{1}{2}} + \\frac{3}{2}x^{-\\frac{3}{2}} - \\frac{3}{4}x^{-\\frac{5}{2}}$$",
        "$$-\\frac{9}{4}x^{-\\frac{1}{2}} - \\frac{3}{2}x^{-\\frac{3}{2}} - \\frac{3}{4}x^{-\\frac{5}{2}}$$"
      ],
    },
    {
      id: 2,
      text: `$PQRS$ is a rectangle.

The coordinates of $P$ and $Q$ are $(0, 6)$ and $(1, 8)$ respectively.

The perpendicular to $PQ$ at $Q$ meets the $x$-axis at $R$.

What is the area of $PQRS$?`,
      options: [
        "$\\frac{5}{2}$",
        "$4\\sqrt{10}$",
        "$20$",
        "$8\\sqrt{10}$",
        "$40$"
      ],
    },
    {
      id: 3,
      text: `The first term of a geometric progression is $2\\sqrt{3}$ and the fourth term is $\\frac{9}{4}$.

What is the sum to infinity of this geometric progression?`,
      options: [
        "$-2 (2 - \\sqrt{3})$",
        "$4(2\\sqrt{3} - 3)$",
        "$\\frac{16(8\\sqrt{3} + 9)}{37}$",
        "$\\frac{4(2\\sqrt{3} - 3)}{7}$",
        "$\\frac{4(2\\sqrt{3} + 3)}{7}$",
        "$2(2 + \\sqrt{3})$",
        "$4(2\\sqrt{3} + 3)$"
      ],
    },
    {
      id: 4,
      text: `The following question appeared in an examination:

Given that $\\tan x = \\sqrt{3}$, find the possible values of $\\sin 2x$.

A student gave the following answer:

$\\tan x = \\sqrt{3}$ so $ x = 60°$ and $2x = 120°$.

Therefore $\\sin 2x = \\frac{\\sqrt{3}}{2}$.

Which one of the following statements is correct?`,
      options: [
        "$\\frac{\\sqrt{3}}{2}$ is the only possible value, and this is fully supported by the reasoning given in the student's answer.",
        "$\\frac{\\sqrt{3}}{2}$ is the only possible value, but the reasoning given should consider other possible values of $x$ for which $\\tan x = \\sqrt{3}$.",
        "$\\frac{\\sqrt{3}}{2}$ is the only possible value, but the reasoning given should consider other possible values of $2x$ for which $\\sin 2x = \\frac{\\sqrt{3}}{2}$.",
        "$\\frac{\\sqrt{3}}{2}$ is not the only possible value because the reasoning given should have considered other possible values of $x$ for which $\\tan x = \\sqrt{3}$.",
        "$\\frac{\\sqrt{3}}{2}$ is not the only possible value because the reasoning given should have considered other possible values of $x$ for which $\\sin 2x = \\frac{\\sqrt{3}}{2}$."
      ],
    },
    {
      id: 5,
      text: `Consider the following three statements:

  1. $10p^2 + 1$ and $10p^2 - 1$ are both prime when p is an odd prime.
  2. Every prime greater than 5 is of the form $6n + 1$ for some integer $n$.
  3. No multiple of 7 greater than 7 is prime.

The result $91 = 7 \\times 13$ can be used to provide a counterexample to which of the above statements?`,
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
    {
            id: 6,
      text: `A sequence $u_0, u_1, u_2, \\ldots$ is defined as follows:

$$u_0 = 1$$
$$u_n = \\int_0^1 4xu_{n-1} \\, dx \\text{ for } n \\geq 1$$

What is the value of $u_{1000}$?`,
      options: [
        "$2^{1000}$",
        "$4^{1000}$",
        "$\\frac{4}{1000!}$",
        "$\\frac{4}{1001!}$",
        "$\\frac{2^{1000}}{1000!}$",
        "$\\frac{4^{1000}}{1000!}$",
        "$\\frac{2^{1000}}{1001!}$",
        "$\\frac{4^{1000}}{1001!}$"
      ],
    },
    {
      id: 7,
      text: `The graphs of two functions are shown here:

   • $y = a^x$ is shown with a solid line, where $x$ is a positive real number
   • $y = f(x)$ is shown with a dashed line

Which of the following statements (1, 2, 3, 4) could be true?

  1 $\\quad$ $f(x) = b^x$ for some $b > a$
  2 $\\quad$ $f(x) = b^x$ for some $b < a$
  3 $\\quad$ $f(x) = a^{kx}$ for some $k > 1$
  4 $\\quad$ $f(x) = a^{kx}$ for some $k < 1$`,
      options: [
        "1 only",
        "2 only",
        "3 only",
        "4 only",
        "1 and 3 only",
        "1 and 4 only",
        "2 and 3 only",
        "2 and 4 only"
      ],
    },
    {
      id: 8,
      text: `Which one of the following numbers is smallest in value?`,
      options: [
        "$\\log_2 7$",
        "$(2^{-3} + 2^{-2})^{-1}$",
        "$2^{\\frac{\\pi}{3}}$",
        "$\\frac{1}{4{(\\sqrt{2}-1)}^3}$",
        "$4\\sin^{2}\\left(\\frac{\\pi}{4}\\right)$"
      ],
    },
    
    {
      id: 9,
      text: `Consider the following attempt to prove this true theorem:

  Theorem: $a^3 + b^3 = c^3$ has no solutions with $a$, $b$ and $c$ positive integers.

  Attempted proof:
  Suppose that there are positive integers $a$, $b$ and $c$ such that $a^3 + b^3 = c^3$.

  $ \\quad I \\quad $ \t\tWe have $a^3 = c^3 - b^3$.

  $ \\quad II \\quad $\t\tHence $a^3 = (c - b)(c^2 + cb + b^2)$.

  $ \\quad III \\quad $\t\tIt follows that $a = c - b$ and $a^2 = c^2 + cb + b^2$, since $a \\leqslant a^2$ and $c - b \\leqslant c^2 + cb + b^2$.

  $ \\quad IV \\quad $\t\tEliminating $a$, we have $(c - b)^2 = c^2 + cb + b^2$.

  $ \\quad V \\quad $\t\tMultiplying out, we have $c^2 - 2cb + b^2 = c^2 + cb + b^2$.

  $ \\quad VI \\quad $\t\tHence $3cb = 0$ so one of $b$ and $c$ is zero.

  But this is a contradiction to the original assumption that all of $a$, $b$ and $c$ are positive. It follows that the equation has no solutions.

Comment on this proof by choosing one of the following options:`,
      options: [
        "The proof is correct",
        "The proof is incorrect and the first mistake occurs on line I.",
        "The proof is incorrect and the first mistake occurs on line II.",
        "The proof is incorrect and the first mistake occurs on line III.",
        "The proof is incorrect and the first mistake occurs on line IV.",
        "The proof is incorrect and the first mistake occurs on line V.",
        "The proof is incorrect and the first mistake occurs on line VI."
      ],
    },
    {
      id: 10,
      text: `$f(x)$ is a function defined for all real values of $x$.

Which one of the following is a sufficient condition for $\\int_1^3 f(x) \\, dx = 0$?`,
      options: [
        "$f(2) = 0$",
        "$f(1) = f(3) = 0$",
        "$f(-x) = -f(x)$ for all $x$",
        "$f(x + 2) = -f(2 - x)$ for all $x$",
        "$f(x - 2) = -f(2 - x)$ for all $x$"
      ],
    },
    {
      id: 11,
      text: `The function $f(x)$ is increasing and $f(0) = 0$.

The positive constants $a$ and $b$ are such that $a < b$.

The area of the region enclosed by the curve $y = f(x)$, the $x$-axis and the lines $x = a$ and $x = b$ is denoted by $R$.

The function $g(x)$ is defined by $g(x) = f(x) + 2f(b)$.

Which of the following is an expression for the area enclosed by the curve $y = g(x)$, the $x$-axis and the lines $x = a$ and $x = b$?`,
      options: [
        "$R + (b - a)f(b)$",
        "$R + 2(b - a)f(b)$",
        "$R + 2f(b) - f(a)$",
        "$R + 2f(b)$",
        "$R + (f(b))^2$",
        "$R + (f(b))^2 - (f(a))^2$",
        "$R + 2(f(b) - f(a))f(b)$"
      ],
    },
    {
      id: 12,
      text: `The diagram shows the graphs of $y = sin2x$ and $y = cos2x$ for $-\\frac{\\pi}{2} < x < \\frac{\\pi}{2}$
      
      Which one of the following is not true?`,
      options: [
        "$\\cos 2x < \\sin 2x < \\tan x$ for some real number $x$ with $-\\frac{\\pi}{2} < x < \\frac{\\pi}{2}$",
        "$\\cos 2x < \\tan x < \\sin 2x$ for some real number $x$ with $-\\frac{\\pi}{2} < x < \\frac{\\pi}{2}$",
        "$\\sin 2x < \\cos 2x < \\tan x$ for some real number $x$ with $-\\frac{\\pi}{2} < x < \\frac{\\pi}{2}$",
        "$\\sin 2x < \\tan x < \\cos 2x$ for some real number $x$ with $-\\frac{\\pi}{2} < x < \\frac{\\pi}{2}$",
        "$\\tan x < \\sin 2x < \\cos 2x$ for some real number $x$ with $-\\frac{\\pi}{2} < x < \\frac{\\pi}{2}$",
        "$\\tan x < \\cos 2x < \\sin 2x$ for some real number $x$ with $-\\frac{\\pi}{2} < x < \\frac{\\pi}{2}$"
      ],
    },
    {
      id: 13,
      text: `The positive real numbers $a \\times 10^{-3}$, $b \\times 10^{-2}$ and $c \\times 10^{-1}$ are each in standard form, and $$(a \\times 10^{-3}) + (b \\times 10^{-2}) = (c \\times 10^{-1})$$.

Which of the following statements (I, II, III, IV) must be true?

  I \\quad $a > 9$
  II \\quad $b > 9$  
  III\\quad $a < c$
  IV \\quad $b < c$`,
      options: [
        "I only",
        "II only",
        "I and II only",
        "I and III only",
        "I and IV only",
        "II and III only",
        "II and IV only",
        "I, II, III and IV"
      ],
    },
    {
      id: 14,
      text: `The diagram below shows the graph of $y = x^2 - 2bx + c$. The vertex of this graph is at the point $P$.

Which one of the following could be the graph of $y = x^2 - 2Bx + c$, where $B > b$?`,
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
      id: 15,
      text: `The function $f$ is defined on the positive integers as follows:

$f(1) = 5$, and for $n \\geq 1$: $\\begin{cases} f(n + 1) = 3f(n) + 1 & \\text{if } f(n) \\text{ is odd} \\\\ f(n + 1) = \\frac{1}{2}f(n) & \\text{if } f(n) \\text{ is even} \\end{cases}$

The function $g$ is defined on the positive integers as follows:

$g(1) = 3$, and for $n \\geq 1$: $\\begin{cases} g(n + 1) = g(n) + 5 & \\text{if } g(n) \\text{ is odd} \\\\ g(n + 1) = \\frac{1}{2}g(n) & \\text{if } g(n) \\text{ is even} \\end{cases}$

What is the value of $f(1000) - g(1000)$?`,
      options: [
        "$-6$",
        "$-5$",
        "$1$",
        "$2$",
        "$4$",
        "$8$"
      ],
    },
    {
      id: 16,
      text: `Consider the following statement:

  ($\\star$) If $f(x)$ is an integer for every integer $x$, then $f'(x)$ is an integer for every integer $x$.

Which one of the following is a counterexample to ($\\star$)?`,
      options: [
        "$f(x) = \\frac{x^3 + x + 1}{4}$",
        "$f(x) = \\frac{x^4 + x^2 + x}{2}$",
        "$f(x) = \\frac{x^4 + x^3 + x^2 + x}{2}$",
        "$f(x) = \\frac{x^4 + 2x^3 + x^2}{4}$"
      ],
    },
    {
      id: 17,
      text: `A set $S$ of whole numbers is called stapled if and only if for every whole number $a$ which is in $S$ there exists a prime factor of $a$ which divides at least one other number
in $S$.

Let $T$ be a set of whole numbers. Which of the following is true if and only if $T$ is not stapled?`,
      options: [
        "For every number $a$ which is in $T$, there is no prime factor of $a$ which divides every other number in $T$.",
        "For every number $a$ which is in $T$, there is no prime factor of $a$ which divides at least one other number in $T$.",
        "For every number $a$ which is in $T$, there is a prime factor of $a$ which does not divide any other number in $T$.",
        "For every number $a$ which is in $T$, there is a prime factor of $a$ which does not divide at least one other number in $T$.",
        "There exists a number $a$ which is in $T$ such that there is no prime factor of $a$ which divides every other number in $T$.",
        "There exists a number $a$ which is in $T$ such that there is no prime factor of $a$ which divides at least one other number in $T$.",
        "There exists a number $a$ which is in $T$ such that there is a prime factor of $a$ which does not divide any other number in $T$.",
        "There exists a number $a$ which is in $T$ such that there is a prime factor of $a$ which does not divide at least one other number in $T$."
      ],
    },
    
    {
      id: 18,
      text: `Consider the following problem:

  Solve the inequality $\\left(\\frac{1}{4}\\right)^n < \\left(\\frac{1}{32}\\right)^{10}$, where $n$ is a positive integer.

A student produces the following argument:

$$\\left(\\frac{1}{4}\\right)^n < \\left(\\frac{1}{32}\\right)^{10} \\quad $$ 

$$\\log_{\\frac{1}{2}} \\left(\\frac{1}{4}\\right)^n < \\log_{\\frac{1}{2}} \\left(\\frac{1}{32}\\right)^{10} \\quad (I)$$

$$n \\log_{\\frac{1}{2}} \\left(\\frac{1}{4}\\right) < 10 \\log_{\\frac{1}{2}} \\left(\\frac{1}{32}\\right) \\quad (II)$$

$$n < \\frac{10 \\log_{\\frac{1}{2}} \\left(\\frac{1}{32}\\right)}{\\log_{\\frac{1}{2}} \\left(\\frac{1}{4}\\right)} \\quad (III)$$

$$n < \\frac{10 \\times 5}{2} = 25 \\quad (IV)$$ 

$$1 \\leq n \\leq 24 \\quad (V)$$

Which step (if any) in the argument is invalid?`,
      options: [
        "There are no invalid steps; the argument is correct",
        "Only step (I) is invalid; the rest are correct",
        "Only step (II) is invalid; the rest are correct",
        "Only step (III) is invalid; the rest are correct",
        "Only step (IV) is invalid; the rest are correct",
        "Only step (V) is invalid; the rest are correct"
      ],
    },
    {
      id: 19,
      text: `Which one of the following is a sufficient condition for the equation $x^3 - 3x^2 + a = 0$, where $a$ is a constant, to have exactly one real root?`,
      options: [
        "$a > 0$",
        "$a \\leq 0$",
        "$a \\geq 4$",
        "$a < 4$",
        "$|a| > 4$",
        "$|a| \\leq 4$",
        "$a = \\frac{9}{4}$",
        "$|a| = \\frac{3}{2}$"
      ],
    },
    {
      id: 20,
      text: `I have forgotten my 5-character computer password, but I know that it consists of the letters a, b, c, d, e in some order. When I enter a potential password into the computer, it tells me exactly how many of the letters are in the correct position.

When I enter abcde, it tells me that none of the letters are in the correct position. The same happens when I enter cdbea and eabdc.

Using the best strategy, how many further attempts must I make in order to guarantee that I can deduce the correct password?`,
      options: [
        "None: I can deduce it immediately",
        "One",
        "Two",
        "Three",
        "More than three"
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
      7: "/images/2017p2q7.png",
      12: "/images/2017p2q12.png",
      14: "/images/2017p2q14.png",
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
          paperName: '2017 Paper 2',
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
  return <PaymentGate paperName="2017 Paper 2"><MainComponent /></PaymentGate>;
}