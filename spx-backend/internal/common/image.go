package common

import (
	"image"
	"image/color/palette"
	_ "image/png"
	"mime/multipart"
)

func LoadImage(fileHeader *multipart.FileHeader) (*image.Paletted, error) {
	// 打开图片文件
	file, err := fileHeader.Open()

	if err != nil {
		return nil, err
	}
	defer file.Close()

	// 解码图片
	img, _, err := image.Decode(file)
	if err != nil {
		return nil, err
	}

	// 将图片转换为Paletted类型（GIF需要的类型）
	bounds := img.Bounds()
	palettedImage := image.NewPaletted(bounds, palette.Plan9)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			palettedImage.Set(x, y, img.At(x, y))
		}
	}

	return palettedImage, nil
}
