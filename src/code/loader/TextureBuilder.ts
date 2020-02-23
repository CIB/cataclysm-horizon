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
  terrainList: string[],
  spriteMap: SpriteMap,
  spriteWidth: number,
  spriteHeight: number
): Promise<[string, number]> {
  let terrainRows = _.chunk(terrainList, 16)

  const canvas = document.createElement('canvas')
  canvas.width = spriteWidth * 16
  canvas.height = spriteHeight * terrainRows.length
  var context = canvas.getContext('2d') as CanvasRenderingContext2D

  for (let row = 0; row < terrainRows.length; row++) {
    const terrainRow = terrainRows[row]
    for (let column = 0; column < terrainRow.length; column++) {
      const terrainId = terrainRow[column]
      const imageData = await loadImage(spriteMap[terrainId])
      context.drawImage(imageData, column * spriteWidth, row * spriteHeight)
    }
  }

  return [canvas.toDataURL(), terrainRows.length]
}
