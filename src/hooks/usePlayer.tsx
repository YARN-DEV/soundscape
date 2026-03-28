'use client'

import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react'

interface Track {
  id: string
  title: string
  audioUrl: string
  coverUrl: string | null
  artist: {
    id: string
    name: string
  }
}

type RepeatMode = 'off' | 'one' | 'all'

interface PlayerContextType {
  currentTrack: Track | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  queue: Track[]
  shuffle: boolean
  repeatMode: RepeatMode
  playTrack: (track: Track) => void
  pause: () => void
  resume: () => void
  skipNext: () => void
  skipPrevious: () => void
  setVolume: (volume: number) => void
  seek: (time: number) => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  reorderQueue: (fromIndex: number, toIndex: number) => void
  clearQueue: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  getNextTrack: () => Track | null
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.7)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queue, setQueue] = useState<Track[]>([])
  const [shuffle, setShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [playHistory, setPlayHistory] = useState<Track[]>([])
  const [hasLoggedPlay, setHasLoggedPlay] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Define all callbacks first
  const playTrack = useCallback((track: Track) => {
    if (audioRef.current) {
      // Add current track to history before switching
      if (currentTrack) {
        setPlayHistory(prev => [...prev.slice(-19), currentTrack]) // Keep last 20
      }
      
      audioRef.current.src = track.audioUrl
      setCurrentTrack(track)
      setIsPlaying(true)
      setHasLoggedPlay(false) // Reset play tracking for new track
      
      // Handle play promise
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .catch(error => {
            // Handle AbortError gracefully
            if (error.name !== 'AbortError') {
              console.error('Play error:', error)
            }
          })
      }
    }
  }, [currentTrack])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const resume = useCallback(() => {
    if (audioRef.current) {
      setIsPlaying(true)
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .catch(error => {
            // Handle AbortError gracefully
            if (error.name !== 'AbortError') {
              console.error('Resume error:', error)
            }
          })
      }
    }
  }, [])

  const getNextTrack = useCallback((): Track | null => {
    if (repeatMode === 'one') {
      return currentTrack
    }

    const nextQueue = [...queue]
    
    if (shuffle && nextQueue.length > 0) {
      const randomIndex = Math.floor(Math.random() * nextQueue.length)
      return nextQueue[randomIndex]
    }

    if (nextQueue.length > 0) {
      return nextQueue[0]
    }

    if (repeatMode === 'all' && playHistory.length > 0) {
      return playHistory[0]
    }

    return null
  }, [repeatMode, currentTrack, queue, shuffle, playHistory])

  const skipNext = useCallback(() => {
    if (repeatMode === 'one' && currentTrack) {
      // Replay same track
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play()
      }
      return
    }

    const nextTrack = getNextTrack()
    
    if (nextTrack) {
      // Remove from queue if not shuffling or repeating
      if (!shuffle && repeatMode !== 'all') {
        setQueue(queue.slice(1))
      }
      playTrack(nextTrack)
    } else {
      pause()
    }
  }, [repeatMode, currentTrack, shuffle, queue, getNextTrack, playTrack, pause])

  const handleTrackEnd = useCallback(() => {
    skipNext()
  }, [skipNext])

  // Initialize audio element after callbacks are defined
  useEffect(() => {
    // Create audio element
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = volume

      // Event listeners
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0)
      })

      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0)
      })

      audioRef.current.addEventListener('ended', handleTrackEnd)
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [volume, handleTrackEnd])

  const skipPrevious = useCallback(() => {
    if (audioRef.current) {
      // If more than 3 seconds in, restart current track
      if (currentTime > 3) {
        audioRef.current.currentTime = 0
        return
      }

      // Otherwise, go to previous track in history
      if (playHistory.length > 0) {
        const previousTrack = playHistory[playHistory.length - 1]
        setPlayHistory(playHistory.slice(0, -1))
        
        // Add current track back to front of queue
        if (currentTrack) {
          setQueue([currentTrack, ...queue])
        }
        
        playTrack(previousTrack)
      }
    }
  }, [currentTime, playHistory, currentTrack, queue, playTrack])

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume
      setVolumeState(newVolume)
    }
  }, [])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const addToQueue = useCallback((track: Track) => {
    setQueue([...queue, track])
  }, [queue])

  const removeFromQueue = useCallback((index: number) => {
    setQueue(queue.filter((_, i) => i !== index))
  }, [queue])

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    const newQueue = [...queue]
    const [removed] = newQueue.splice(fromIndex, 1)
    newQueue.splice(toIndex, 0, removed)
    setQueue(newQueue)
  }, [queue])

  const clearQueue = useCallback(() => {
    setQueue([])
  }, [])

  const toggleShuffle = useCallback(() => {
    setShuffle(!shuffle)
  }, [shuffle])

  const toggleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ['off', 'all', 'one']
    const currentIndex = modes.indexOf(repeatMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setRepeatMode(modes[nextIndex])
  }, [repeatMode])

  // Track listen progress and log play at 30% threshold
  useEffect(() => {
    if (!currentTrack || !duration || hasLoggedPlay || duration === 0) {
      return
    }

    const threshold = 0.3
    const listenRatio = currentTime / duration

    if (listenRatio >= threshold) {
      // Log the play
      const logPlay = async () => {
        try {
          const token = localStorage.getItem('token')
          if (!token) return

          const response = await fetch(`/api/tracks/${currentTrack.id}/play`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              playedDuration: currentTime,
              totalDuration: duration
            })
          })

          if (response.ok) {
            setHasLoggedPlay(true)
            console.log('Play logged successfully')
          }
        } catch (error) {
          console.error('Failed to log play:', error)
        }
      }

      logPlay()
    }
  }, [currentTime, duration, currentTrack, hasLoggedPlay])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (isPlaying) {
            pause()
          } else if (currentTrack) {
            resume()
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          seek(Math.max(0, currentTime - 5))
          break
        case 'ArrowRight':
          e.preventDefault()
          seek(Math.min(duration, currentTime + 5))
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(Math.min(1, volume + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(Math.max(0, volume - 0.1))
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, currentTrack, currentTime, duration, volume, pause, resume, seek, setVolume])

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        currentTime,
        duration,
        queue,
        shuffle,
        repeatMode,
        playTrack,
        pause,
        resume,
        skipNext,
        skipPrevious,
        setVolume,
        seek,
        addToQueue,
        removeFromQueue,
        reorderQueue,
        clearQueue,
        toggleShuffle,
        toggleRepeat,
        getNextTrack,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}
