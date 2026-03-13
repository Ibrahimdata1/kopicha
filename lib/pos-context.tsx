'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Profile, Shop } from '@/lib/types'

interface PosContextValue {
  profile: Profile
  shop: Shop | null
  refreshShop: () => Promise<void>
}

const PosContext = createContext<PosContextValue | null>(null)

export function PosProvider({
  profile,
  shop: initialShop,
  children,
}: { profile: Profile; shop: Shop | null; children: React.ReactNode }) {
  const [shop, setShop] = useState<Shop | null>(initialShop)

  const refreshShop = useCallback(async () => {
    if (!shop?.id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shop.id)
      .single()
    if (data) setShop(data as Shop)
  }, [shop?.id])

  return (
    <PosContext.Provider value={{ profile, shop, refreshShop }}>
      {children}
    </PosContext.Provider>
  )
}

export function usePosContext() {
  const ctx = useContext(PosContext)
  if (!ctx) throw new Error('usePosContext must be used within PosProvider')
  return ctx
}
