import { Voxel, mapDataLoader } from './MapDataLoader'
import { SpriteMap, tilesetParser } from './TilesetParser'
import * as _ from 'lodash'
import { buildTexture } from './TextureBuilder'

export class ChunkLoader {
  async loadVoxels(
    submaps: any[]
  ): Promise<{ objects: Voxel[]; texture: string; textureRows: number }> {
    const terrainList: string[] = []
    const terrainIndexMap: { [key: string]: number } = {}
    const baseX = 0
    const baseY = 0
    let objects: Voxel[] = await mapDataLoader.loadSubmapsFromJSON(
      submaps,
      tilesetParser.spriteMap,
      terrainList,
      terrainIndexMap,
      baseX,
      baseY
    )

    if (!objects.length) {
      return {
        objects: objects,
        texture: null as any,
        textureRows: 0,
      }
    }

    const [texture, textureRows] = await buildTexture(
      terrainList,
      tilesetParser.spriteMap,
      tilesetParser.spriteWidth,
      tilesetParser.spriteHeight
    )
    return {
      objects: objects,
      texture: texture,
      textureRows: textureRows,
    }
  }
}

export const chunkLoader = new ChunkLoader()
