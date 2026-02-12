"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { ArrowRight, AlertCircle, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const errorParam = searchParams.get('error')
        if (errorParam === 'no_organization') {
            setError('You don\'t belong to any organization. Please contact your administrator for access.')
        } else if (errorParam === 'pending_approval') {
            setError('Your account is pending approval. Please wait for your administrator to approve your access.')
        } else if (errorParam === 'account_suspended') {
            setError('Your account has been suspended. Please contact your administrator.')
        } else if (errorParam === 'auth_error') {
            setError('Unable to sign in. Please try again.')
        }
    }, [searchParams])

    const handleGoogleLogin = async () => {
        setIsLoading(true)
        setError(null)

        const supabase = createClient()
        const redirectUrl = typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback`
            : '/auth/callback'
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })

        if (error) {
            console.error('Error logging in:', error.message)
            setIsLoading(false)
            setError(error.message)
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-black selection:bg-[#F34A23] selection:text-white">
            {/* Background Effects */}
            <div className="absolute inset-0 w-full h-full">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#F34A23]/5 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#F34A23]/5 blur-[120px]" />
                <div 
                    className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[440px] relative z-10"
            >
                <Card className="border-white/5 bg-[#121214]/90 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-white/5">
                    <CardHeader className="text-center pb-4 pt-10">
                        <motion.div 
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                            className="mx-auto mb-6"
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-[#F34A23] to-[#ff6b4a] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F34A23]/20">
                                <div className="w-8 h-8 bg-white rounded-md grid grid-cols-2 gap-0.5 opacity-90">
                                    <div className="bg-[#F34A23] rounded-[2px]"></div>
                                    <div className="bg-[#F34A23] rounded-[2px]"></div>
                                    <div className="bg-[#F34A23] rounded-[2px]"></div>
                                    <div className="bg-[#F34A23] rounded-[2px]"></div>
                                </div>
                            </div>
                        </motion.div>
                        <CardTitle className="text-3xl font-bold text-white tracking-tight">
                            Welcome back
                        </CardTitle>
                        <CardDescription className="text-white/40 text-base mt-3">
                            Sign in to your account to continue
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-2 pb-8 px-8">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6"
                            >
                                <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="ml-2 flex items-start justify-between gap-2">
                                        <span className="text-sm">{error}</span>
                                        <button 
                                            onClick={() => setError(null)} 
                                            className="text-red-400/60 hover:text-red-400 flex-shrink-0"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </AlertDescription>
                                </Alert>
                            </motion.div>
                        )}

                        <Button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            size="lg"
                            className="w-full group relative bg-white hover:bg-[#F5F5F5] text-black font-semibold h-12 rounded-xl transition-all duration-300 active:scale-[0.98] shadow-lg shadow-white/5"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    <img 
                                        src="https://www.svgrepo.com/show/475656/google-color.svg" 
                                        alt="Google" 
                                        className="w-5 h-5 mr-3" 
                                    />
                                    <span>Continue with Google</span>
                                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-300" />
                                </>
                            )}
                        </Button>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-white/40">
                                All users sign in with Google
                            </p>
                        </div>
                    </CardContent>
                    
                    <CardFooter className="flex flex-col gap-4 pb-8 pt-6 px-8 border-t border-white/5">
                        <p className="text-xs text-center text-white/30 max-w-sm mx-auto leading-relaxed">
                            By continuing, you agree to our{' '}
                            <a href="#" className="underline hover:text-white/50 transition-colors">
                                Terms of Service
                            </a>
                            {' '}and{' '}
                            <a href="#" className="underline hover:text-white/50 transition-colors">
                                Privacy Policy
                            </a>
                        </p>
                    </CardFooter>
                </Card>

                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center mt-8 text-white/30 text-sm"
                >
                    Need help? <a href="mailto:support@example.com" className="text-[#F34A23] hover:text-[#ff6b4a] underline transition-colors">Contact support</a>
                </motion.p>
            </motion.div>
        </div>
    )
}
