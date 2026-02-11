import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface EvaluationResult {
  isCorrect: boolean
  pointsEarned: number
  feedback: string
  confidence: number // 0-1
}

/**
 * AI-powered answer evaluation using Gemini
 * Intelligently compares student answers with correct answers
 */
export async function evaluateAnswer(
  question: {
    question_text: string
    question_type: string
    correct_answer: string
    points: number
    options?: any
  },
  userAnswer: {
    answer_text?: string
    selected_option_id?: string
  }
): Promise<EvaluationResult> {
  try {
    // For multiple choice and true/false, do exact ID match
    if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
      // Try to match by ID first, then by text (more flexible)
      let isCorrect = false
      let correctOptionText = question.correct_answer || "Unknown"
      let userOptionText = userAnswer.answer_text || userAnswer.selected_option_id || "Unknown"
      
      if (Array.isArray(question.options) && question.options.length > 0) {
        // Find user's selected option
        const userOption = question.options.find((opt: any) => 
          opt.id === userAnswer.selected_option_id ||
          opt.text?.toLowerCase() === userAnswer.answer_text?.toLowerCase()
        )
        
        // Find correct option
        const correctOption = question.options.find((opt: any) => 
          opt.id === question.correct_answer ||
          opt.text?.toLowerCase() === question.correct_answer?.toLowerCase()
        )
        
        if (userOption && correctOption) {
          // Compare by ID if both have IDs
          if (userOption.id && correctOption.id) {
            isCorrect = userOption.id === correctOption.id
          } else {
            // Fall back to text comparison
            isCorrect = userOption.text?.toLowerCase() === correctOption.text?.toLowerCase()
          }
          
          correctOptionText = correctOption.text || correctOption.label || question.correct_answer
          userOptionText = userOption.text || userOption.label || userAnswer.answer_text || "Unknown"
        }
      } else {
        // No options array, do direct comparison
        isCorrect = userAnswer.selected_option_id === question.correct_answer ||
                   userAnswer.answer_text?.toLowerCase() === question.correct_answer?.toLowerCase()
      }
      
      if (isCorrect) {
        return {
          isCorrect: true,
          pointsEarned: question.points,
          feedback: "Correct!",
          confidence: 1.0
        }
      } else {
        return {
          isCorrect: false,
          pointsEarned: 0,
          feedback: `Incorrect. You selected "${userOptionText}", but the correct answer is "${correctOptionText}".`,
          confidence: 1.0
        }
      }
    }

    // For text questions, use AI evaluation
    if (question.question_type === "text" || question.question_type === "short_answer") {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

      const prompt = `You are an expert assessment evaluator. Evaluate if the student's answer is correct.

QUESTION:
${question.question_text}

CORRECT ANSWER:
${question.correct_answer}

STUDENT'S ANSWER:
${userAnswer.answer_text || "(No answer provided)"}

EVALUATION CRITERIA:
- The student's answer should convey the same meaning as the correct answer
- Minor wording differences are acceptable if the core concept is correct
- Spelling mistakes are acceptable if the meaning is clear
- Partial credit can be given for partially correct answers
- Maximum points: ${question.points}

Respond with a JSON object in this exact format:
{
  "isCorrect": true/false,
  "pointsEarned": number (0 to ${question.points}),
  "feedback": "Brief explanation of why the answer is correct/incorrect",
  "confidence": number (0.0 to 1.0, how confident you are in this evaluation)
}

Be fair and generous with partial credit when appropriate.`

      const result = await model.generateContent(prompt)
      const response = result.response.text()
      
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = response.trim()
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      }
      
      const evaluation = JSON.parse(jsonText)
      
      // Validate and sanitize the response
      return {
        isCorrect: evaluation.pointsEarned >= question.points * 0.7, // 70% or more = correct
        pointsEarned: Math.min(Math.max(0, evaluation.pointsEarned), question.points),
        feedback: evaluation.feedback || "Evaluated by AI",
        confidence: Math.min(Math.max(0, evaluation.confidence || 0.8), 1.0)
      }
    }

    // Fallback for unknown question types
    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: "Unable to evaluate this question type",
      confidence: 0
    }
  } catch (error) {
    console.error("Error evaluating answer with AI:", error)
    
    // Fallback to simple string comparison on error
    if (question.question_type === "text") {
      const isCorrect = userAnswer.answer_text?.toLowerCase().trim() === 
                       question.correct_answer?.toLowerCase().trim()
      return {
        isCorrect,
        pointsEarned: isCorrect ? question.points : 0,
        feedback: isCorrect ? "Correct!" : "Incorrect. AI evaluation failed, using exact match.",
        confidence: 0.5
      }
    }

    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: "Evaluation error occurred",
      confidence: 0
    }
  }
}

/**
 * Batch evaluate multiple answers
 */
export async function evaluateAnswers(
  questions: Array<{
    id: string
    question_text: string
    question_type: string
    correct_answer: string
    points: number
    options?: any
  }>,
  userAnswers: Array<{
    question_id: string
    answer_text?: string
    selected_option_id?: string
  }>
): Promise<Map<string, EvaluationResult>> {
  const results = new Map<string, EvaluationResult>()

  // Evaluate all answers (can be done in parallel for speed)
  const evaluations = await Promise.all(
    questions.map(async (question) => {
      const userAnswer = userAnswers.find(a => a.question_id === question.id)
      
      if (!userAnswer) {
        return {
          questionId: question.id,
          result: {
            isCorrect: false,
            pointsEarned: 0,
            feedback: "No answer provided",
            confidence: 1.0
          }
        }
      }

      const result = await evaluateAnswer(question, userAnswer)
      return { questionId: question.id, result }
    })
  )

  // Build results map
  for (const { questionId, result } of evaluations) {
    results.set(questionId, result)
  }

  return results
}
