'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import Image from 'next/image'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { ArtistUploadForm } from '@/components/upload/ArtistUploadForm'

interface Artist {
  id: string
  name: string
  bio: string | null
  image: string | null
  instagramUrl: string | null
  tiktokUrl: string | null
  soundcloudUrl: string | null
  twitterUrl: string | null
  spotifyUrl: string | null
  websiteUrl: string | null
  _count: {
    tracks: number
    albums: number
    followers: number
  }
}

interface Track {
  id: string
  title: string
  duration: number
  coverUrl: string | null
  plays: number
  likes: number
  createdAt: string
  album: { id: string; title: string } | null
}

interface PlaylistInclusion {
  id: string
  name: string
  description: string | null
  coverImageUrl: string | null
  isPublic: boolean
  owner: { id: string; name: string | null; email: string }
  totalTracks: number
  artistTracks: Array<{ id: string; title: string; addedAt: Date }>
  artistTrackCount: number
}

type TabType = 'overview' | 'tracks' | 'playlists' | 'profile'

export default function ArtistDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [artist, setArtist] = useState<Artist | null>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tracks, setTracks] = useState<Track[]>([])
  const [trackStats, setTrackStats] = useState({ totalTracks: 0, totalPlays: 0, totalLikes: 0 })
  const [playlists, setPlaylists] = useState<PlaylistInclusion[]>([])
  const [playlistStats, setPlaylistStats] = useState({ totalPlaylists: 0, totalInclusions: 0 })
  
  // Profile edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    image: '',
    instagramUrl: '',
    tiktokUrl: '',
    soundcloudUrl: '',
    twitterUrl: '',
    spotifyUrl: '',
    websiteUrl: ''
  })
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [creatingProfile, setCreatingProfile] = useState(false)
  const [newArtistName, setNewArtistName] = useState('')
  const [createMessage, setCreateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function createArtistProfile() {
    if (!newArtistName.trim()) {
      setCreateMessage({ type: 'error', text: 'Please enter your artist name' })
      return
    }

    setCreatingProfile(true)
    try {
      const response = await apiClient.post<{ artist: Artist; message: string }>('/api/artists/me', { name: newArtistName.trim() })
      setArtist(response.artist)
      setHasProfile(true)
      setCreateMessage({ type: 'success', text: 'Artist profile created! Refreshing...' })
      setNewArtistName('')
      setTimeout(() => fetchArtistData(), 1000)
    } catch (error) {
      setCreateMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to create artist profile' 
      })
    } finally {
      setCreatingProfile(false)
    }
  }

  async function fetchArtistData() {
    try {
      const artistData = await apiClient.get<{ artist: Artist; hasProfile: boolean }>('/api/artists/me')
      setArtist(artistData.artist)
      setHasProfile(true)
      
      // Set edit form with current values
      setEditForm({
        name: artistData.artist.name,
        bio: artistData.artist.bio || '',
        image: artistData.artist.image || '',
        instagramUrl: artistData.artist.instagramUrl || '',
        tiktokUrl: artistData.artist.tiktokUrl || '',
        soundcloudUrl: artistData.artist.soundcloudUrl || '',
        twitterUrl: artistData.artist.twitterUrl || '',
        spotifyUrl: artistData.artist.spotifyUrl || '',
        websiteUrl: artistData.artist.websiteUrl || ''
      })

      // Fetch tracks
      const tracksData = await apiClient.get<{ tracks: Track[]; stats: typeof trackStats }>('/api/artists/me/tracks')
      setTracks(tracksData.tracks)
      setTrackStats(tracksData.stats)

      // Fetch playlists
      const playlistsData = await apiClient.get<{ playlists: PlaylistInclusion[]; totalPlaylists: number; totalInclusions: number }>('/api/artists/me/playlists')
      setPlaylists(playlistsData.playlists)
      setPlaylistStats({ totalPlaylists: playlistsData.totalPlaylists, totalInclusions: playlistsData.totalInclusions })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch artist data'
      
      // If no artist profile exists, show the creation form
      if (errorMessage.includes('Artist profile not found')) {
        setHasProfile(false)
      } else {
        console.error('Failed to fetch artist data:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      fetchArtistData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

  const handleSaveProfile = async () => {
    try {
      setSaveMessage(null)
      await apiClient.patch('/api/artists/me', editForm)
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' })
      setIsEditing(false)
      fetchArtistData()
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
      console.error('Failed to update profile:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading artist dashboard...</p>
        </div>
      </div>
    )
  }

  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <svg className="w-20 h-20 mx-auto mb-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h2 className="text-2xl font-bold mb-4">Create Your Artist Profile</h2>
          <p className="text-gray-400 mb-6">Get started by creating your artist profile so you can upload tracks and build your audience.</p>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Your Artist Name"
              value={newArtistName}
              onChange={(e) => setNewArtistName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createArtistProfile()}
              disabled={creatingProfile}
              className="w-full px-4 py-3 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-[#00d9ff] disabled:opacity-50"
            />
          </div>

          {createMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              createMessage.type === 'success' 
                ? 'bg-green-900 text-green-200' 
                : 'bg-red-900 text-red-200'
            }`}>
              {createMessage.text}
            </div>
          )}

          <button
            onClick={createArtistProfile}
            disabled={creatingProfile}
            className="w-full px-6 py-3 bg-[#00d9ff] hover:bg-[#00c4e6] disabled:bg-gray-600 text-black font-semibold rounded-lg transition-colors"
          >
            {creatingProfile ? 'Creating...' : 'Create Artist Profile'}
          </button>

          <Link
            href="/"
            className="inline-block mt-4 px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-900/40 to-black pt-20 pb-12 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-6">
            {artist?.image ? (
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                <Image src={artist.image} alt={artist.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500/30 to-[#00d9ff]/30 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-400 mb-2">ARTIST</p>
              <h1 className="text-5xl font-bold mb-3">{artist?.name}</h1>
              <div className="flex items-center gap-6 text-sm mb-4">
                <span className="text-gray-300">{artist?._count.tracks} tracks</span>
                <span className="text-gray-300">{artist?._count.followers.toLocaleString()} followers</span>
                <span className="text-gray-300">{trackStats.totalPlays.toLocaleString()} total plays</span>
              </div>
              <Link
                href="/me"
                className="inline-block px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Back to Profile
              </Link>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-[#00d9ff] hover:bg-[#00b8cc] text-black font-bold py-3 px-8 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Song
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex gap-4 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'text-[#00d9ff] border-b-2 border-[#00d9ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tracks')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'tracks'
                ? 'text-[#00d9ff] border-b-2 border-[#00d9ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Tracks ({tracks.length})
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'playlists'
                ? 'text-[#00d9ff] border-b-2 border-[#00d9ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            In Playlists ({playlistStats.totalPlaylists})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'profile'
                ? 'text-[#00d9ff] border-b-2 border-[#00d9ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Edit Profile
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="py-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Total Tracks</h3>
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-white">{trackStats.totalTracks}</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Total Plays</h3>
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-white">{trackStats.totalPlays.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-[#00d9ff]/20 to-[#00d9ff]/10 border border-[#00d9ff]/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Total Likes</h3>
                  <svg className="w-8 h-8 text-[#00d9ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-white">{trackStats.totalLikes.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">In Playlists</h3>
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-white">{playlistStats.totalPlaylists}</p>
                <p className="text-sm text-gray-400 mt-2">{playlistStats.totalInclusions} track inclusions</p>
              </div>
            </div>

            {/* Bio Section */}
            {artist?.bio && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-4">About</h2>
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">{artist.bio}</p>
                </div>
              </div>
            )}

            {/* Top Tracks Preview */}
            {tracks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Top Tracks</h2>
                  <button
                    onClick={() => setActiveTab('tracks')}
                    className="text-[#00d9ff] hover:underline text-sm font-semibold"
                  >
                    View All
                  </button>
                </div>
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#0a0a0a] border-b border-gray-800">
                      <tr>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">#</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Title</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Plays</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Likes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tracks.slice(0, 5).map((track, index) => (
                        <tr key={track.id} className="border-b border-gray-800 hover:bg-[#2a2a2a] transition-colors">
                          <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {track.coverUrl ? (
                                <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                                  <Image src={track.coverUrl} alt={track.title} fill className="object-cover" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                  </svg>
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-white">{track.title}</p>
                                {track.album && <p className="text-sm text-gray-400">{track.album.title}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-white font-medium">{track.plays.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-gray-300">{track.likes.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tracks Tab */}
        {activeTab === 'tracks' && (
          <div className="py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">All Tracks</h2>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-[#00d9ff] hover:bg-[#00b8cc] text-black font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Track
              </button>
            </div>
            {tracks.length === 0 ? (
              <div className="text-center py-16 bg-[#1a1a1a] border border-gray-800 rounded-lg">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No tracks yet</h3>
                <p className="text-gray-500">Your tracks will appear here once they&rsquo;re uploaded.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {tracks.map((track) => (
                  <div key={track.id} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors">
                    <div className="flex items-center gap-4">
                      {track.coverUrl ? (
                        <div className="relative w-16 h-16 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                          <Image src={track.coverUrl} alt={track.title} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg mb-1">{track.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          {track.album && <span>{track.album.title}</span>}
                          <span>{formatDuration(track.duration)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Plays</p>
                            <p className="text-white font-semibold">{track.plays.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Likes</p>
                            <p className="text-white font-semibold">{track.likes.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Playlists Tab */}
        {activeTab === 'playlists' && (
          <div className="py-8">
            <h2 className="text-2xl font-bold mb-6">Playlists Featuring Your Music</h2>
            {playlists.length === 0 ? (
              <div className="text-center py-16 bg-[#1a1a1a] border border-gray-800 rounded-lg">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-400 mb-2">Not in any playlists yet</h3>
                <p className="text-gray-500">Your tracks will appear in playlists created by users.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {playlists.map((playlist) => (
                  <Link key={playlist.id} href={`/playlists/${playlist.id}`} className="group">
                    <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors">
                      <div className="relative aspect-square mb-4 bg-gradient-to-br from-purple-500/20 to-[#00d9ff]/20 rounded-lg overflow-hidden">
                        {playlist.coverImageUrl ? (
                          <Image src={playlist.coverImageUrl} alt={playlist.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-[#00d9ff] transition-colors">{playlist.name}</h3>
                      <p className="text-sm text-gray-400 mb-3">By {playlist.owner.name || playlist.owner.email.split('@')[0]}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{playlist.totalTracks} total tracks</span>
                        <span className="text-[#00d9ff] font-semibold">{playlist.artistTrackCount} your tracks</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Edit Tab */}
        {activeTab === 'profile' && (
          <div className="py-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Edit Artist Profile</h2>
            
            {saveMessage && (
              <div className={`mb-6 p-4 rounded-lg border ${
                saveMessage.type === 'success'
                  ? 'bg-green-500/20 border-green-500/30 text-green-400'
                  : 'bg-red-500/20 border-red-500/30 text-red-400'
              }`}>
                {saveMessage.text}
              </div>
            )}

            <div className="space-y-6">
              {/* Artist Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Artist Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Your artist name"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d9ff]"
                  disabled={!isEditing}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell your story..."
                  rows={5}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d9ff]"
                  disabled={!isEditing}
                />
              </div>

              {/* Profile Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Profile Image URL
                </label>
                <input
                  type="url"
                  value={editForm.image}
                  onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d9ff]"
                  disabled={!isEditing}
                />
              </div>

              {/* Social Links */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Social Links</h3>
                
                <div className="space-y-4">
                  {/* Instagram */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={editForm.instagramUrl}
                      onChange={(e) => setEditForm({ ...editForm, instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/yourusername"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d9ff]"
                      disabled={!isEditing}
                    />
                  </div>

                  {/* TikTok */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      TikTok
                    </label>
                    <input
                      type="url"
                      value={editForm.tiktokUrl}
                      onChange={(e) => setEditForm({ ...editForm, tiktokUrl: e.target.value })}
                      placeholder="https://tiktok.com/@yourusername"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d9ff]"
                      disabled={!isEditing}
                    />
                  </div>

                  {/* SoundCloud */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      SoundCloud
                    </label>
                    <input
                      type="url"
                      value={editForm.soundcloudUrl}
                      onChange={(e) => setEditForm({ ...editForm, soundcloudUrl: e.target.value })}
                      placeholder="https://soundcloud.com/yourusername"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d9ff]"
                      disabled={!isEditing}
                    />
                  </div>

                  {/* Twitter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Twitter/X
                    </label>
                    <input
                      type="url"
                      value={editForm.twitterUrl}
                      onChange={(e) => setEditForm({ ...editForm, twitterUrl: e.target.value })}
                      placeholder="https://twitter.com/yourusername"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d9ff]"
                      disabled={!isEditing}
                    />
                  </div>

                  {/* Spotify */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Spotify
                    </label>
                    <input
                      type="url"
                      value={editForm.spotifyUrl}
                      onChange={(e) => setEditForm({ ...editForm, spotifyUrl: e.target.value })}
                      placeholder="https://open.spotify.com/artist/..."
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d9ff]"
                      disabled={!isEditing}
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={editForm.websiteUrl}
                      onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d9ff]"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 px-6 py-4 bg-[#00d9ff] hover:bg-[#00c4e6] text-black font-bold rounded-lg transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        // Reset form
                        if (artist) {
                          setEditForm({
                            name: artist.name,
                            bio: artist.bio || '',
                            image: artist.image || '',
                            instagramUrl: artist.instagramUrl || '',
                            tiktokUrl: artist.tiktokUrl || '',
                            soundcloudUrl: artist.soundcloudUrl || '',
                            twitterUrl: artist.twitterUrl || '',
                            spotifyUrl: artist.spotifyUrl || '',
                            websiteUrl: artist.websiteUrl || ''
                          })
                        }
                      }}
                      className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 px-6 py-4 bg-[#00d9ff] hover:bg-[#00c4e6] text-black font-bold rounded-lg transition-colors"
                    >
                      Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Track"
      >
        <ArtistUploadForm onSuccessAction={() => {
          setIsUploadModalOpen(false)
          fetchArtistData()
        }} />
      </Modal>
    </div>
  )
}
