import * as _ from 'lodash'
import { Voxel, PreparedVoxel } from './VoxelLoader'
import { uniqBy } from 'lodash'

export type ImageBuffer = HTMLImageElement

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

class SpriteDrawer {
  private context: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement

  constructor(
    private spritesheet: ImageBuffer,
    private spriteWidth: number,
    private spriteHeight: number
  ) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = spriteWidth
    this.canvas.height = spriteHeight
    this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D
  }

  drawIndex(sprite: number, color: string, baseColor: string): void {
    this.context.globalCompositeOperation = 'source-over'
    this.context.fillStyle = baseColor
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
    const spritesPerRow = this.spritesheet.width / this.spriteWidth
    const row = _.floor(sprite / spritesPerRow)
    const column = sprite % spritesPerRow
    this.context.drawImage(
      this.spritesheet,
      this.spriteWidth * column,
      this.spriteHeight * row,
      this.spriteWidth,
      this.spriteHeight,
      0,
      0,
      this.spriteWidth,
      this.spriteHeight
    )
    this.context.globalCompositeOperation = 'multiply'
    this.context.fillStyle = color
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  toDataURL(): string {
    return this.canvas.toDataURL()
  }
}

export async function buildTexture(
  voxels: Voxel[]
): Promise<[string, number, PreparedVoxel[]]> {
  const image = (await new Promise((resolve, reject) => {
    const imageElement = new Image()
    imageElement.src = require('../../../public/curses_square_16x16.png')
    imageElement.onload = () => resolve(imageElement)
    imageElement.onerror = reject
  })) as HTMLImageElement

  const spriteDrawer = new SpriteDrawer(image, 16, 16)
  const terrainList = uniqBy(
    voxels,
    voxel => `${voxel.tile}:${voxel.color}`
  ).map(voxel => {
    spriteDrawer.drawIndex(voxel.tile, voxel.color, voxel.baseColor)
    return {
      key: `${voxel.tile}:${voxel.color}`,
      sprite: spriteDrawer.toDataURL(),
    }
  })

  let terrainRows = _.chunk(terrainList, 16)

  const canvas = document.createElement('canvas')
  canvas.width = 16 * 16
  canvas.height = 16 * terrainRows.length
  var context = canvas.getContext('2d') as CanvasRenderingContext2D

  for (let row = 0; row < terrainRows.length; row++) {
    const terrainRow = terrainRows[row]
    for (let column = 0; column < terrainRow.length; column++) {
      const terrainId = terrainRow[column]
      const imageData = await loadImage(terrainId.sprite)
      context.drawImage(imageData, column * 16, row * 16)
    }
  }

  const keys = terrainList.map(item => item.key)

  const resultVoxels: PreparedVoxel[] = voxels.map(voxel => ({
    ...voxel,
    baseVoxel: voxel,
    textureIndex: keys.indexOf(`${voxel.tile}:${voxel.color}`),
  }))
  console.log('final image', canvas.toDataURL(), resultVoxels)

  return [canvas.toDataURL(), terrainRows.length, resultVoxels]
}
