'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import TrackList from '@/components/tracks/TrackList'

interface Track {
  id: string
  title: string
  audioUrl: string
  artist: {
    id: string
    name: string
  }
  album: {
    id: string
    title: string
  } | null
  coverUrl: string | null
  duration: number
  releaseYear?: number | null
  plays: number
}

interface Artist {
  id: string
  name: string
  image?: string
  playCount?: number
}

interface Playlist {
  id: string
  name: string
  description?: string
  coverUrl?: string
  _count?: {
    tracks: number
  }
}

interface UserSettings {
  autoplayEnabled: boolean
  explicitContentFilter: boolean
}

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  
  // Liked tracks
  const [likedTracks, setLikedTracks] = useState<Track[]>([])
  
  // Recently played
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([])
  
  // Top artists
  const [topArtists, setTopArtists] = useState<Artist[]>([])
  const [artistsTimeframe, setArtistsTimeframe] = useState<'week' | 'month' | 'all'>('week')
  
  // Followed artists
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([])
  
  // User playlists
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([])
  
  // Settings
  const [settings, setSettings] = useState<UserSettings>({
    autoplayEnabled: true,
    explicitContentFilter: false,
  })
  
  const [loading, setLoading] = useState(true)

  const fetchAllData = useCallback(async () => {
    try {
      // Fetch liked tracks
      const likedResponse = await apiClient.get<{ tracks: Track[] }>('/api/me/liked')
      setLikedTracks(likedResponse.tracks)

      // Fetch recently played
      const recent = await apiClient.get<Track[]>('/api/me/recently-played')
      setRecentlyPlayed(recent)

      // Fetch top artists
      await fetchTopArtists()

      // Fetch followed artists
      const followedRes = await apiClient.get<{ artists: Artist[] }>('/api/me/followed-artists')
      setFollowedArtists(followedRes.artists)

      // Fetch user playlists
      const playlists = await apiClient.get<Playlist[]>('/api/me/playlists')
      setUserPlaylists(playlists)

      // Fetch settings
      const userSettings = await apiClient.get<UserSettings>('/api/me/settings')
      setSettings(userSettings)
    } catch (error) {
      console.error('Failed to fetch profile data:', error)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTopArtists = useCallback(async () => {
    try {
      const artists = await apiClient.get<Artist[]>(`/api/me/top-artists?timeframe=${artistsTimeframe}`)
      setTopArtists(artists)
    } catch (error) {
      console.error('Failed to fetch top artists:', error)
    }
  }, [artistsTimeframe])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      fetchAllData()
    }
  }, [user, authLoading, router, fetchAllData])

  // Fetch top artists when timeframe changes
  useEffect(() => {
    if (!user) return
    fetchTopArtists()
  }, [user, fetchTopArtists])

  const handleSettingToggle = async (setting: 'autoplayEnabled' | 'explicitContentFilter') => {
    const newValue = !settings[setting]
    setSettings({ ...settings, [setting]: newValue })

    try {
      await apiClient.patch('/api/me/settings', { [setting]: newValue })
    } catch (error) {
      console.error('Failed to update setting:', error)
      // Revert on error
      setSettings({ ...settings, [setting]: !newValue })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-[#1a1a1a] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-[#1a1a1a]">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-[#00d9ff]/20 to-transparent">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-end gap-6">
            {/* Avatar */}
            <div className="relative w-48 h-48 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name || user.email} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">
                  👤
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 pb-4">
              <p className="text-sm font-semibold text-[#00d9ff] mb-2">PROFILE</p>
              <h1 className="text-6xl font-bold text-white mb-4">{user.name || 'User'}</h1>
              <p className="text-gray-300 mb-4">{user.email}</p>
              <Link
                href="/artists/me"
                className="inline-block px-6 py-2 bg-[#00d9ff] hover:bg-[#00b8cc] text-black font-semibold rounded-lg transition-colors"
              >
                Go to Artist Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg p-6">
            <div className="text-4xl mb-3">❤️</div>
            <h3 className="text-xl font-semibold text-white mb-1">Liked Songs</h3>
            <p className="text-gray-200">{likedTracks.length} tracks</p>
          </div>

          <Link
            href="/playlists"
            className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 hover:bg-[#2a2a2a] transition-colors"
          >
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-xl font-semibold text-white mb-1">Your Playlists</h3>
            <p className="text-gray-400">{userPlaylists.length} playlists</p>
          </Link>

          <button
            onClick={logout}
            className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 hover:bg-red-500/10 hover:border-red-500 transition-colors text-left"
          >
            <div className="text-4xl mb-3">🚪</div>
            <h3 className="text-xl font-semibold text-white mb-1">Logout</h3>
            <p className="text-gray-400">Sign out of your account</p>
          </button>
        </div>

        {/* Recently Played Section */}
        {recentlyPlayed.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Recently Played</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {recentlyPlayed.slice(0, 10).map((track) => (
                <Link
                  key={track.id}
                  href={`/tracks/${track.id}`}
                  className="flex-shrink-0 w-44 bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors group"
                >
                  {track.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full aspect-square object-cover rounded-md mb-3"
                    />
                  )}
                  <p className="text-white font-semibold text-sm truncate">{track.title}</p>
                  <p className="text-gray-400 text-xs truncate">{track.artist.name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Followed Artists Section */}
        {followedArtists.length > 0 && (
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">Artists You Follow</h2>
              <Link
                href="/artists"
                className="text-[#00d9ff] hover:text-[#00c4e6] font-semibold text-sm"
              >
                Browse All Artists →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {followedArtists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors group"
                >
                  {artist.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-full aspect-square object-cover rounded-full mb-3"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-800 rounded-full flex items-center justify-center mb-3 text-4xl">
                      🎤
                    </div>
                  )}
                  <h3 className="text-white font-semibold text-center truncate group-hover:text-[#00d9ff] transition-colors">
                    {artist.name}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Top Artists Section */}
        {topArtists.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">Top Artists</h2>
              <div className="flex gap-2">
                <button
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    artistsTimeframe === 'week'
                      ? 'bg-[#00d9ff] text-black'
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setArtistsTimeframe('week')}
                >
                  This Week
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    artistsTimeframe === 'month'
                      ? 'bg-[#00d9ff] text-black'
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setArtistsTimeframe('month')}
                >
                  This Month
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    artistsTimeframe === 'all'
                      ? 'bg-[#00d9ff] text-black'
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setArtistsTimeframe('all')}
                >
                  All Time
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {topArtists.map((artist, index) => (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors group relative"
                >
                  <div className="absolute top-4 left-4 bg-[#00d9ff] text-black font-bold text-xs px-2 py-1 rounded">
                    #{index + 1}
                  </div>
                  {artist.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-full aspect-square object-cover rounded-full mb-3"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-800 rounded-full mb-3 flex items-center justify-center text-4xl">
                      🎤
                    </div>
                  )}
                  <p className="text-white font-semibold text-center truncate">{artist.name}</p>
                  <p className="text-gray-400 text-xs text-center">{artist.playCount} plays</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* User Playlists Section */}
        {userPlaylists.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">Your Playlists</h2>
              <Link
                href="/playlists"
                className="text-[#00d9ff] hover:underline font-semibold"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {userPlaylists.slice(0, 8).map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlists/${playlist.id}`}
                  className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors group"
                >
                  <div className="w-full aspect-square bg-gray-800 rounded-md mb-3 flex items-center justify-center overflow-hidden">
                    {playlist.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-4xl">🎵</div>
                    )}
                  </div>
                  <p className="text-white font-semibold truncate">{playlist.name}</p>
                  <p className="text-gray-400 text-sm">{playlist._count?.tracks || 0} tracks</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Settings Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Settings</h2>
          <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 divide-y divide-gray-800">
            <div className="p-6 flex items-center justify-between">
              <div>
                <h4 className="text-white font-semibold mb-1">Autoplay</h4>
                <p className="text-gray-400 text-sm">Automatically play related tracks when your playlist ends</p>
              </div>
              <button
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  settings.autoplayEnabled ? 'bg-[#00d9ff]' : 'bg-gray-700'
                }`}
                onClick={() => handleSettingToggle('autoplayEnabled')}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    settings.autoplayEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                ></div>
              </button>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <h4 className="text-white font-semibold mb-1">Explicit Content Filter</h4>
                <p className="text-gray-400 text-sm">Filter out tracks with explicit content</p>
              </div>
              <button
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  settings.explicitContentFilter ? 'bg-[#00d9ff]' : 'bg-gray-700'
                }`}
                onClick={() => handleSettingToggle('explicitContentFilter')}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    settings.explicitContentFilter ? 'translate-x-7' : 'translate-x-1'
                  }`}
                ></div>
              </button>
            </div>
          </div>
        </div>

        {/* Liked Songs */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">Your Liked Songs</h2>
          {likedTracks.length === 0 ? (
            <div className="text-center py-20 bg-[#1a1a1a] border border-gray-800 rounded-lg">
              <div className="text-6xl mb-4">❤️</div>
              <h3 className="text-2xl font-bold text-white mb-2">No liked songs yet</h3>
              <p className="text-gray-400 mb-6">Start liking tracks to see them here</p>
              <Link
                href="/tracks"
                className="inline-block bg-[#00d9ff] hover:bg-[#00c4e6] text-black px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Browse Tracks
              </Link>
            </div>
          ) : (
            <TrackList tracks={likedTracks} />
          )}
        </div>
      </div>
    </div>
  )
}
