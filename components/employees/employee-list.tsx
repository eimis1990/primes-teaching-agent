"use client"

import { EmployeeCard } from "./employee-card"
import type { Employee } from "@/lib/types/assessments"

interface EmployeeListProps {
  employees: Employee[]
  onEdit: (employee: Employee) => void
  onDelete: (id: string) => void
}

export function EmployeeList({ employees, onEdit, onDelete }: EmployeeListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {employees.map((employee) => (
        <EmployeeCard
          key={employee.id}
          employee={employee}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
