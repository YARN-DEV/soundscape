'use client'

import { usePWA } from '@/hooks/usePWA'
import { X, Download } from 'lucide-react'
import styles from './InstallPrompt.module.css'

export function InstallPrompt() {
  const { showInstallPrompt, isPWAInstalled, installApp, dismissInstallPrompt } = usePWA()

  if (!showInstallPrompt || isPWAInstalled) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <Download size={24} />
        </div>
        <div className={styles.text}>
          <h3>Install Soundscape</h3>
          <p>Get the app on your device for offline access and better experience</p>
        </div>
        <div className={styles.actions}>
          <button onClick={installApp} className={styles.installBtn}>
            Install
          </button>
          <button onClick={dismissInstallPrompt} className={styles.dismissBtn}>
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
