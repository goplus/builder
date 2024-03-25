/**
 * Map file extension to mime type.
 */
const ext2mime: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  avif: 'image/avif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  json: 'application/json',
  spx: 'text/plain',
  gmx: 'text/plain'
}

/**
 * Get mime type from file extension.
 * @param ext the file extension, without dot (`.`)
 * @returns the mime type
 */
export const getMimeFromExt = (ext: string) => ext2mime[ext] || 'unknown'
