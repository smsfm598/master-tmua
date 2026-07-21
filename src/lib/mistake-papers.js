import "server-only";
import fs from "fs";
import path from "path";

const PAPER_SOURCE_FILES = {
  "Specimen Paper 1": "src/app/specimen-p1/page.jsx",
  "Specimen Paper 2": "src/app/specimen-p2/page.jsx",
  "Practice Paper 1": "src/app/practice-p1/page.jsx",
  "Practice Paper 2": "src/app/practice-p2/page.jsx",
  "2017 Paper 1": "src/app/2017-p1/page.jsx",
  "2017 Paper 2": "src/app/2017-p2/page.jsx",
  "2018 Paper 1": "src/app/2018-p1/page.jsx",
  "2018 Paper 2": "src/app/2018-p2/page.jsx",
  "2019 Paper 1": "src/app/2019-p1/page.jsx",
  "2019 Paper 2": "src/app/2019-p2/page.jsx",
  "2020 Paper 1": "src/app/2020-p1/page.jsx",
  "2020 Paper 2": "src/app/2020-p2/page.jsx",
  "2021 Paper 1": "src/app/2021-p1/page.jsx",
  "2021 Paper 2": "src/app/2021-p2/page.jsx",
  "2022 Paper 1": "src/app/2022-p1/page.jsx",
  "2022 Paper 2": "src/app/2022-p2/page.jsx",
  "2023 Paper 1": "src/app/2023-p1/page.jsx",
  "2023 Paper 2": "src/app/2023-p2/page.jsx",
};

const questionCache = new Map();

function parseWrongAnswers(rawWrongAnswers) {
  if (!rawWrongAnswers) {
    return [];
  }

  if (Array.isArray(rawWrongAnswers)) {
    return rawWrongAnswers;
  }

  if (typeof rawWrongAnswers === "string") {
    try {
      const parsed = JSON.parse(rawWrongAnswers);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to parse wrong_answers JSON:", error);
      return [];
    }
  }

  return [];
}

function extractQuestionsArrayLiteral(fileContents, paperName) {
  const match = fileContents.match(
    /const questionsRaw = (\[[\s\S]*?\]);\s*const questions\s*=/,
  );

  if (!match) {
    throw new Error(`Could not extract questionsRaw from ${paperName}`);
  }

  return match[1];
}

function evaluateQuestionsArray(arrayLiteral, paperName) {
  try {
    return Function(`"use strict"; return (${arrayLiteral});`)();
  } catch (error) {
    throw new Error(`Failed to evaluate questions for ${paperName}: ${error.message}`);
  }
}

export function getPaperQuestions(paperName) {
  if (questionCache.has(paperName)) {
    return questionCache.get(paperName);
  }

  const relativeFilePath = PAPER_SOURCE_FILES[paperName];

  if (!relativeFilePath) {
    throw new Error(`No source file configured for ${paperName}`);
  }

  const absoluteFilePath = path.join(process.cwd(), relativeFilePath);
  const fileContents = fs.readFileSync(absoluteFilePath, "utf8");
  const questionsArrayLiteral = extractQuestionsArrayLiteral(fileContents, paperName);
  const rawQuestions = evaluateQuestionsArray(questionsArrayLiteral, paperName);

  const normalizedQuestions = rawQuestions.map((question, index) => ({
    id: Number(question.id ?? index + 1),
    text: question.text ?? "",
    options: Array.isArray(question.options) ? question.options : [],
  }));

  questionCache.set(paperName, normalizedQuestions);
  return normalizedQuestions;
}

export function buildMistakePaperFromExam(examResult) {
  const score = Number(examResult?.score ?? 0);
  const totalQuestions = Number(examResult?.total_questions ?? 0);
  const wrongAnswers = parseWrongAnswers(examResult?.wrong_answers);

  if (totalQuestions > 0 && score <= 0) {
    return null;
  }

  if (wrongAnswers.length === 0) {
    return null;
  }

  const paperQuestions = getPaperQuestions(examResult.paper_name);
  const wrongAnswerMap = new Map(
    wrongAnswers.map((item) => [Number(item.questionNumber), item]),
  );

  const questions = paperQuestions
    .filter((question) => wrongAnswerMap.has(Number(question.id)))
    .map((question, index) => {
      const wrongAnswer = wrongAnswerMap.get(Number(question.id));

      return {
        id: index + 1,
        originalQuestionNumber: Number(question.id),
        text: question.text,
        options: question.options,
        correctAnswer: wrongAnswer?.correctAnswer ?? "",
        previousUserAnswer: wrongAnswer?.userAnswer ?? "",
      };
    });

  if (questions.length === 0) {
    return null;
  }

  return {
    id: examResult.id,
    paperName: examResult.paper_name,
    title: `${examResult.paper_name} Mistakes`,
    createdAt: examResult.created_at,
    questionCount: questions.length,
    questions,
  };
}

export function buildMistakePaperCardFromExam(examResult) {
  const score = Number(examResult?.score ?? 0);
  const totalQuestions = Number(examResult?.total_questions ?? 0);
  const wrongAnswers = parseWrongAnswers(examResult?.wrong_answers);

  if (totalQuestions > 0 && score <= 0) {
    return null;
  }

  if (wrongAnswers.length === 0) {
    return null;
  }

  return {
    id: examResult.id,
    paperName: examResult.paper_name,
    title: `${examResult.paper_name} Mistakes`,
    createdAt: examResult.created_at,
    questionCount: wrongAnswers.length,
  };
}
