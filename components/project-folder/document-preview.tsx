import { motion } from "framer-motion"

export function DocumentPreview() {
  return (
    <div className="relative w-24 h-32">
      {/* Back document */}
      <div 
        className="absolute top-0 left-0 w-full h-full bg-white/40 rounded-lg transform -rotate-12 -translate-x-8 translate-y-2 border border-white/20"
        style={{ zIndex: 1 }}
      />
      {/* Middle document */}
      <div 
        className="absolute top-0 left-0 w-full h-full bg-white/70 rounded-lg transform -rotate-6 -translate-x-4 translate-y-1 border border-white/20"
        style={{ zIndex: 2 }}
      />
      {/* Front document */}
      <div 
        className="absolute top-0 left-0 w-full h-full bg-white rounded-lg shadow-sm border border-white/20 flex flex-col p-3 gap-2"
        style={{ zIndex: 3 }}
      >
        <div className="w-3/4 h-1.5 bg-black/10 rounded-full" />
        <div className="w-full h-1.5 bg-black/5 rounded-full" />
        <div className="w-5/6 h-1.5 bg-black/5 rounded-full" />
        <div className="w-full h-1.5 bg-black/5 rounded-full" />
        <div className="w-2/3 h-1.5 bg-black/5 rounded-full" />
      </div>
    </div>
  )
}
