"use client"

import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface SignInModalProps {
    isOpen: boolean
    onClose: () => void
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
    const handleGoogleLogin = async () => {
        const supabase = createClient()
        const redirectUrl = typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback`
            : '/auth/callback'
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
            },
        })

        if (error) {
            console.error('Error logging in:', error.message)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-sm bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 shadow-2xl"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/5"
                        >
                            <X size={16} />
                        </button>

                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                            <p className="text-white/60 text-sm">Sign in to sync your projects</p>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            className="group relative w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-200 text-black font-semibold py-3 px-6 rounded-xl transition-all active:scale-95"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                            <span>Continue with Google</span>
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
