"use client"

import { useState, useEffect } from "react"
import AlertsList from "@/components/alerts-list"
import ChatPanel from "@/components/chat-panel"
import AlertStats from "@/components/alert-stats"
import AlertFilters from "@/components/alert-filters"
import ParticleBackground from "@/components/particle-background"
import { Button } from "@/components/ui/button"

interface DashboardPageProps {
  onLogout: () => void
}

interface Alert {
  id: string
  title: string
  severity: "critical" | "high" | "medium" | "low"
  timestamp: string
  description: string
  details: string
}

interface GrafanaAlert {
  fingerprint: string
  labels: {
    alertname: string
    severity: string
    source?: string
    [key: string]: string
  }
  annotations: {
    summary?: string
    description?: string
    [key: string]: string
  }
  startsAt: string
  status: {
    state: string
  }
}

const mapGrafanaAlert = (grafanaAlert: GrafanaAlert, index: number): Alert => {
  const severity = (grafanaAlert.labels.severity || "medium").toLowerCase() as "critical" | "high" | "medium" | "low"
  const startTime = new Date(grafanaAlert.startsAt)
  const now = new Date()
  const diffMs = now.getTime() - startTime.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  let timeStr = "just now"
  if (diffMins > 0) {
    if (diffMins < 60) timeStr = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
    else if (diffMins < 1440)
      timeStr = `${Math.floor(diffMins / 60)} hour${Math.floor(diffMins / 60) > 1 ? "s" : ""} ago`
    else timeStr = `${Math.floor(diffMins / 1440)} day${Math.floor(diffMins / 1440) > 1 ? "s" : ""} ago`
  }

  return {
    id: grafanaAlert.fingerprint || `alert-${index}`,
    title: grafanaAlert.labels.alertname || "Unknown Alert",
    severity,
    timestamp: timeStr,
    description: grafanaAlert.annotations.summary || grafanaAlert.labels.source || "No description",
    details: grafanaAlert.annotations.description || "No additional details available",
  }
}

export default function DashboardPage({ onLogout }: DashboardPageProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true)
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://aegis-backend:12345";
        const response = await fetch(`${BACKEND_URL}/alerts`);
        if (!response.ok) throw new Error("Failed to fetch alerts")
        const data: GrafanaAlert[] = await response.json()
        const mappedAlerts = data.map((alert, index) => mapGrafanaAlert(alert, index))
        setAlerts(mappedAlerts)
      } catch (error) {
        console.error("Error fetching alerts:", error)
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setSelectedAlert(null)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background relative overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="border-b border-border/30 px-6 py-4 flex items-center justify-between bg-transparent">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-green-400 bg-clip-text text-transparent">
              Aegis
            </h1>
            <p className="text-xs text-muted-foreground">Security Alert Management</p>
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            className="border-border hover:bg-white/5 bg-transparent transition-smooth"
          >
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat Panel - Left */}
          <div className="flex-1 border-r border-border/30 bg-transparent overflow-hidden">
            {selectedAlert ? (
              <ChatPanel alert={selectedAlert} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">Select an alert to start discussing</p>
                  <p className="text-xs text-muted-foreground/60">
                    Click on any alert from the list (Press Esc to clear)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Alerts List - Right */}
          <div className="w-96 border-l border-border/30 bg-transparent overflow-hidden flex flex-col">
            <AlertStats alerts={alerts} />
            <AlertFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedSeverity={selectedSeverity}
              onSeverityChange={setSelectedSeverity}
            />
            <div className="px-4 py-2 border-b border-border">
              <h2 className="font-semibold text-sm">
                Active Alerts {loading && <span className="text-xs text-muted-foreground">(loading...)</span>}
              </h2>
            </div>
            <AlertsList
              alerts={alerts}
              selectedAlert={selectedAlert}
              onSelectAlert={setSelectedAlert}
              searchQuery={searchQuery}
              selectedSeverity={selectedSeverity}
              onAcknowledge={() => {}}
              onResolve={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
