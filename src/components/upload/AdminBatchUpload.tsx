'use client'

import { useState } from 'react'
import { Upload, AlertCircle, CheckCircle, X } from 'lucide-react'
import styles from './AdminBatchUpload.module.css'

interface UploadResult {
  filename: string
  trackId?: string
  title?: string
  error?: string
}

interface UploadResults {
  successful: UploadResult[]
  failed: UploadResult[]
}

export function AdminBatchUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [artistId, setArtistId] = useState('')
  const [genre, setGenre] = useState('Other')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadResults, setUploadResults] = useState<UploadResults | null>(null)
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

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('audio/')
    )

    if (files.length > 0) {
      setSelectedFiles([...selectedFiles, ...files])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setSelectedFiles([...selectedFiles, ...Array.from(files)])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedFiles.length === 0 || !artistId) {
      alert('Please select files and artist')
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append('files', file)
      })
      formData.append('artistId', artistId)
      formData.append('genre', genre)

      const token = localStorage.getItem('token')

      const response = await fetch('/api/upload/batch', {
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

      const data = await response.json()
      setUploadResults(data.results)
      setSelectedFiles([])
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  if (uploadResults) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Upload Results</h2>

        {uploadResults.successful.length > 0 && (
          <div className={styles.results}>
            <h3 className={styles.resultTitle}>
              ✓ Successful ({uploadResults.successful.length})
            </h3>
            <div className={styles.resultList}>
              {uploadResults.successful.map((result, index) => (
                <div key={index} className={styles.resultItem}>
                  <CheckCircle size={16} className={styles.successIcon} />
                  <div>
                    <p className={styles.resultFilename}>{result.filename}</p>
                    <p className={styles.resultTitle}>{result.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadResults.failed.length > 0 && (
          <div className={styles.results}>
            <h3 className={styles.resultTitle}>
              ✗ Failed ({uploadResults.failed.length})
            </h3>
            <div className={styles.resultList}>
              {uploadResults.failed.map((result, index) => (
                <div key={index} className={styles.resultItem}>
                  <AlertCircle size={16} className={styles.errorIcon} />
                  <div>
                    <p className={styles.resultFilename}>{result.filename}</p>
                    <p className={styles.resultError}>{result.error}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setUploadResults(null)}
          className={styles.resetBtn}
        >
          Upload More
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Batch Upload</h2>
      <p className={styles.subtitle}>Upload multiple tracks at once</p>

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
            multiple
            accept="audio/*"
            onChange={handleFileChange}
            className={styles.fileInput}
            id="batch-files"
            disabled={isLoading}
          />
          <label htmlFor="batch-files" className={styles.dropLabel}>
            <Upload size={40} className={styles.uploadIcon} />
            <p className={styles.dropText}>
              Drag and drop audio files here
            </p>
            <p className={styles.dropHint}>
              or click to browse (Max 100MB per file)
            </p>
          </label>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className={styles.filesList}>
            <h3 className={styles.filesTitle}>
              Selected Files ({selectedFiles.length})
            </h3>
            <div className={styles.filesContainer}>
              {selectedFiles.map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <div className={styles.fileInfo}>
                    <p className={styles.fileName}>{file.name}</p>
                    <p className={styles.fileSize}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className={styles.removeBtn}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Artist Selection */}
        <div className={styles.formGroup}>
          <label htmlFor="artistId" className={styles.label}>
            Artist
          </label>
          <select
            id="artistId"
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            className={styles.select}
            disabled={isLoading}
            required
          >
            <option value="">Select an artist...</option>
            {/* TODO: Fetch artists from API */}
            <option value="artist-1">Sample Artist 1</option>
            <option value="artist-2">Sample Artist 2</option>
          </select>
        </div>

        {/* Genre Selection */}
        <div className={styles.formGroup}>
          <label htmlFor="genre" className={styles.label}>
            Genre
          </label>
          <select
            id="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className={styles.select}
            disabled={isLoading}
          >
            <option value="Other">Other</option>
            <option value="Pop">Pop</option>
            <option value="Rock">Rock</option>
            <option value="Hip-Hop">Hip-Hop</option>
            <option value="Jazz">Jazz</option>
            <option value="Classical">Classical</option>
            <option value="Electronic">Electronic</option>
            <option value="Indie">Indie</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading || selectedFiles.length === 0}
        >
          {isLoading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
        </button>
      </form>
    </div>
  )
}
