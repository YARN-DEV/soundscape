'use client'

import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAState {
  isOnline: boolean
  isPWAInstalled: boolean
  showInstallPrompt: boolean
  deferredPrompt: BeforeInstallPromptEvent | null
  isServiceWorkerReady: boolean
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    isPWAInstalled: false,
    showInstallPrompt: false,
    deferredPrompt: null,
    isServiceWorkerReady: false,
  })

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined') return

    const registerServiceWorker = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          })
          console.log('Service Worker registered:', registration)
          setState(prev => ({ ...prev, isServiceWorkerReady: true }))

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, notify user
                  console.log('New service worker available')
                }
              })
            }
          })
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    // Delay registration slightly to avoid conflicts
    const timer = setTimeout(registerServiceWorker, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Listen for install prompt
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      const promptEvent = event as BeforeInstallPromptEvent
      setState(prev => ({
        ...prev,
        deferredPrompt: promptEvent,
        showInstallPrompt: true,
      }))
    }

    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isPWAInstalled: true,
        showInstallPrompt: false,
        deferredPrompt: null,
      }))
    }

    const handleDisplayModeChange = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      setState(prev => ({ ...prev, isPWAInstalled: isStandalone }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('displaymodechange', handleDisplayModeChange)

    // Check if already installed (call in useEffect properly)
    const timer = setTimeout(() => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      if (isStandalone) {
        setState(prev => ({ ...prev, isPWAInstalled: isStandalone }))
      }
    }, 0)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('displaymodechange', handleDisplayModeChange)
      clearTimeout(timer)
    }
  }, [])

  // Listen for online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }))
      console.log('Back online')
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }))
      console.log('Gone offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const installApp = useCallback(async () => {
    if (!state.deferredPrompt) return

    state.deferredPrompt.prompt()
    const choiceResult = await state.deferredPrompt.userChoice

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    setState(prev => ({
      ...prev,
      deferredPrompt: null,
      showInstallPrompt: false,
    }))
  }, [state.deferredPrompt])

  const dismissInstallPrompt = useCallback(() => {
    setState(prev => ({ ...prev, showInstallPrompt: false }))
  }, [])

  const updateServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        registration.update()
        console.log('Service Worker update checked')
      }
    } catch (error) {
      console.error('Failed to update service worker:', error)
    }
  }, [])

  return {
    ...state,
    installApp,
    dismissInstallPrompt,
    updateServiceWorker,
  }
}
