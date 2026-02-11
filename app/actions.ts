"use server"

export async function transcribeAudio(formData: FormData) {
    console.log('🎤 [transcribeAudio] Server action called')
    
    try {
        const file = formData.get("file")
        console.log('🎤 [transcribeAudio] File received:', {
            exists: !!file,
            type: file ? typeof file : 'undefined',
            constructor: file ? file.constructor.name : 'undefined'
        })
        
        if (!file) {
            console.error('🎤 [transcribeAudio] No file in formData')
            throw new Error("No file uploaded")
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            console.error('🎤 [transcribeAudio] No OpenAI API key configured')
            return { error: "OpenAI API Key not configured" }
        }
        console.log('🎤 [transcribeAudio] API key found, length:', apiKey.length)

        // Convert to Blob if needed
        let blob: Blob
        if (file instanceof Blob) {
            blob = file
        } else if (file instanceof File) {
            blob = file
        } else {
            console.error('🎤 [transcribeAudio] File is not a Blob or File:', typeof file)
            throw new Error("Invalid file type")
        }

        console.log('🎤 [transcribeAudio] Blob size:', blob.size, 'bytes')
        console.log('🎤 [transcribeAudio] Blob type:', blob.type)

        const body = new FormData()
        body.append("file", blob, "audio.webm")
        body.append("model", "whisper-1")
        // Don't specify language to allow auto-detection between English and Ukrainian
        // Add a prompt to guide the model to prefer English/Ukrainian over similar languages
        body.append("prompt", "The following is spoken in English or Ukrainian. Common words: hello, thank you, yes, no, привіт, дякую, так, ні.")

        console.log('🎤 [transcribeAudio] Sending request to OpenAI...')
        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            body,
        })

        console.log('🎤 [transcribeAudio] OpenAI response status:', response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('🎤 [transcribeAudio] OpenAI error response:', errorText)
            let errorData
            try {
                errorData = JSON.parse(errorText)
            } catch (e) {
                console.error('🎤 [transcribeAudio] Could not parse error as JSON')
            }
            throw new Error(errorData?.error?.message || errorText || "Transcription failed")
        }

        const data = await response.json()
        console.log('🎤 [transcribeAudio] Transcription successful, text length:', data.text?.length)
        return { text: data.text }

    } catch (error) {
        console.error('🎤 [transcribeAudio] Error:', error)
        const errorMessage = error instanceof Error ? error.message : "Failed to transcribe audio"
        console.error('🎤 [transcribeAudio] Error message:', errorMessage)
        return { error: errorMessage }
    }
}
