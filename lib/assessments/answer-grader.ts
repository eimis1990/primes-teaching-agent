import OpenAI from "openai"
import type { GradeAnswerInput, GradingResult, QuestionOption } from "@/lib/types/assessments"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function gradeAnswer(input: GradeAnswerInput): Promise<GradingResult> {
  try {
    // For multiple choice and true/false, use deterministic grading
    if (input.question_type === "multiple_choice" && input.options && input.options.length > 0) {
      return gradeMultipleChoice(input)
    }

    if (input.question_type === "true_false") {
      return gradeTrueFalse(input)
    }

    // For open-ended and scenario questions, use AI grading
    return await gradeWithAI(input)
  } catch (error) {
    console.error("Error grading answer:", error)
    // Fallback to keyword matching
    return gradeWithKeywords(input)
  }
}

function gradeMultipleChoice(input: GradeAnswerInput): GradingResult {
  const options = input.options || []
  const correctOption = options.find((opt) => opt.isCorrect)

  if (!correctOption) {
    return {
      is_correct: false,
      score: 0,
      points_earned: 0,
      ai_feedback: "Unable to determine correct answer.",
      keywords_found: [],
      keywords_missing: [],
      confidence_score: 0,
    }
  }

  // Check if user selected the correct answer
  const userAnswer = input.user_answer.toLowerCase().trim()
  const correctText = correctOption.text.toLowerCase().trim()
  const correctId = correctOption.id.toLowerCase().trim()

  const isCorrect =
    userAnswer === correctText ||
    userAnswer === correctId ||
    userAnswer.includes(correctText) ||
    correctText.includes(userAnswer)

  return {
    is_correct: isCorrect,
    score: isCorrect ? 1 : 0,
    points_earned: 0, // Will be calculated by caller
    ai_feedback: isCorrect
      ? "Correct! Well done."
      : `Incorrect. The correct answer is: ${correctOption.text}`,
    keywords_found: isCorrect ? [correctOption.text] : [],
    keywords_missing: isCorrect ? [] : [correctOption.text],
    confidence_score: 1,
  }
}

function gradeTrueFalse(input: GradeAnswerInput): GradingResult {
  const userAnswer = input.user_answer.toLowerCase().trim()
  const correctAnswer = (input.correct_answer || "").toLowerCase().trim()

  const userSaysTrue = userAnswer === "true" || userAnswer === "t" || userAnswer === "yes"
  const userSaysFalse = userAnswer === "false" || userAnswer === "f" || userAnswer === "no"
  const correctIsTrue = correctAnswer === "true" || correctAnswer === "t" || correctAnswer === "yes"

  const isCorrect =
    (userSaysTrue && correctIsTrue) || (userSaysFalse && !correctIsTrue)

  return {
    is_correct: isCorrect,
    score: isCorrect ? 1 : 0,
    points_earned: 0,
    ai_feedback: isCorrect
      ? "Correct!"
      : `Incorrect. The correct answer is: ${correctIsTrue ? "True" : "False"}`,
    keywords_found: [],
    keywords_missing: [],
    confidence_score: 1,
  }
}

async function gradeWithAI(input: GradeAnswerInput): Promise<GradingResult> {
  const systemPrompt = `You are an expert educator evaluating a student's answer.

Question: ${input.question_text}
Question Type: ${input.question_type}
Expected Keywords/Concepts: ${input.expected_keywords.join(", ")}
${input.correct_answer ? `Reference Answer: ${input.correct_answer}` : ""}

Student's Answer: ${input.user_answer}

Evaluate the answer and provide your assessment in JSON format:
{
  "is_correct": boolean (true if the answer is substantially correct),
  "score": number (0.0 to 1.0, representing how well they answered),
  "feedback": string (constructive feedback for the student, 1-2 sentences),
  "keywords_found": array of strings (which expected concepts appear in their answer),
  "keywords_missing": array of strings (which expected concepts are missing),
  "confidence": number (0.0 to 1.0, your confidence in this grading)
}

Grading guidelines:
- For conceptual questions, focus on understanding rather than exact wording
- Give partial credit for partially correct answers
- Be encouraging but honest in feedback
- A score of 0.7 or above should be considered "correct"`

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: systemPrompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 500,
  })

  const result = JSON.parse(response.choices[0].message.content || "{}")

  return {
    is_correct: result.is_correct || result.score >= 0.7,
    score: result.score || 0,
    points_earned: 0,
    ai_feedback: result.feedback || "Unable to evaluate answer.",
    keywords_found: result.keywords_found || [],
    keywords_missing: result.keywords_missing || [],
    confidence_score: result.confidence || 0.5,
  }
}

function gradeWithKeywords(input: GradeAnswerInput): GradingResult {
  const answerLower = input.user_answer.toLowerCase()
  const keywords = input.expected_keywords || []

  const keywordsFound = keywords.filter((kw) =>
    answerLower.includes(kw.toLowerCase())
  )
  const keywordsMissing = keywords.filter(
    (kw) => !answerLower.includes(kw.toLowerCase())
  )

  const score = keywords.length > 0 ? keywordsFound.length / keywords.length : 0.5
  const isCorrect = score >= 0.6

  return {
    is_correct: isCorrect,
    score,
    points_earned: 0,
    ai_feedback: isCorrect
      ? "Your answer covers the key concepts."
      : "Your answer is missing some key concepts. Review the material and try again.",
    keywords_found: keywordsFound,
    keywords_missing: keywordsMissing,
    confidence_score: 0.6,
  }
}
