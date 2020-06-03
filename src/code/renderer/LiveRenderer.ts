import { RenderTile, RenderObject, CubeRenderObject } from './RenderTile'
import { TileMessage } from '../game/GameConnection'
import * as THREE from 'three'
import { mainRenderer } from './MainRenderer'
import { tilesetParser } from '../loader/TilesetParser'
import { buildGeometry, buildMesh, TextureIndexMap } from './MeshBuilder'
import { values, has, floor, flatten, uniq } from 'lodash'
import { Vector3, Mesh } from 'three'
import { buildTexture } from '../loader/TextureBuilder'

const LIVE_CHUNK_SIZE = 12

class LiveChunk {
  public texture: string | undefined;
  public renderTiles: {[position: string]: RenderTile} = {};
  public mesh: Mesh | undefined

  constructor(public x: number, public y: number, public z: number) {}

  public getOrCreate(position: Vector3): RenderTile {
    let result = this.renderTiles[`${position.x}:${position.y}:${position.z}`]
    if (!result) {
      result = new RenderTile()
      this.renderTiles[`${position.x}:${position.y}:${position.z}`] = result
    }
    return result
  }

  public set(position: Vector3, tile: RenderTile): RenderTile {
    return this.renderTiles[`${position.x}:${position.y}:${position.z}`] = tile
  }

  public async redraw(): Promise<void> {
    const newMesh = await liveRenderer.buildMesh(this.getRenderObjects())
    if (this.mesh) {
      mainRenderer.removeMesh(this.mesh)
    }
    mainRenderer.addMesh(newMesh)
    this.mesh = newMesh
  }

  private getRenderObjects(): RenderObject[] {
    return flatten(values(this.renderTiles).map(tile => tile.renderObjects))
  }
}

/**
 * Render a view of the game live as it's being played.
 *
 * This differs from ChunkRenderer in that we need to be able to track
 * and update individual voxels easily. For instance, moving a single
 * tile in the game could update the visibility status of hundreds of
 * individual voxels.
 */
export class LiveRenderer {
  private chunkMap: { [position: string]: LiveChunk} = {}

  private visibleMesh?: THREE.Mesh
  private invisibleMesh?: THREE.Mesh

  private getChunkForPosition(position: Vector3) {
    const x = floor(position.x / LIVE_CHUNK_SIZE)
    const y = floor(position.y / LIVE_CHUNK_SIZE)
    const key = `${x}:${y}:${position.z}`

    if (!has(this.chunkMap, key)) {
      this.chunkMap[key] = new LiveChunk(x, y, position.z)
    }
    return this.chunkMap[key]
  }

  async addTiles(messages: TileMessage[]): Promise<void> {
    let updatedChunks = []
      for (let message of messages) {
        const position = new Vector3(message.position[0], message.position[1], message.position[2])
        const sprite = tilesetParser.spriteMap[message.terrain]
        if (sprite) {
          let chunk = this.getChunkForPosition(position)
          let renderTile = chunk.getOrCreate(position)
          renderTile.renderObjects = [new CubeRenderObject(position, 1, sprite)]
          updatedChunks.push(chunk)
        }
      }
      updatedChunks = uniq(updatedChunks)

      for (let updatedChunk of updatedChunks) {
        await updatedChunk.redraw()
      }
  }

  async buildMesh(renderObjects: RenderObject[]): Promise<THREE.Mesh> {
    console.log('buildmesh', renderObjects)
    const sprites = flatten(renderObjects.map(obj => obj.sprites()))
    const [textureImage, rows] = await buildTexture(
      sprites,
      tilesetParser.spriteWidth,
      tilesetParser.spriteHeight
    )
    console.log('texture', textureImage)
    const textureIndexMap: TextureIndexMap = {}
    for (let sprite of sprites) {
      textureIndexMap[sprite] = sprites.indexOf(sprite);
    }

    const geometry = buildGeometry(renderObjects, rows, textureIndexMap)
    console.log('geometry', geometry, textureImage)
    const [mesh] = await buildMesh(geometry, textureImage)
    return mesh
  }
}

export const liveRenderer = new LiveRenderer()