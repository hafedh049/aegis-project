"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface AlertFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedSeverity: string | null
  onSeverityChange: (severity: string | null) => void
}

export default function AlertFilters({
  searchQuery,
  onSearchChange,
  selectedSeverity,
  onSeverityChange,
}: AlertFiltersProps) {
  const severities = ["critical", "high", "medium", "low"]

  return (
    <div className="px-4 py-3 border-b border-border space-y-3">
      <Input
        type="text"
        placeholder="Search alerts..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="bg-input border-border text-sm"
      />
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={selectedSeverity === null ? "default" : "outline"}
          onClick={() => onSeverityChange(null)}
          className="text-xs"
        >
          All
        </Button>
        {severities.map((severity) => (
          <Button
            key={severity}
            size="sm"
            variant={selectedSeverity === severity ? "default" : "outline"}
            onClick={() => onSeverityChange(severity)}
            className={`text-xs capitalize ${
              selectedSeverity === severity
                ? severity === "critical"
                  ? "bg-red-500/30 hover:bg-red-500/40"
                  : severity === "high"
                    ? "bg-orange-500/30 hover:bg-orange-500/40"
                    : severity === "medium"
                      ? "bg-yellow-500/30 hover:bg-yellow-500/40"
                      : "bg-blue-500/30 hover:bg-blue-500/40"
                : ""
            }`}
          >
            {severity}
          </Button>
        ))}
      </div>
    </div>
  )
}
