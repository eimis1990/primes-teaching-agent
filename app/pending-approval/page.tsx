"use client"

import { motion } from "framer-motion"
import { Clock, Mail, LogOut } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function PendingApprovalPage() {
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-black">
            {/* Background Effects */}
            <div className="absolute inset-0 w-full h-full">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#F34A23]/5 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#F34A23]/5 blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-[500px] relative z-10"
            >
                <Card className="border-white/5 bg-[#121214]/90 backdrop-blur-xl shadow-2xl ring-1 ring-white/5">
                    <CardHeader className="text-center pb-4 pt-10">
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                            className="mx-auto mb-6 w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center"
                        >
                            <Clock className="w-10 h-10 text-yellow-500" />
                        </motion.div>
                        <CardTitle className="text-2xl font-bold text-white">
                            Account Pending Approval
                        </CardTitle>
                        <CardDescription className="text-white/60 text-base mt-3">
                            Your account is waiting for administrator approval
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-8 pb-8">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-[#F34A23]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Mail className="w-5 h-5 text-[#F34A23]" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium mb-1">What happens next?</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">
                                        Your organization's administrator has been notified of your request. 
                                        You'll receive an email once your account has been approved.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <p className="text-white/40 text-sm">
                                    This usually takes 24-48 hours. If you have any questions, please contact your administrator.
                                </p>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="px-8 pb-8">
                        <Button
                            onClick={handleSignOut}
                            variant="outline"
                            className="w-full bg-transparent border-white/10 text-white hover:bg-white/5 hover:border-white/20"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    )
}
