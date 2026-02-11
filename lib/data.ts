export interface Project {
  id: string
  title: string
  clipCount: number
  createdAt: string
  images: string[]
  isGenerating?: boolean
  progress?: number
  eta?: string
  isFailed?: boolean
}

export const projects: Project[] = []
