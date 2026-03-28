'use client'

import { useAuth } from '@/hooks/useAuth'
import { ArtistUploadForm } from '@/components/upload/ArtistUploadForm'
import { redirect } from 'next/navigation'

export default function ArtistUploadPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <main>
      <ArtistUploadForm />
    </main>
  )
}
