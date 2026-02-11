"use client"

import { useState, useEffect } from "react"
import { EmployeeSelector } from "../employee-selector"
import type { WizardStep2Data, Employee } from "@/lib/types/assessments"

interface Step2EmployeeProps {
  data: WizardStep2Data
  onChange: (data: WizardStep2Data) => void
  onEmployeeSelect?: (employee: Employee | null) => void
}

export function Step2Employee({ data, onChange, onEmployeeSelect }: Step2EmployeeProps) {
  const [employees, setEmployees] = useState<Employee[]>([])

  // Load employees list
  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((result) => {
        if (result.data) {
          setEmployees(result.data)
          // If employee_id is set, find and pass the full employee object
          if (data.employee_id && onEmployeeSelect) {
            const employee = result.data.find((e: Employee) => e.id === data.employee_id)
            onEmployeeSelect(employee || null)
          }
        }
      })
      .catch(console.error)
  }, [])

  const handleSelectionChange = (employee_id: string | null) => {
    onChange({ ...data, employee_id: employee_id || "" })
    
    // Also pass the full employee object
    if (onEmployeeSelect) {
      const employee = employees.find(e => e.id === employee_id)
      onEmployeeSelect(employee || null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Select Employee</h3>
        <p className="text-white/40 text-sm">
          Choose which employee will receive this assessment. You can also create a new employee if needed.
        </p>
      </div>

      <EmployeeSelector
        selectedEmployeeId={data.employee_id}
        onSelectionChange={handleSelectionChange}
        onEmployeeCreated={(employee) => {
          setEmployees([...employees, employee])
          onEmployeeSelect?.(employee)
        }}
      />
    </div>
  )
}
