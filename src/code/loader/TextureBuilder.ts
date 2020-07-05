import { SpriteMap, SpriteDrawer } from './TilesetParser'
import * as _ from 'lodash'
import { VoxelBase, Voxel } from './MapDataLoader'
import { uniqBy } from 'lodash'

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

export async function buildTexture(
  voxels: VoxelBase[]
): Promise<[string, number, Voxel[]]> {
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
    spriteDrawer.drawIndex(voxel.tile, voxel.color)
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

  const resultVoxels: Voxel[] = voxels.map(voxel => ({
    ...voxel,
    textureIndex: keys.indexOf(`${voxel.tile}:${voxel.color}`),
  }))
  console.log('final image', canvas.toDataURL(), resultVoxels)

  return [canvas.toDataURL(), terrainRows.length, resultVoxels]
}
