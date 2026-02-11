"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { motion } from "framer-motion"
import { ArrowLeft, Building2, Plus, X, Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function NewOrganizationPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    allowed_domains: [] as string[],
  })
  const [domainInput, setDomainInput] = useState("")

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug === "" ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : prev.slug
    }))
  }

  // Handle slug change
  const handleSlugChange = (slug: string) => {
    // Only allow lowercase letters, numbers, and hyphens
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setFormData(prev => ({ ...prev, slug: cleanSlug }))
  }

  // Add domain to allowed domains list
  const handleAddDomain = () => {
    const domain = domainInput.trim().toLowerCase()
    
    // Validate domain format
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/
    if (!domainRegex.test(domain)) {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid domain (e.g., example.com)",
        variant: "destructive",
      })
      return
    }

    // Check if domain already exists
    if (formData.allowed_domains.includes(domain)) {
      toast({
        title: "Domain already added",
        description: "This domain is already in the allowed list",
        variant: "destructive",
      })
      return
    }

    setFormData(prev => ({
      ...prev,
      allowed_domains: [...prev.allowed_domains, domain]
    }))
    setDomainInput("")
  }

  // Remove domain from list
  const handleRemoveDomain = (domain: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_domains: prev.allowed_domains.filter(d => d !== domain)
    }))
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter an organization name",
        variant: "destructive",
      })
      return
    }

    if (!formData.slug.trim()) {
      toast({
        title: "Slug required",
        description: "Please enter a URL slug",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization')
      }

      toast({
        title: "Organization created!",
        description: `${formData.name} has been successfully created`,
      })

      // Redirect to platform owner dashboard
      router.push('/platform-owner')
    } catch (error: any) {
      console.error('Error creating organization:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-8 px-6 md:px-12 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/platform-owner')}
            className="text-white/60 hover:text-white hover:bg-white/5 mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#F34A23] to-[#ff6b4a] rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Create Organization</h1>
              <p className="text-white/40 mt-1">Add a new organization to the platform</p>
            </div>
          </div>
        </div>

        <div className="h-[1px] bg-white/10 w-full mb-8" />

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={handleSubmit}>
            <Card className="border-white/5 bg-[#1B1C20]/90 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Organization Details</CardTitle>
                <CardDescription className="text-white/40">
                  Basic information about the organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Organization Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white text-sm font-medium">
                    Organization Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Acme Corporation"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#F34A23] focus:ring-[#F34A23]"
                    required
                  />
                  <p className="text-white/30 text-xs">
                    The full name of the organization
                  </p>
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-white text-sm font-medium">
                    URL Slug *
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-sm">yourapp.com/</span>
                    <Input
                      id="slug"
                      type="text"
                      placeholder="acme-corp"
                      value={formData.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#F34A23] focus:ring-[#F34A23]"
                      required
                    />
                  </div>
                  <p className="text-white/30 text-xs">
                    Lowercase letters, numbers, and hyphens only. Must be unique.
                  </p>
                </div>

                {/* Allowed Domains */}
                <div className="space-y-2">
                  <Label htmlFor="domain" className="text-white text-sm font-medium">
                    Allowed Email Domains (Optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="domain"
                      type="text"
                      placeholder="example.com"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddDomain()
                        }
                      }}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#F34A23] focus:ring-[#F34A23]"
                    />
                    <Button
                      type="button"
                      onClick={handleAddDomain}
                      variant="outline"
                      className="border-white/10 text-white hover:bg-white/5"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-white/30 text-xs">
                    Users with these email domains can automatically join this organization
                  </p>

                  {/* Domain List */}
                  {formData.allowed_domains.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-white/60 text-sm font-medium">Allowed Domains:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.allowed_domains.map((domain) => (
                          <div
                            key={domain}
                            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                          >
                            <Check className="w-3 h-3 text-green-500" />
                            <span>{domain}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDomain(domain)}
                              className="ml-1 text-white/40 hover:text-white/80 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/platform-owner')}
                className="border-white/10 text-white hover:bg-white/5"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#F34A23] to-[#ff6b4a] hover:from-[#E04420] hover:to-[#F34A23] text-white"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Organization'}
              </Button>
            </div>
          </form>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-6"
        >
          <Card className="border-white/5 bg-[#1B1C20]/90 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white text-sm">What happens next?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-white/60 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[#F34A23] mt-0.5">•</span>
                  <span>The organization will be created and ready to use</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#F34A23] mt-0.5">•</span>
                  <span>You can invite admins to manage this organization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#F34A23] mt-0.5">•</span>
                  <span>Users with allowed domains can sign up automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#F34A23] mt-0.5">•</span>
                  <span>Admins can then invite employees to the organization</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
