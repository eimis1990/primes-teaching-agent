import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export const runtime = 'nodejs' // Need nodejs for PDFLoader

/**
 * POST /api/pdf/extract
 * Extract text from a PDF buffer using LangChain's PDFLoader
 */
export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null
  
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get the PDF buffer from request
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // LangChain's PDFLoader requires a file path, so we'll write to a temp file
    tempFilePath = join(tmpdir(), `pdf-${Date.now()}-${file.name}`)
    await writeFile(tempFilePath, buffer)
    
    console.log(`📄 Processing PDF: ${file.name} (${buffer.length} bytes)`)
    
    // Extract text using LangChain's PDFLoader
    const loader = new PDFLoader(tempFilePath, {
      splitPages: false // We want all text in one document
    })
    
    const docs = await loader.load()
    
    if (!docs || docs.length === 0) {
      return NextResponse.json(
        { 
          error: 'Could not extract text from PDF. The PDF might be empty, image-based, or encrypted.',
          text: '',
          numPages: 0
        },
        { status: 400 }
      )
    }
    
    // Combine all pages into one text
    const text = docs.map(doc => doc.pageContent).join('\n\n')
    const numPages = docs.length
    
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Could not extract text from PDF. The PDF might be image-based or encrypted.',
          text: '',
          numPages
        },
        { status: 400 }
      )
    }
    
    // Log extraction results
    console.log('✅ PDF Extraction Results:')
    console.log(`  - Pages: ${numPages}`)
    console.log(`  - Text length: ${text.length} characters`)
    console.log(`  - First 200 chars: "${text.substring(0, 200)}..."`)
    console.log(`  - Line breaks: ${(text.match(/\n/g) || []).length} single, ${(text.match(/\n\n/g) || []).length} double`)
    
    return NextResponse.json({
      success: true,
      text,
      numPages,
      metadata: docs[0]?.metadata || {}
    })
  } catch (error) {
    console.error('❌ Error extracting PDF text:', error)
    return NextResponse.json(
      { 
        error: 'Failed to extract text from PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath)
        console.log(`🗑️  Cleaned up temp file: ${tempFilePath}`)
      } catch (err) {
        console.error('Failed to delete temp file:', err)
      }
    }
  }
}
