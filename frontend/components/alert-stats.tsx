"use client"

interface Alert {
  severity: "critical" | "high" | "medium" | "low"
}

interface AlertStatsProps {
  alerts: Alert[]
}

export default function AlertStats({ alerts }: AlertStatsProps) {
  const stats = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    high: alerts.filter((a) => a.severity === "high").length,
    medium: alerts.filter((a) => a.severity === "medium").length,
    low: alerts.filter((a) => a.severity === "low").length,
    total: alerts.length,
  }

  return (
    <div className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-border">
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="text-lg font-bold text-foreground">{stats.total}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-red-400">Critical</p>
        <p className="text-lg font-bold text-red-400">{stats.critical}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-orange-400">High</p>
        <p className="text-lg font-bold text-orange-400">{stats.high}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-yellow-400">Medium</p>
        <p className="text-lg font-bold text-yellow-400">{stats.medium}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-blue-400">Low</p>
        <p className="text-lg font-bold text-blue-400">{stats.low}</p>
      </div>
    </div>
  )
}
