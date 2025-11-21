"use client"

import AlertItem from "@/components/alert-item"

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
  severity: 'critical' | 'high' | 'medium' | 'low'
  recommendation: string
  logs: string[] // assuming logs are text lines; use `any` if they can vary
}


interface AlertsListProps {
  alerts: Alert[]
  selectedAlert: Alert | null
  onSelectAlert: (alert: Alert) => void
  searchQuery: string
  selectedSeverity: string | null
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
}

export default function AlertsList({
  alerts,
  selectedAlert,
  onSelectAlert,
  searchQuery,
  selectedSeverity,
  onAcknowledge,
  onResolve,
}: AlertsListProps) {
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.alert_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.alert_description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSeverity = selectedSeverity === null || alert.severity === selectedSeverity
    return matchesSearch && matchesSeverity
  })

  return (
    <div className="overflow-y-auto h-full custom-scrollbar radial-wave">
      {filteredAlerts.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">No alerts found</p>
        </div>
      ) : (
        filteredAlerts.map((alert) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            isSelected={selectedAlert?.id === alert.id}
            onSelect={onSelectAlert}
            onAcknowledge={onAcknowledge}
            onResolve={onResolve}
          />
        ))
      )}
    </div>
  )
}
