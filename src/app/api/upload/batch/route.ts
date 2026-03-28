import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadAudio, validateAudioFile } from '@/lib/cloud-storage'

/**
 * POST /api/upload/batch
 * Admin uploads multiple tracks at once
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const user = await prisma.user.findFirst({
      where: { id: token }
    })

    if (!user || user.email !== 'admin@soundscape.local') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const artistId = formData.get('artistId') as string

    if (!files || files.length === 0 || !artistId) {
      return NextResponse.json(
        { error: 'Files and artistId are required' },
        { status: 400 }
      )
    }

    // Verify artist exists
    const artist = await prisma.artist.findUnique({
      where: { id: artistId }
    })

    if (!artist) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      )
    }

    const results = {
      successful: [] as Array<{ filename: string; trackId: string; title: string }>,
      failed: [] as Array<{ filename: string; error: string }>,
    }

    // Process each file
    for (const file of files) {
      try {
        // Validate
        validateAudioFile(file)

        // Upload
        const uploadResult = await uploadAudio(file)

        // Create track
        const track = await prisma.track.create({
          data: {
            title: file.name.replace(/\.[^.]+$/, ''), // Remove extension
            audioUrl: uploadResult.url,
            duration: uploadResult.duration || 0,
            artistId,
            explicit: false,
          },
          include: {
            artist: true,
          },
        })

        results.successful.push({
          filename: file.name,
          trackId: track.id,
          title: track.title,
        })
      } catch (error) {
        results.failed.push({
          filename: file.name,
          error: (error as Error).message,
        })
      }
    }

    return NextResponse.json({
      success: results.failed.length === 0,
      results,
      message: `Successfully uploaded ${results.successful.length} of ${files.length} tracks`,
    })
  } catch (error) {
    console.error('Batch upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload batch' },
      { status: 500 }
    )
  }
}
