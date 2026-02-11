"use client"

import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { RoleGuard } from "@/lib/auth/role-guard"
import { Toaster } from "sonner"
import { MessageSquare } from "lucide-react"

function EmployeeChatbotContent() {
  return (
    <SidebarLayout breadcrumbs={[{ label: "Chatbot" }]}>
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-[#1B1C20] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-6">
          <MessageSquare className="w-10 h-10 text-white/40" />
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">Chatbot</h1>
        <p className="text-white/40 text-center max-w-md">
          The AI chatbot feature is coming soon. You'll be able to ask questions about your training materials here.
        </p>
      </div>
    </SidebarLayout>
  )
}

export default function EmployeeChatbotPage() {
  return (
    <RoleGuard allowedRoles={["employee"]} redirectTo="/chat">
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#1B1C20",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#fff",
            borderRadius: "12px",
          },
        }}
      />
      <EmployeeChatbotContent />
    </RoleGuard>
  )
}
