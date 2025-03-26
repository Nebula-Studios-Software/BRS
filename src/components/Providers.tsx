'use client'

import { ThemeProvider } from '@/components/ThemeProvider'
import { HeroUIProvider } from "@heroui/react"
import { useState, useEffect } from 'react'

export function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-screen h-screen bg-background" />
  }

  return (
    <HeroUIProvider>
      <ThemeProvider attribute="class" defaultTheme="dark">
        {children}
      </ThemeProvider>
    </HeroUIProvider>
  )
}