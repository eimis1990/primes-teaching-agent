"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { Plus, Edit2, Trash2, FileText } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useProjects } from "@/contexts/project-context"
import { QuestionEditor, type QuestionFormData } from "@/components/question-editor"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"

interface Question {
  id: string
  questionText: string
  questionType: string
  expectedKeywords: string[]
  difficulty: string
  points: number
}

interface QuestionBank {
  id: string
  title: string
  description: string | null
  questionCount: number
}

export default function QuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = use(params)
  const { user } = useAuth()
  const { getProject } = useProjects()
  const router = useRouter()
  const supabase = createClient()
  
  const project = getProject(topicId)
  
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([])
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [showQuestionEditor, setShowQuestionEditor] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Load question banks
  useEffect(() => {
    loadQuestionBanks()
  }, [topicId])
  
  // Load questions when a bank is selected
  useEffect(() => {
    if (selectedBank) {
      loadQuestions(selectedBank.id)
    }
  }, [selectedBank])
  
  const loadQuestionBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('question_banks')
        .select(`
          id,
          title,
          description,
          questions:questions(count)
        `)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const banks: QuestionBank[] = (data || []).map(bank => ({
        id: bank.id,
        title: bank.title,
        description: bank.description,
        questionCount: bank.questions?.[0]?.count || 0
      }))
      
      setQuestionBanks(banks)
      setLoading(false)
    } catch (error) {
      console.error('Error loading question banks:', error)
      // If error is an object with code '42P01' (undefined_table), it means migrations aren't applied
      if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === '42P01') {
         alert("Database tables not found. Please run the migration scripts.")
      }
      setLoading(false)
    }
  }
  
  const loadQuestions = async (bankId: string) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('question_bank_id', bankId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      setQuestions(data || [])
    } catch (error) {
      console.error('Error loading questions:', error)
    }
  }
  
  const createQuestionBank = async () => {
    if (!user) return
    
    const title = prompt('Enter question bank title:')
    if (!title) return
    
    try {
      const { data, error } = await supabase
        .from('question_banks')
        .insert({
          topic_id: topicId,
          user_id: user.id,
          title,
          description: null
        })
        .select()
        .single()
      
      if (error) throw error
      
      await loadQuestionBanks()
      setSelectedBank(data)
    } catch (error) {
      console.error('Error creating question bank:', error)
      alert('Failed to create question bank')
    }
  }
  
  const deleteQuestionBank = async (bankId: string) => {
    if (!confirm('Are you sure? This will delete all questions in this bank.')) return
    
    try {
      const { error } = await supabase
        .from('question_banks')
        .delete()
        .eq('id', bankId)
      
      if (error) throw error
      
      if (selectedBank?.id === bankId) {
        setSelectedBank(null)
        setQuestions([])
      }
      await loadQuestionBanks()
    } catch (error) {
      console.error('Error deleting question bank:', error)
      alert('Failed to delete question bank')
    }
  }
  
  const handleSaveQuestion = async (formData: QuestionFormData) => {
    if (!selectedBank || !user) return
    
    try {
      if (editingQuestion) {
        // Update existing question
        const { error } = await supabase
          .from('questions')
          .update({
            question_text: formData.questionText,
            question_type: formData.questionType,
            expected_keywords: formData.expectedKeywords,
            difficulty: formData.difficulty,
            points: formData.points
          })
          .eq('id', editingQuestion.id)
        
        if (error) throw error
      } else {
        // Create new question
        const { error } = await supabase
          .from('questions')
          .insert({
            question_bank_id: selectedBank.id,
            question_text: formData.questionText,
            question_type: formData.questionType,
            expected_keywords: formData.expectedKeywords,
            difficulty: formData.difficulty,
            points: formData.points,
            metadata: {}
          })
        
        if (error) throw error
      }
      
      await loadQuestions(selectedBank.id)
      await loadQuestionBanks() // Update counts
      setShowQuestionEditor(false)
      setEditingQuestion(null)
    } catch (error) {
      console.error('Error saving question:', error)
      throw error
    }
  }
  
  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return
    
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId)
      
      if (error) throw error
      
      if (selectedBank) {
        await loadQuestions(selectedBank.id)
        await loadQuestionBanks()
      }
    } catch (error) {
      console.error('Error deleting question:', error)
      alert('Failed to delete question')
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
  
  return (
    <SidebarLayout breadcrumbs={[
      { label: "Knowledge Base", href: "/knowledge-base" },
      { label: project.title, href: `/project/${topicId}` },
      { label: "Questions" }
    ]}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Questions</h1>
        <p className="text-sm text-white/40 mt-1">Question Banks & Examination</p>
      </div>
      
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Question Banks List */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Question Banks</h2>
              <button
                onClick={createQuestionBank}
                className="p-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            
            <div className="space-y-2">
              {loading ? (
                <p className="text-white/50 text-sm">Loading...</p>
              ) : questionBanks.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <p className="text-sm">No question banks yet</p>
                  <p className="text-xs mt-1">Create one to get started</p>
                </div>
              ) : (
                questionBanks.map(bank => (
                  <div
                    key={bank.id}
                    onClick={() => setSelectedBank(bank)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedBank?.id === bank.id
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">{bank.title}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteQuestionBank(bank.id)
                        }}
                        className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-white/50">
                      {bank.questionCount} {bank.questionCount === 1 ? 'question' : 'questions'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Questions List */}
          <div className="lg:col-span-2">
            {selectedBank ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{selectedBank.title}</h2>
                  <button
                    onClick={() => {
                      setEditingQuestion(null)
                      setShowQuestionEditor(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <Plus size={20} /> Add Question
                  </button>
                </div>
                
                <div className="space-y-4">
                  {questions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-lg">
                      <FileText size={48} className="mx-auto text-white/20 mb-4" />
                      <p className="text-white/50 mb-2">No questions yet</p>
                      <p className="text-sm text-white/40 mb-4">Add your first question to start building the exam</p>
                    </div>
                  ) : (
                    questions.map((question, index) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 bg-white/5 border border-white/10 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-purple-400 uppercase">
                                {question.questionType.replace('_', ' ')}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                question.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                question.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {question.difficulty}
                              </span>
                              <span className="text-xs text-white/50">
                                {question.points} {question.points === 1 ? 'point' : 'points'}
                              </span>
                            </div>
                            <p className="text-white/90 leading-relaxed">{question.questionText}</p>
                            {question.expectedKeywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {question.expectedKeywords.map((keyword, idx) => (
                                  <span key={idx} className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 ml-4">
                            <button
                              onClick={() => {
                                setEditingQuestion(question)
                                setShowQuestionEditor(true)
                              }}
                              className="p-2 rounded hover:bg-white/10 text-white/50 hover:text-white"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => deleteQuestion(question.id)}
                              className="p-2 rounded hover:bg-white/10 text-white/50 hover:text-red-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-white/50">
                <p>Select a question bank to view questions</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Question Editor Modal */}
      <AnimatePresence>
        {showQuestionEditor && (
          <QuestionEditor
            onSave={handleSaveQuestion}
            onClose={() => {
              setShowQuestionEditor(false)
              setEditingQuestion(null)
            }}
            initialData={editingQuestion ? {
              questionText: editingQuestion.questionText,
              questionType: editingQuestion.questionType as any,
              expectedKeywords: editingQuestion.expectedKeywords,
              difficulty: editingQuestion.difficulty as any,
              points: editingQuestion.points
            } : undefined}
          />
        )}
      </AnimatePresence>
    </SidebarLayout>
  )
}
