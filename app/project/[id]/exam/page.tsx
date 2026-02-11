"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { Play, CheckCircle, XCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useProjects } from "@/contexts/project-context"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"

interface QuestionBank {
  id: string
  title: string
  questionCount: number
}

interface Question {
  id: string
  questionText: string
  questionType: string
  points: number
}

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = use(params)
  const { user } = useAuth()
  const { getProject } = useProjects()
  const router = useRouter()
  const supabase = createClient()
  
  const project = getProject(topicId)
  
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([])
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null)
  const [examSession, setExamSession] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, string>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<any>(null)
  
  useEffect(() => {
    loadQuestionBanks()
  }, [])
  
  const loadQuestionBanks = async () => {
    const { data } = await supabase
      .from('question_banks')
      .select(`
        id,
        title,
        questions:questions(count)
      `)
      .eq('topic_id', topicId)
    
    const banks = (data || []).map(b => ({
      id: b.id,
      title: b.title,
      questionCount: b.questions?.[0]?.count || 0
    }))
    
    setQuestionBanks(banks)
  }
  
  const startExam = async (bankId: string) => {
    if (!user) return
    
    // Create exam session
    const { data: session } = await supabase
      .from('exam_sessions')
      .insert({
        user_id: user.id,
        question_bank_id: bankId
      })
      .select()
      .single()
    
    if (!session) return
    
    // Load questions
    const { data: qs } = await supabase
      .from('questions')
      .select('id, question_text, question_type, points')
      .eq('question_bank_id', bankId)
    
    setExamSession(session.id)
    setQuestions(qs || [])
    setCurrentQuestionIndex(0)
  }
  
  const submitAnswer = async () => {
    const question = questions[currentQuestionIndex]
    const answer = answers.get(question.id) || ''
    
    if (!answer.trim()) {
      alert('Please provide an answer')
      return
    }
    
    setSubmitting(true)
    
    try {
      await fetch('/api/exam/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examSessionId: examSession,
          questionId: question.id,
          userAnswer: answer
        })
      })
      
      // Move to next question
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      } else {
        // Exam complete
        await completeExam()
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
      alert('Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }
  
  const completeExam = async () => {
    // Get results
    const { data: sessionData } = await supabase
      .from('exam_sessions')
      .select(`
        *,
        answers:exam_answers(
          is_correct,
          points_earned,
          ai_feedback
        )
      `)
      .eq('id', examSession)
      .single()
    
    if (sessionData) {
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
      const earnedPoints = sessionData.answers.reduce((sum: number, a: any) => sum + a.points_earned, 0)
      const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
      
      // Update session
      await supabase
        .from('exam_sessions')
        .update({
          completed_at: new Date().toISOString(),
          score,
          total_points: totalPoints
        })
        .eq('id', examSession)
      
      setResults({
        score,
        totalPoints,
        earnedPoints,
        answers: sessionData.answers
      })
    }
  }
  
  if (!project) {
    return (
      <SidebarLayout breadcrumbs={[
        { label: "Knowledge Base", href: "/knowledge-base" }
      ]}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-xl mb-4 text-white/60">Topic not found</h2>
            <button onClick={() => router.push("/knowledge-base")} className="px-4 py-2 bg-white text-black rounded-lg">
              Go to Knowledge Base
            </button>
          </div>
        </div>
      </SidebarLayout>
    )
  }
  
  // Results screen
  if (results) {
    return (
      <SidebarLayout breadcrumbs={[
        { label: "Knowledge Base", href: "/knowledge-base" },
        { label: project.title, href: `/project/${topicId}` },
        { label: "Exam Results" }
      ]}>
        <div>
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 ${
                results.score >= 70 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {results.score >= 70 ? (
                  <CheckCircle size={64} className="text-green-400" />
                ) : (
                  <XCircle size={64} className="text-red-400" />
                )}
              </div>
              <h1 className="text-4xl font-bold mb-2">{results.score.toFixed(1)}%</h1>
              <p className="text-white/60">
                {results.earnedPoints} / {results.totalPoints} points
              </p>
            </div>
            
            <div className="space-y-4 mb-8">
              {results.answers.map((answer: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-lg border ${
                  answer.is_correct 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <p className="text-sm text-white/80 mb-2">{answer.ai_feedback}</p>
                  <p className="text-xs text-white/50">
                    {answer.points_earned} / {questions[idx]?.points} points
                  </p>
                </div>
              ))}
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => router.push(`/project/${topicId}`)}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
              >
                Back to Topic
              </button>
              <button
                onClick={() => {
                  setResults(null)
                  setExamSession(null)
                  setAnswers(new Map())
                  setCurrentQuestionIndex(0)
                }}
                className="flex-1 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
              >
                Take Another Exam
              </button>
            </div>
          </div>
        </div>
      </SidebarLayout>
    )
  }
  
  // Exam in progress
  if (examSession && questions.length > 0) {
    const question = questions[currentQuestionIndex]
    const answer = answers.get(question.id) || ''
    
    return (
      <SidebarLayout breadcrumbs={[
        { label: "Knowledge Base", href: "/knowledge-base" },
        { label: project.title, href: `/project/${topicId}` },
        { label: "Exam" }
      ]}>
        <div>
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                <span className="text-sm text-white/50">{question.points} points</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-6">{question.questionText}</h3>
              <textarea
                value={answer}
                onChange={(e) => {
                  const newAnswers = new Map(answers)
                  newAnswers.set(question.id, e.target.value)
                  setAnswers(newAnswers)
                }}
                placeholder="Type your answer here..."
                rows={6}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
            
            <button
              onClick={submitAnswer}
              disabled={submitting || !answer.trim()}
              className="w-full px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : currentQuestionIndex === questions.length - 1 ? 'Submit Exam' : 'Next Question'}
            </button>
          </div>
        </div>
      </SidebarLayout>
    )
  }
  
  // Bank selection
  return (
    <SidebarLayout breadcrumbs={[
      { label: "Knowledge Base", href: "/knowledge-base" },
      { label: project.title, href: `/project/${topicId}` },
      { label: "Exam" }
    ]}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Exam</h1>
        <p className="text-sm text-white/40 mt-1">Start an Examination</p>
      </div>
      
      <div>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Choose a Question Bank</h2>
          <div className="grid gap-4">
            {questionBanks.map(bank => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={bank.id}
                className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => startExam(bank.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{bank.title}</h3>
                    <p className="text-sm text-white/50">{bank.questionCount} questions</p>
                  </div>
                  <Play size={24} className="text-purple-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
