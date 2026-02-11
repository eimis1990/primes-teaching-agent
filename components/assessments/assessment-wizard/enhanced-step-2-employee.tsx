"use client"

import { useState, useEffect } from "react"
import { Users, UserCheck } from "lucide-react"
import { EmployeeSelector } from "../employee-selector"
import type { WizardStep2Data, Employee } from "@/lib/types/assessments"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface EnhancedStep2EmployeeProps {
  data: WizardStep2Data
  onChange: (data: WizardStep2Data) => void
  onEmployeeSelect?: (employee: Employee | null) => void
}

export function EnhancedStep2Employee({ 
  data, 
  onChange, 
  onEmployeeSelect 
}: EnhancedStep2EmployeeProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  // Load employees list
  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((result) => {
        if (result.data) {
          setEmployees(result.data)
          // If employee_id is set, find and pass the full employee object
          if (data.employee_id) {
            const employee = result.data.find((e: Employee) => e.id === data.employee_id)
            setSelectedEmployee(employee || null)
            if (onEmployeeSelect) {
              onEmployeeSelect(employee || null)
            }
          }
        }
      })
      .catch(console.error)
  }, [])

  const handleSelectionChange = (employee_id: string | null) => {
    onChange({ ...data, employee_id: employee_id || "" })
    
    // Also pass the full employee object
    const employee = employees.find(e => e.id === employee_id)
    setSelectedEmployee(employee || null)
    if (onEmployeeSelect) {
      onEmployeeSelect(employee || null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-[#F34A23]" />
          Select Employee
        </h2>
        <p className="text-white/60 mt-1.5">
          Choose who will take this assessment
        </p>
      </div>

      <Separator className="bg-white/10" />

      {/* Employee Selection */}
      <div className="space-y-2.5 rounded-xl border border-white/[0.08] bg-[#23242a]/70 p-4 md:p-5">
        <Label className="text-white/80 text-sm flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-[#F34A23]" />
          Choose Recipient
        </Label>
        <p className="text-xs text-white/35">Assign this draft to one employee. You can create a new employee right here.</p>
        <EmployeeSelector
          selectedEmployeeId={data.employee_id}
          onSelectionChange={handleSelectionChange}
          onEmployeeCreated={(employee) => {
            setEmployees([...employees, employee])
            setSelectedEmployee(employee)
            onEmployeeSelect?.(employee)
          }}
        />
      </div>
    </div>
  )
}
