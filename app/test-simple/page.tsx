"use client"

export default function TestSimplePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">✅ Test Page Works!</h1>
        
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
            <p className="text-emerald-400">
              If you can see this page, Next.js routing is working.
            </p>
          </div>

          <div className="bg-[#1B1C20] border border-white/10 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Quick Links:</h2>
            <div className="space-y-2">
              <a href="/debug-auth" className="block px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-center">
                1. Debug Auth Page
              </a>
              <a href="/employee/assessments-simple" className="block px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-center">
                2. Simple Assessments (No RoleGuard)
              </a>
              <a href="/employee/assessments" className="block px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-center">
                3. Full Assessments (With RoleGuard)
              </a>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
            <h2 className="text-amber-400 font-semibold mb-3">📋 What to do:</h2>
            <ol className="space-y-2 text-white/80 text-sm list-decimal list-inside">
              <li>First, click <strong>"Debug Auth Page"</strong> and screenshot what you see</li>
              <li>Then, click <strong>"Simple Assessments"</strong> - this has NO auth guards</li>
              <li>Then, click <strong>"Full Assessments"</strong> - this has the RoleGuard</li>
              <li>Tell me which one works and which one fails</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
