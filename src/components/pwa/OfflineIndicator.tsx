'use client'

import { usePWA } from '@/hooks/usePWA'
import { Wifi, WifiOff } from 'lucide-react'
import styles from './OfflineIndicator.module.css'

export function OfflineIndicator() {
  const { isOnline } = usePWA()

  if (isOnline) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <WifiOff size={16} />
        <span>You are offline - using cached content</span>
      </div>
    </div>
  )
}
