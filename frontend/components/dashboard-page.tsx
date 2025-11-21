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

export interface Alert {
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
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://aegis-backend:12345"
        const response = await fetch(`${BACKEND_URL}/alerts`)
        if (!response.ok) throw new Error("Failed to fetch alerts")
        const data: Alert[] = await response.json()
        setAlerts(data)
      } catch (error) {
        console.error("Error fetching alerts:", error)
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedAlert(null)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

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
          {/* Chat Panel */}
          <div className="flex-1 border-r border-border/30 bg-transparent overflow-hidden">
            {selectedAlert ? (
              <ChatPanel alert={selectedAlert} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">Select an alert to start discussing</p>
                  <p className="text-xs text-muted-foreground/60">Click on any alert from the list (Press Esc to clear)</p>
                </div>
              </div>
            )}
          </div>

          {/* Alerts List */}
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
