'use client'

import { Layout } from '@/components/Layout'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-screen h-screen bg-background" />
  }

  return (
    <main className="w-screen h-screen">
      <Layout />
      <Toaster position="top-right" />
    </main>
  )
}