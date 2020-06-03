import { SpriteMap } from './TilesetParser'
import * as _ from 'lodash'

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

export async function buildTexture(
  spriteList: string[],
  spriteWidth: number,
  spriteHeight: number
): Promise<[string, number]> {
  let spriteRows = _.chunk(spriteList, 16)

  const canvas = document.createElement('canvas')
  canvas.width = spriteWidth * 16
  canvas.height = spriteHeight * spriteRows.length
  var context = canvas.getContext('2d') as CanvasRenderingContext2D

  for (let row = 0; row < spriteRows.length; row++) {
    const spriteRow = spriteRows[row]
    for (let column = 0; column < spriteRow.length; column++) {
      const sprite = spriteRow[column]
      const imageData = await loadImage(sprite)
      context.drawImage(imageData, column * spriteWidth, row * spriteHeight)
    }
  }

  return [canvas.toDataURL(), spriteRows.length]
}
