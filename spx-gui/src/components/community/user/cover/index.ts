import cover1 from './1.jpg'
import cover2 from './2.jpg'
import cover3 from './3.jpg'
import cover4 from './4.jpg'
import cover5 from './5.jpg'
import cover6 from './6.jpg'
import cover7 from './7.jpg'

const coverUrls = [cover1, cover2, cover3, cover4, cover5, cover6, cover7]

/** Get the cover image URL for given user */
export function getCoverImgUrl(username: string) {
  // Simple hash function from username to index in `coverUrls`.
  // We need to ensure that the result is stable for the same user.
  // In the future we may allow users to customize their cover image.
  const idx = (username.charCodeAt(0) + username.charCodeAt(username.length - 1)) % coverUrls.length
  return coverUrls[idx]
}
