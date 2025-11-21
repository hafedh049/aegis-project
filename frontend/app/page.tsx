"use client"

import { useState } from "react"
import LoginPage from "@/components/login-page"
import DashboardPage from "@/components/dashboard-page"
import ParticleBackground from "@/components/particle-background"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = (username: string, password: string) => {
    if (username === "admin" && password === "admin") {
      setIsAuthenticated(true)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
  }

  return (
    <main className="relative w-full h-screen overflow-hidden bg-background">
      <ParticleBackground />
      <div className="relative z-10">
        {!isAuthenticated ? <LoginPage onLogin={handleLogin} /> : <DashboardPage onLogout={handleLogout} />}
      </div>
    </main>
  )
}
