import "server-only";
import questionBank from "./question-bank.json";

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

export function getPaperQuestions(paperName) {
  const rawQuestions = questionBank[paperName];
  if (!rawQuestions) {
    throw new Error(`No source questions configured for ${paperName}`);
  }

  const normalizedQuestions = rawQuestions.map((question, index) => ({
    id: Number(question.id ?? index + 1),
    text: question.text ?? "",
    options: Array.isArray(question.options) ? question.options : [],
  }));

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
