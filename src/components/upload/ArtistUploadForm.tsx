'use client'

import { useState } from 'react'
import { Upload, Music, AlertCircle, CheckCircle } from 'lucide-react'
import styles from './ArtistUploadForm.module.css'

interface UploadStatus {
  file: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

interface ArtistUploadFormProps {
  onSuccessAction?: () => void
}

export function ArtistUploadForm({ onSuccessAction }: ArtistUploadFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      const file = files[0]
      if (file.type.startsWith('audio/')) {
        setSelectedFile(file)
      } else {
        setUploadStatus({
          file: file.name,
          status: 'error',
          progress: 0,
          error: 'Please select an audio file',
        })
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      setSelectedFile(files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile || !title) {
      setUploadStatus({
        file: selectedFile?.name || 'unknown',
        status: 'error',
        progress: 0,
        error: 'Please select a file and enter a title',
      })
      return
    }

    setIsLoading(true)
    setUploadStatus({
      file: selectedFile.name,
      status: 'uploading',
      progress: 0,
    })

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', title)
      formData.append('description', description)

      const token = localStorage.getItem('token')

      const response = await fetch('/api/upload/tracks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      await response.json()

      setUploadStatus({
        file: selectedFile.name,
        status: 'success',
        progress: 100,
      })

      // Reset form
      setTitle('')
      setDescription('')
      setSelectedFile(null)

      // Call onSuccess action
      if (onSuccessAction) {
        setTimeout(() => {
          onSuccessAction()
        }, 1000)
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadStatus(null)
      }, 3000)
    } catch (error) {
      setUploadStatus({
        file: selectedFile.name,
        status: 'error',
        progress: 0,
        error: (error as Error).message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Upload Your Music</h2>
      <p className={styles.subtitle}>Share your music with the world</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* File Upload Area */}
        <div
          className={`${styles.dropZone} ${dragActive ? styles.active : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className={styles.fileInput}
            id="audio-file"
            disabled={isLoading}
          />
          <label htmlFor="audio-file" className={styles.dropLabel}>
            <Upload size={40} className={styles.uploadIcon} />
            <p className={styles.dropText}>
              {selectedFile ? selectedFile.name : 'Drag and drop your audio file here'}
            </p>
            <p className={styles.dropHint}>
              {selectedFile
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                : 'or click to browse (Max 100MB)'}
            </p>
          </label>
        </div>

        {/* Title Input */}
        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.label}>
            Track Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter track title"
            className={styles.input}
            disabled={isLoading}
            required
          />
        </div>

        {/* Description Input */}
        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your track..."
            className={styles.textarea}
            disabled={isLoading}
            rows={4}
          />
        </div>

        {/* Upload Status */}
        {uploadStatus && (
          <div
            className={`${styles.statusMessage} ${styles[uploadStatus.status]}`}
          >
            <div className={styles.statusHeader}>
              {uploadStatus.status === 'error' && (
                <AlertCircle size={20} />
              )}
              {uploadStatus.status === 'success' && (
                <CheckCircle size={20} />
              )}
              {uploadStatus.status === 'uploading' && (
                <Music size={20} className={styles.spinning} />
              )}
              <span>{uploadStatus.error || 'Upload successful!'}</span>
            </div>
            {uploadStatus.status === 'uploading' && (
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${uploadStatus.progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading || !selectedFile}
        >
          {isLoading ? 'Uploading...' : 'Upload Track'}
        </button>
      </form>
    </div>
  )
}
