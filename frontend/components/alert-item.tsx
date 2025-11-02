"use client"

interface Alert {
  id: string
  title: string
  severity: "critical" | "high" | "medium" | "low"
  timestamp: string
  description: string
}

interface AlertItemProps {
  alert: Alert
  isSelected: boolean
  onSelect: (alert: Alert) => void
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
}

const severityBadgeColors = {
  critical: "bg-red-500/30 text-red-300",
  high: "bg-orange-500/30 text-orange-300",
  medium: "bg-yellow-500/30 text-yellow-300",
  low: "bg-blue-500/30 text-blue-300",
}

export default function AlertItem({ alert, isSelected, onSelect }: AlertItemProps) {
  return (
    <div
      onClick={() => onSelect(alert)}
      className={`p-4 border-b border-border/30 transition-all hover:bg-white/5 cursor-pointer ${
        isSelected ? "bg-white/10 border-l-2 border-l-primary" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${severityBadgeColors[alert.severity]}`}>
          {alert.severity.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{alert.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.description}</p>
          <p className="text-xs text-muted-foreground/60 mt-2">{alert.timestamp}</p>
        </div>
      </div>
    </div>
  )
}
