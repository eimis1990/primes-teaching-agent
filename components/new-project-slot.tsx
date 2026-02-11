"use client"

import { useState, useEffect, useRef } from "react"

interface NewProjectSlotProps {
  onClick?: (name: string) => void
}

export function NewProjectSlot({ onClick }: NewProjectSlotProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isInputVisible, setIsInputVisible] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const [displayedText, setDisplayedText] = useState("")
  const [isTypingComplete, setIsTypingComplete] = useState(false)
  const fullText = "Create new folder..."

  useEffect(() => {
    if (isHovered && !isInputVisible) {
      setDisplayedText("")
      setIsTypingComplete(false)
      let currentIndex = 0
      const interval = setInterval(() => {
        if (currentIndex <= fullText.length) {
          setDisplayedText(fullText.slice(0, currentIndex))
          currentIndex++
        } else {
          clearInterval(interval)
          setIsTypingComplete(true)
        }
      }, 60)
      return () => clearInterval(interval)
    } else if (!isInputVisible) {
      setDisplayedText("")
      setIsTypingComplete(false)
    }
  }, [isHovered, isInputVisible])

  useEffect(() => {
    if (isInputVisible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isInputVisible])

  const handleClick = () => {
    setIsInputVisible(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      onClick?.(inputValue.trim())
      setInputValue("")
      setIsInputVisible(false)
      setIsHovered(false)
    } else if (e.key === "Escape") {
      setIsInputVisible(false)
      setInputValue("")
    }
  }

  const handleBlur = () => {
    // Small delay to allow click events to register if clicking out
    setTimeout(() => {
      setIsInputVisible(false)
      setInputValue("")
    }, 200)
  }

  return (
    <div
      className="group relative cursor-pointer"
      onMouseEnter={() => !isInputVisible && setIsHovered(true)}
      onMouseLeave={() => !isInputVisible && setIsHovered(false)}
      onClick={!isInputVisible ? handleClick : undefined}
    >
      <div
        className="relative w-[288px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ perspective: "1200px" }}
      >
        <div
          className="absolute inset-0 z-20 flex items-start justify-center px-6 pt-12 transition-opacity duration-300 pointer-events-none"
          style={{ opacity: (isHovered && !isInputVisible) ? 1 : 0 }}
        >
          <p
            className="text-sm text-white/50 font-mono text-center"
            style={{
              lineHeight: "20px",
            }}
          >
            {displayedText}
            {isHovered && !isInputVisible && (
              <span
                className="inline-block w-[2px] h-[14px] bg-white/50 ml-0.5"
                style={{
                  verticalAlign: "text-bottom",
                  animation: isTypingComplete ? "blink 1s step-end infinite" : "none",
                }}
              />
            )}
          </p>
        </div>

        <style jsx>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}</style>

        <div
          className="relative z-0 rounded-2xl transition-all duration-500"
          style={{
            height: "224px",
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
            transform: isHovered || isInputVisible ? "rotateX(15deg)" : "rotateX(0deg)",
            background: "#1B1C20",
            border: "1px dashed rgba(255, 255, 255, 0.06)",
          }}
        ></div>

        <div
          className="absolute bottom-0 left-0 right-0 z-10 rounded-2xl overflow-hidden transition-all duration-500"
          style={{
            background: "#35383D",
            border: "1px dashed rgba(255, 255, 255, 0.06)",
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
            transform: isHovered || isInputVisible ? "rotateX(-25deg)" : "rotateX(0deg)",
          }}
        >
          <div className="relative py-4 px-4">
            {isInputVisible ? (
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder="Folder Name"
                className="w-full bg-transparent text-white font-semibold text-base outline-none placeholder:text-white/30"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 className="font-semibold text-white/70 text-base leading-snug line-clamp-2 min-h-[2.75rem] transition-colors duration-300 group-hover:text-white">
                New Project
              </h3>
            )}
          </div>
          <div className="relative h-[48px]">
            <div className="absolute inset-x-0 top-0 h-[1px] border-t border-dashed border-white/[0.04]" />
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <span className="text-[13px] text-white/40 transition-colors duration-300 group-hover:text-white/60">
                {isInputVisible ? "Press Enter to create" : "Create new folder"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
