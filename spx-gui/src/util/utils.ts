// Client-side fetching of SVG content using fetchAPI and converting to Base64.
export const fetchSvgContent = async (assetImageUrl: string) => {
    try {
      const response = await fetch(assetImageUrl)
      const svgContent = await response.text()
      const base64Svg = btoa(unescape(encodeURIComponent(svgContent)))
      const dataUri = `data:image/svg+xml;base64,${base64Svg}`
      return dataUri
    } catch (error) {
      console.error('Error fetching SVG:', error)
    }
  }