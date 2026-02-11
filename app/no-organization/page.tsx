"use client"

import { motion } from "framer-motion"
import { AlertCircle, Mail, LogOut, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function NoOrganizationPage() {
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
                            className="mx-auto mb-6 w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center"
                        >
                            <AlertCircle className="w-10 h-10 text-red-500" />
                        </motion.div>
                        <CardTitle className="text-2xl font-bold text-white">
                            No Organization Access
                        </CardTitle>
                        <CardDescription className="text-white/60 text-base mt-3">
                            You don't have access to any organization
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-8 pb-8">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-[#F34A23]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Mail className="w-5 h-5 text-[#F34A23]" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium mb-1">Need Access?</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">
                                        To access this platform, you need to be invited by an organization administrator. 
                                        Please contact your organization to request an invitation.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 space-y-3">
                                <div className="flex items-start gap-3">
                                    <ArrowRight className="w-4 h-4 text-[#F34A23] mt-0.5 flex-shrink-0" />
                                    <p className="text-white/60 text-sm">
                                        Ask your administrator to send you an invite to their organization
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <ArrowRight className="w-4 h-4 text-[#F34A23] mt-0.5 flex-shrink-0" />
                                    <p className="text-white/60 text-sm">
                                        Once invited, sign in with the same email address to get access
                                    </p>
                                </div>
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
