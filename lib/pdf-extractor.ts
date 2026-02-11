import pdf from 'pdf-parse'

export interface PDFExtractionResult {
  text: string
  numPages: number
  info?: Record<string, any>
}

/**
 * Extract text content from a PDF buffer
 * @param buffer - PDF file as Buffer or Uint8Array
 * @returns Extracted text and metadata
 */
export async function extractTextFromPDF(
  buffer: Buffer | Uint8Array
): Promise<PDFExtractionResult> {
  try {
    // Convert Uint8Array to Buffer if needed
    const pdfBuffer = buffer instanceof Buffer ? buffer : Buffer.from(buffer)
    
    // Parse PDF
    const data = await pdf(pdfBuffer)
    
    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Extract text from a PDF file (for browser-uploaded files)
 * @param file - File object from browser
 * @returns Extracted text and metadata
 */
export async function extractTextFromPDFFile(file: File): Promise<PDFExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return await extractTextFromPDF(buffer)
  } catch (error) {
    console.error('Error extracting text from PDF file:', error)
    throw new Error(
      `Failed to extract text from PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
