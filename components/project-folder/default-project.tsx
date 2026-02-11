"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import type { Project } from "@/lib/data"
import type { ImagePosition } from "./types"
import { SlotNumber } from "./slot-number"
import { MenuButton } from "./menu-button"
import { Sparkles } from "./sparkles"
import { DocumentPreview } from "./document-preview"
import { getProjectGradient, getProjectColor } from "./gradients"

// Rauno-style easing: smooth deceleration
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

const TRANSITION_DURATION = 0.3 // Declare TRANSITION_DURATION
const TRANSITION_EASE = EASE_OUT_EXPO // Declare TRANSITION_EASE

interface DefaultProjectProps {
  project: Project
  isHovered: boolean
  setIsHovered: (value: boolean) => void
  isGenerating: boolean
  generationComplete: boolean
  progress: number
  sparklesFading: boolean
  showImages: boolean
  showGeneratingFooter: boolean
  imagePositions: ImagePosition[]
  clipCount: number
  remainingEta: string
  formattedDate: string
  onRemove?: () => void
  onCancel?: () => void
  onRename?: () => void
}

export function DefaultProject({
  project,
  isHovered,
  setIsHovered,
  isGenerating,
  generationComplete,
  progress,
  sparklesFading,
  showImages,
  showGeneratingFooter,
  imagePositions,
  clipCount,
  remainingEta,
  formattedDate,
  onRemove,
  onCancel,
  onRename,
}: DefaultProjectProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isActive = (isHovered || isMenuOpen) && !isGenerating

  return (
    <div
      className={`group relative w-[288px] ${isGenerating ? "cursor-default" : "cursor-pointer"}`}
      style={{
        perspective: "1200px",
        zIndex: isActive ? 50 : 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isMenuOpen && setIsHovered(false)}
    >
      <div
        className="relative w-[288px]"
        style={{ perspective: "1200px" }}
      >
        {/* Back panel */}
        <motion.div
          className="relative z-0 rounded-2xl overflow-hidden"
          animate={{
            rotateX: isActive ? 15 : 0,
          }}
          transition={{
            rotateX: {
              type: "spring",
              stiffness: 200,
              damping: 25,
              mass: 0.8,
            },
          }}
          style={{
            height: "224px",
            background: getProjectGradient(project.id.toString()),
            border: "1px solid rgba(255, 255, 255, 0.06)",
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
          }}
        >
          {project.isGenerating && <Sparkles count={16} fading={sparklesFading} variant="generating" />}
          
          <div className="absolute inset-0 flex items-center justify-center">
            <DocumentPreview />
          </div>
        </motion.div>

        {/* Front panel */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-10 rounded-2xl overflow-hidden"
          animate={{
            rotateX: isActive ? -25 : 0,
            backgroundColor: "rgba(53, 56, 61, 0.8)",
          }}
          transition={{
            rotateX: {
              type: "spring",
              stiffness: 180,
              damping: 22,
              mass: 0.8,
            },
            backgroundColor: {
              duration: TRANSITION_DURATION,
              ease: TRANSITION_EASE,
            },
          }}
          style={{
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
          }}
        >
          <div className="relative py-4 px-4">
            <h3
              className={`font-semibold text-white text-base leading-snug line-clamp-2 min-h-[2.75rem] relative z-0 transition-colors duration-300`}
            >
              {project.title}
            </h3>
          </div>
          <div className="relative h-[48px]">
            {/* Top border */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-white/[0.04]" />
            
            {/* Progress bar - only show during active generation */}
            {isGenerating && progress < 100 && (
              <motion.div
                className="absolute top-0 left-0 h-[2px] bg-[#F34A23]"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            )}
            
            {/* Footer content - derive from showImages for reliability */}
            <div className="relative h-full">
              {isGenerating && !showImages ? (
                <motion.div
                  key="generating"
                  className="absolute inset-0 flex items-center justify-between px-2 pl-4"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8,
                    opacity: { duration: 0.15 },
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <motion.svg
                      className="w-3 h-3 text-white/60"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    >
                      <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
                    </motion.svg>
                    <span className="text-[13px] text-transparent bg-clip-text bg-gradient-to-r from-white/50 via-white/80 to-white/50 bg-[length:200%_100%] animate-shimmer">Generating</span>
                    {progress < 95 && <span className="text-[13px] text-white/50">{remainingEta}</span>}
                  </div>
                  <MenuButton project={project} onOpenChange={setIsMenuOpen} onRemove={onRemove} onCancel={onCancel} onRename={onRename} isVisible={true} />
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  className="absolute inset-0 flex items-center justify-between px-2 pl-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 18,
                    mass: 1,
                    opacity: { duration: 0.35, ease: "easeOut" },
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div style={{ color: getProjectColor(project.id.toString()) }}>
                      <SlotNumber value={clipCount} isSpinning={false} />
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: getProjectColor(project.id.toString()) }}>Documents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">{formattedDate}</span>
                    <MenuButton project={project} onOpenChange={setIsMenuOpen} onRemove={onRemove} onCancel={onCancel} onRename={onRename} isVisible={true} />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
