import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ValidationResult {
  isCorrect: boolean
  score: number // 0-1
  feedback: string
  keywordsFound: string[]
  keywordsMissing: string[]
}

/**
 * Validate an answer using AI and keyword matching
 */
export async function validateAnswer(
  questionText: string,
  expectedKeywords: string[],
  userAnswer: string,
  questionType: string,
  points: number
): Promise<ValidationResult> {
  try {
    // Build system prompt based on question type
    let systemPrompt = `You are an expert educator evaluating student answers. 
Your task is to assess whether the student's answer is correct and provide constructive feedback.`

    if (questionType === 'true_false') {
      systemPrompt += `\n\nThis is a true/false question. Look for clear indication of true or false in the answer.`
    } else if (questionType === 'multiple_choice') {
      systemPrompt += `\n\nThis is a multiple choice question. Check if the answer matches one of the expected options.`
    } else if (questionType === 'scenario') {
      systemPrompt += `\n\nThis is a scenario-based question. Evaluate if the answer demonstrates practical understanding and application of concepts.`
    } else {
      systemPrompt += `\n\nThis is an open-ended question. Evaluate the completeness and accuracy of the answer.`
    }

    systemPrompt += `\n\nExpected key concepts/keywords: ${expectedKeywords.join(', ')}

Provide your assessment in the following JSON format:
{
  "isCorrect": true/false,
  "score": 0.0-1.0,
  "feedback": "specific feedback for the student",
  "keywordsFound": ["keyword1", "keyword2"],
  "keywordsMissing": ["keyword3"]
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Question: ${questionText}\n\nStudent Answer: ${userAnswer}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')

    return {
      isCorrect: result.isCorrect || false,
      score: result.score || 0,
      feedback: result.feedback || 'Unable to evaluate answer.',
      keywordsFound: result.keywordsFound || [],
      keywordsMissing: result.keywordsMissing || []
    }
  } catch (error) {
    console.error('Error validating answer:', error)
    
    // Fallback to simple keyword matching
    const answerLower = userAnswer.toLowerCase()
    const keywordsFound = expectedKeywords.filter(kw => 
      answerLower.includes(kw.toLowerCase())
    )
    const keywordsMissing = expectedKeywords.filter(kw => 
      !answerLower.includes(kw.toLowerCase())
    )
    
    const score = expectedKeywords.length > 0 
      ? keywordsFound.length / expectedKeywords.length 
      : 0.5
    
    return {
      isCorrect: score >= 0.6,
      score,
      feedback: 'AI validation failed. Score based on keyword matching.',
      keywordsFound,
      keywordsMissing
    }
  }
}

/**
 * Generate feedback for an exam session
 */
export interface ExamFeedback {
  overallScore: number
  totalPoints: number
  earnedPoints: number
  weakAreas: Array<{
    topic: string
    score: number
    recommendation: string
  }>
  strengths: string[]
  recommendations: string[]
}

export async function generateExamFeedback(
  answers: Array<{
    questionId: string
    questionText: string
    questionType: string
    difficulty: string
    userAnswer: string
    isCorrect: boolean
    pointsEarned: number
    totalPoints: number
  }>
): Promise<ExamFeedback> {
  try {
    const totalPoints = answers.reduce((sum, a) => sum + a.totalPoints, 0)
    const earnedPoints = answers.reduce((sum, a) => sum + a.pointsEarned, 0)
    const overallScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

    // Use AI to analyze patterns and generate recommendations
    const systemPrompt = `You are an educational expert analyzing exam results. 
Based on the student's performance, identify:
1. Weak areas where they struggled
2. Strengths they demonstrated
3. Specific recommendations for improvement

Provide your analysis in JSON format:
{
  "weakAreas": [{"topic": "topic name", "score": 0-100, "recommendation": "specific advice"}],
  "strengths": ["strength 1", "strength 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`

    const performanceSummary = answers.map(a => ({
      question: a.questionText,
      type: a.questionType,
      difficulty: a.difficulty,
      correct: a.isCorrect,
      score: a.totalPoints > 0 ? (a.pointsEarned / a.totalPoints) * 100 : 0
    }))

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Overall Score: ${overallScore.toFixed(1)}%\n\nPerformance Details:\n${JSON.stringify(performanceSummary, null, 2)}` 
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    })

    const analysis = JSON.parse(response.choices[0].message.content || '{}')

    return {
      overallScore,
      totalPoints,
      earnedPoints,
      weakAreas: analysis.weakAreas || [],
      strengths: analysis.strengths || [],
      recommendations: analysis.recommendations || []
    }
  } catch (error) {
    console.error('Error generating exam feedback:', error)
    
    // Fallback feedback
    const totalPoints = answers.reduce((sum, a) => sum + a.totalPoints, 0)
    const earnedPoints = answers.reduce((sum, a) => sum + a.pointsEarned, 0)
    const overallScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

    return {
      overallScore,
      totalPoints,
      earnedPoints,
      weakAreas: [],
      strengths: [],
      recommendations: ['Review the questions you got wrong and try to understand the concepts better.']
    }
  }
}
