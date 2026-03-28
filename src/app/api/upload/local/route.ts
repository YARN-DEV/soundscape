import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { validateAudioFile } from '@/lib/cloud-storage'

/**
 * POST /api/upload/local
 * Upload to local storage (development only)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate audio file
    validateAudioFile(file)

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'audio')
    await mkdir(uploadDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'))
    const ext = file.name.substring(file.name.lastIndexOf('.'))
    const filename = `${nameWithoutExt}-${timestamp}${ext}`

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // Return file info
    return NextResponse.json({
      success: true,
      filename,
      url: `/uploads/audio/${filename}`,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('Local upload error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
