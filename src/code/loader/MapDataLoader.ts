import * as _ from 'lodash'
import { SpriteMap } from './TilesetParser'
import { voxelTileset } from './VoxelTileset'

export interface Voxel {
  x: number
  y: number
  z: number
  height: number
  textureIndex: number
  cube: boolean
}

export class MapDataLoader {
  private async loadSubmap(
    json: any,
    spriteMap: SpriteMap,
    terrainList: string[],
    terrainIndexMap: { [key: string]: number },
    baseX: number,
    baseY: number,
    objects: Voxel[]
  ): Promise<Voxel[]> {
    const offsetX: number = json.coordinates[0] - baseX
    const offsetY: number = json.coordinates[1] - baseY
    let offsetZ: number = json.coordinates[2]
    let i = 0
    for (let item of json.terrain) {
      let terrainId, count
      if (_.isArray(item)) {
        terrainId = item[0]
        count = item[1]
      } else {
        terrainId = item
        count = 1
      }
      if (!_.has(spriteMap, terrainId) || voxelTileset.dontDraw(terrainId)) {
        i += count
        continue
      }
      let textureIndex = terrainIndexMap[terrainId]
      if (textureIndex === undefined) {
        textureIndex = terrainList.length
        terrainIndexMap[terrainId] = textureIndex
        terrainList.push(terrainId)
      }

      const height = voxelTileset.height(terrainId)

      for (let j = 0; j < count; j++) {
        const y = _.floor(i / 12)
        const x = i % 12
        objects.push({
          x: x + offsetX * 12,
          y: y + offsetY * 12,
          z: offsetZ * 1.001,
          textureIndex: textureIndex,
          cube: height > 0,
          height: height,
        })
        i++
      }
    }
    return objects
  }

  async loadSubmapsFromJSON(
    submaps: any[],
    spriteMap: SpriteMap,
    terrainList: string[],
    terrainIndexMap: { [key: string]: number },
    baseX: number,
    baseY: number
  ): Promise<Voxel[]> {
    let objects: Voxel[] = []

    for (let submap of submaps) {
      await this.loadSubmap(
        submap,
        spriteMap,
        terrainList,
        terrainIndexMap,
        baseX,
        baseY,
        objects
      )
    }

    return objects
  }
}

export const mapDataLoader = new MapDataLoader()
