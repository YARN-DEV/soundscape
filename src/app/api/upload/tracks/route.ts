import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadAudio, validateAudioFile } from '@/lib/cloud-storage'

/**
 * POST /api/upload/tracks
 * Artist uploads a new track
 */
export async function POST(request: NextRequest) {
  try {
    // Get token from authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user
    const user = await prisma.user.findFirst({
      where: { id: token }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // For now, only admins and artists can upload
    // TODO: Add role-based permission check
    const artist = await prisma.artist.findFirst({
      where: { name: user.name || 'Unknown' }
    })

    if (!artist && user.email !== 'admin@soundscape.local') {
      return NextResponse.json(
        { error: 'Only artists and admins can upload' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    if (!file || !title) {
      return NextResponse.json(
        { error: 'File and title are required' },
        { status: 400 }
      )
    }

    // Validate audio file
    try {
      validateAudioFile(file)
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 }
      )
    }

    // Get audio duration
    let duration = 0
    try {
      const buffer = await file.arrayBuffer()
      // In production, use actual audio processing
      // For now, estimate from file size
      duration = Math.round((buffer.byteLength / 128000) * 8) // Rough estimate
    } catch (error) {
      console.warn('Failed to get audio duration:', error)
      duration = 0
    }

    // Upload file to cloud storage
    let uploadUrl = ''
    try {
      // Convert File to actual file for upload
      const uploadResult = await uploadAudio(file)
      uploadUrl = uploadResult.url
    } catch (error) {
      console.error('Upload error:', error)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Create track in database
    const track = await prisma.track.create({
      data: {
        title,
        audioUrl: uploadUrl,
        duration,
        artistId: artist?.id || 'default-artist',
        explicit: false,
      },
      include: {
        artist: true,
      },
    })

    return NextResponse.json({
      success: true,
      track,
      message: 'Track uploaded successfully',
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload track' },
      { status: 500 }
    )
  }
}
