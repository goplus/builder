package utils

import (
	"image"
	"image/color/palette"
	_ "image/png"
	"mime/multipart"
)

// LoadImage Convert the file to Paletted type (required for GIF)
func LoadImage(fileHeader *multipart.FileHeader) (*image.Paletted, error) {
	// Open the image file
	file, err := fileHeader.Open()

	if err != nil {
		return nil, err
	}
	defer file.Close()

	// Decode the image
	img, _, err := image.Decode(file)
	if err != nil {
		return nil, err
	}

	// Convert the image to Paletted type (required for GIF)
	bounds := img.Bounds()
	palettedImage := image.NewPaletted(bounds, palette.Plan9)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			palettedImage.Set(x, y, img.At(x, y))
		}
	}
	return palettedImage, nil
}
