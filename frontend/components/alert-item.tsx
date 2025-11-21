"use client"

interface Alert {
  id: string
  timestamp: string
  alert_name: string
  alert_description: string
  source_ip: string
  should_block: boolean
  block_reason: string
  is_attack: boolean
  confidence: number
  attack_type: string
  severity: "critical" | "high" | "medium" | "low"
  recommendation: string
  logs: string[]
}

interface AlertItemProps {
  alert: Alert
  isSelected: boolean
  onSelect: (alert: Alert) => void
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
}

const severityColors = {
  critical: "bg-red-500/20 text-red-300 border-red-500/40",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  low: "bg-blue-500/20 text-blue-300 border-blue-500/40",
}

export default function AlertItem({ alert, isSelected, onSelect }: AlertItemProps) {
  return (
    <div
      onClick={() => onSelect(alert)}
      className={`group relative p-4 border-b border-border/30 transition-all hover:bg-white/5 cursor-pointer ${
        isSelected ? "bg-white/10 border-l-2 border-l-primary" : ""
      }`}
    >
      {/* Top Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`px-2 py-1 rounded text-xs font-semibold border ${severityColors[alert.severity]}`}
          >
            {alert.severity.toUpperCase()}
          </div>
          {alert.should_block && (
            <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
              BLOCKED
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground/70">{alert.timestamp}</p>
      </div>

      {/* Main Content */}
      <div className="mt-2">
        <h3 className="font-semibold text-sm text-primary truncate">{alert.alert_name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {alert.alert_description || "No description available"}
        </p>
      </div>

      {/* Attack Details */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground/80">
        <p><span className="font-medium text-foreground">Source IP:</span> {alert.source_ip}</p>
        <p><span className="font-medium text-foreground">Attack Type:</span> {alert.attack_type || "N/A"}</p>
        <p><span className="font-medium text-foreground">Confidence:</span> {alert.confidence}%</p>
        <p><span className="font-medium text-foreground">Is Attack:</span> {alert.is_attack ? "Yes" : "No"}</p>
      </div>

      {/* Block Info */}
      {alert.block_reason && (
        <p className="mt-2 text-xs text-red-300/80 italic border-l-2 border-red-500/30 pl-2">
          {alert.block_reason}
        </p>
      )}

      {/* Recommendation */}
      {alert.recommendation && (
        <p className="mt-2 text-xs text-green-300/90">
          💡 <span className="font-medium">Recommendation:</span> {alert.recommendation}
        </p>
      )}

      {/* Logs Preview */}
      {alert.logs?.length > 0 && (
        <details className="mt-3 bg-black/20 rounded p-2 border border-border/20 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground/80 select-none">
            View Logs ({alert.logs.length})
          </summary>
          <pre className="mt-2 max-h-32 overflow-y-auto text-[11px] whitespace-pre-wrap">
            {alert.logs.slice(0, 5).join("\n")}
          </pre>
        </details>
      )}
    </div>
  )
}
