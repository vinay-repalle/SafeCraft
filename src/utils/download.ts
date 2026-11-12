// Browser-only: turns data into a file and starts a download.
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export const dateStamp = (now: Date = new Date()): string => now.toISOString().slice(0, 10)
