import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import type { DifficultyLevel, GeneratedQuestion, QuestionType } from "@/lib/types/assessments"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

interface GenerateQuestionsInput {
  topic_ids: string[]
  difficulty: DifficultyLevel
  questions_per_topic: number
}

// POST /api/assessments/generate-questions - Generate AI questions based on topics (with streaming progress)
export async function POST(request: NextRequest) {
  try {
    // Check Gemini API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is not set in environment variables')
      return NextResponse.json({ 
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file" 
      }, { status: 500 })
    }

    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body: GenerateQuestionsInput = await request.json()

    // Validate
    if (!body.topic_ids || body.topic_ids.length === 0) {
      return NextResponse.json({ error: "At least one topic is required" }, { status: 400 })
    }

    const difficulty = body.difficulty || "medium"
    const questionsPerTopic = body.questions_per_topic || 5

    // Fetch documents from selected topics
    console.log('🔍 Fetching documents for topics:', body.topic_ids)
    console.log('👤 User ID:', user.id)
    
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, content, topic_id")
      .in("topic_id", body.topic_ids)
      .eq("user_id", user.id)

    if (docsError) {
      console.error("❌ Error fetching documents:", docsError)
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
    }

    console.log('📄 Raw documents response:', {
      count: documents?.length || 0,
      hasData: !!documents,
    })

    if (!documents || documents.length === 0) {
      console.error('❌ No documents found for topics:', body.topic_ids)
      console.error('   User ID:', user.id)
      console.error('   This might mean:')
      console.error('   1. No documents uploaded to these topics')
      console.error('   2. Documents belong to different user')
      console.error('   3. Topic IDs are incorrect')
      return NextResponse.json({
        error: "No documents found in selected topics. Please add content to your Knowledge Base first.",
      }, { status: 400 })
    }

    console.log(`📚 Found ${documents.length} documents across ${body.topic_ids.length} topics`)
    
    // Log document details
    documents.forEach((doc, idx) => {
      const contentLength = doc.content?.length || 0
      const contentPreview = doc.content?.slice(0, 100) || '[empty]'
      console.log(`  ${idx + 1}. "${doc.title}" (Topic: ${doc.topic_id})`)
      console.log(`     Content: ${contentLength} chars - "${contentPreview}..."`)
    })

    // Group documents by topic
    const documentsByTopic: Record<string, typeof documents> = {}
    for (const doc of documents) {
      if (!documentsByTopic[doc.topic_id]) {
        documentsByTopic[doc.topic_id] = []
      }
      documentsByTopic[doc.topic_id].push(doc)
    }

    // Log documents per topic
    Object.entries(documentsByTopic).forEach(([topicId, docs]) => {
      console.log(`  📁 Topic ${topicId}: ${docs.length} documents`)
    })

    // Fetch topic names for better progress messages
    const { data: topics } = await supabase
      .from("projects")
      .select("id, title")
      .in("id", body.topic_ids)

    const topicMap = new Map(topics?.map(t => [t.id, t.title]) || [])

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const allQuestions: GeneratedQuestion[] = []

        try {
          const totalTopics = body.topic_ids.length

          for (let i = 0; i < body.topic_ids.length; i++) {
            const topicId = body.topic_ids[i]
            const topicName = topicMap.get(topicId) || `Topic ${i + 1}`
            const topicDocs = documentsByTopic[topicId] || []

            // Send progress update
            const progressData = {
              type: "progress",
              current: i + 1,
              total: totalTopics,
              topicName,
              topicId,
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`))

            if (topicDocs.length === 0) {
              console.warn(`⚠️ No documents found for topic ${topicId} (${topicName})`)
              // Send warning for topic with no documents
              const warningData = {
                type: "warning",
                message: `No documents found for ${topicName}. Skipping this topic.`,
                topicId,
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(warningData)}\n\n`))
              continue
            }

            console.log(`\n📖 Processing topic: ${topicName} (${topicDocs.length} documents)`)

            // Combine document content (limit to prevent token overflow)
            const combinedContent = topicDocs
              .map((doc) => {
                const content = doc.content || ''
                const title = doc.title || 'Untitled'
                return `Document: ${title}\n\n${content}`
              })
              .join("\n\n---\n\n")
              .slice(0, 30000) // Increased limit for Gemini
            
            console.log(`   📝 Combined content length: ${combinedContent.length} characters`)
            console.log(`   📋 Content preview: "${combinedContent.slice(0, 200)}..."`)
            
            if (combinedContent.length < 100) {
              console.warn(`⚠️ Very short content (${combinedContent.length} chars) - might not be enough for questions`)
            }

            try {
              const questions = await generateQuestionsForTopic(
                combinedContent,
                topicId,
                difficulty,
                questionsPerTopic
              )
              allQuestions.push(...questions)

              // Send success update for this topic
              const successData = {
                type: "topic_complete",
                topicName,
                topicId,
                questionsGenerated: questions.length,
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(successData)}\n\n`))
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : "Unknown error"
              console.error(`❌ Error generating questions for topic ${topicId} (${topicName}):`, error)
              console.error(`Error details:`, {
                topicId,
                topicName,
                difficulty,
                questionsPerTopic,
                contentLength: combinedContent.length,
                documentsCount: topicDocs.length,
                errorMessage,
              })
              
              // Send error update with more details
              const errorData = {
                type: "error",
                message: `Failed to generate questions for ${topicName}: ${errorMessage}`,
                topicId,
                details: errorMessage,
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
            }
          }

          // Send completion with all questions
          const completeData = {
            type: "complete",
            questions: allQuestions,
            total: allQuestions.length,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`))
        } catch (error) {
          console.error("Error in streaming generation:", error)
          const errorData = {
            type: "fatal_error",
            message: "Internal server error",
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (error) {
    console.error("Error in POST /api/assessments/generate-questions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function generateQuestionsForTopic(
  content: string,
  topicId: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<GeneratedQuestion[]> {
  const pointsMap = { easy: 5, medium: 10, hard: 15 }
  const points = pointsMap[difficulty]

  const prompt = `You are an expert educator. Create EXACTLY ${count} assessment questions from the content below.

CONTENT:
${content}

REQUIREMENTS:
1. Generate EXACTLY ${count} questions (not more, not less)
2. Difficulty: ${difficulty}
   - easy: Direct recall, definitions
   - medium: Understanding, relationships
   - hard: Analysis, scenarios
3. Mix question types: multiple_choice, true_false, open_ended
4. Each question MUST have ALL these fields

RETURN ONLY VALID JSON (no markdown, no explanations):
{
  "questions": [
    {
      "question_text": "Your question here?",
      "question_type": "multiple_choice",
      "options": [
        {"id": "a", "text": "Option A", "isCorrect": false},
        {"id": "b", "text": "Option B", "isCorrect": true},
        {"id": "c", "text": "Option C", "isCorrect": false},
        {"id": "d", "text": "Option D", "isCorrect": false}
      ],
      "correct_answer": "The correct answer text",
      "expected_keywords": ["keyword1", "keyword2"],
      "explanation": "Why this is correct",
      "difficulty": "${difficulty}",
      "points": ${points}
    }
  ]
}

For true_false type: options should be [], correct_answer should be "true" or "false"
For open_ended type: options should be [], correct_answer should be expected answer

Generate ${count} questions NOW (return ONLY the JSON):` 

  console.log(`\n🎯 Generating ${count} questions for topic ${topicId} at ${difficulty} difficulty...`)
  console.log(`📄 Content length: ${content.length} characters`)

  let responseContent
  try {
    // Use gemini-2.0-flash model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8000,
      },
    })
    
    console.log(`🤖 Calling Gemini API...`)
    const result = await model.generateContent(prompt)
    const response = await result.response
    responseContent = response.text()
    
    console.log(`📝 Raw AI response length: ${responseContent.length} characters`)
    console.log(`📋 Raw response preview:\n${responseContent.slice(0, 300)}...`)
    
    // Clean up response - remove markdown formatting
    let cleanedContent = responseContent.trim()
    
    // Remove markdown code blocks
    if (cleanedContent.includes('```json')) {
      const jsonMatch = cleanedContent.match(/```json\s*\n?([\s\S]*?)\n?```/)
      if (jsonMatch) {
        cleanedContent = jsonMatch[1].trim()
        console.log(`✂️ Extracted JSON from markdown block`)
      }
    } else if (cleanedContent.includes('```')) {
      const codeMatch = cleanedContent.match(/```\s*\n?([\s\S]*?)\n?```/)
      if (codeMatch) {
        cleanedContent = codeMatch[1].trim()
        console.log(`✂️ Extracted content from code block`)
      }
    }
    
    // Find JSON object
    const jsonStart = cleanedContent.indexOf('{')
    const jsonEnd = cleanedContent.lastIndexOf('}')
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1)
      console.log(`✂️ Extracted JSON object (${cleanedContent.length} chars)`)
    }
    
    responseContent = cleanedContent
    
  } catch (apiError) {
    console.error('❌ Gemini API Error:', apiError)
    const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    throw new Error(`Gemini API failed: ${errorMessage}`)
  }
  
  if (!responseContent || responseContent.trim() === "" || responseContent === "{}") {
    console.error('❌ Empty response from Gemini after cleaning')
    throw new Error('Gemini returned empty response')
  }
  
  console.log(`📝 Raw AI response length: ${responseContent.length} characters`)

  try {
    const parsed = JSON.parse(responseContent)
    console.log(`📦 Parsed response keys:`, Object.keys(parsed))
    
    // Extract questions array
    let questions = parsed.questions || []
    
    // If questions is not an array but parsed is, use parsed
    if (!Array.isArray(questions) && Array.isArray(parsed)) {
      questions = parsed
    }
    
    // If still not an array, wrap in array
    if (!Array.isArray(questions)) {
      questions = [questions]
    }

    console.log(`✅ Successfully extracted ${questions.length} questions (expected: ${count})`)

    if (questions.length === 0) {
      console.error('❌ No questions found in AI response:', responseContent.slice(0, 500))
      throw new Error("AI returned no questions")
    }

    if (questions.length !== count) {
      console.warn(`⚠️ Expected ${count} questions but got ${questions.length}`)
    }

    return questions.map((q: Record<string, unknown>, idx: number) => {
      const mapped = {
        question_text: String(q.question_text || ""),
        question_type: (q.question_type as QuestionType) || "open_ended",
        options: Array.isArray(q.options)
          ? q.options.map((opt: Record<string, unknown>, optIdx: number) => ({
              id: String(opt.id || `opt_${optIdx}`),
              text: String(opt.text || ""),
              isCorrect: Boolean(opt.isCorrect),
            }))
          : [],
        correct_answer: String(q.correct_answer || ""),
        expected_keywords: Array.isArray(q.expected_keywords)
          ? q.expected_keywords.map(String)
          : [],
        explanation: String(q.explanation || ""),
        difficulty: difficulty,
        points: points,
        source_chunk_text: content.slice(0, 500),
        topic_id: topicId,
      }
      
      console.log(`  ${idx + 1}. ${mapped.question_type}: ${mapped.question_text.slice(0, 60)}...`)
      
      return mapped
    })
  } catch (parseError) {
    console.error("❌ Error parsing AI response:", parseError)
    console.error("Response content:", responseContent.slice(0, 1000))
    throw new Error("Failed to parse AI response")
  }
}
