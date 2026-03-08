'use client'

import { createContext, useContext } from 'react'
import type { Profile, Shop } from '@/lib/types'

interface PosContextValue {
  profile: Profile
  shop: Shop | null
}

const PosContext = createContext<PosContextValue | null>(null)

export function PosProvider({
  profile,
  shop,
  children,
}: PosContextValue & { children: React.ReactNode }) {
  return (
    <PosContext.Provider value={{ profile, shop }}>
      {children}
    </PosContext.Provider>
  )
}

export function usePosContext() {
  const ctx = useContext(PosContext)
  if (!ctx) throw new Error('usePosContext must be used within PosProvider')
  return ctx
}
