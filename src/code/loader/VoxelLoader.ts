import * as _ from 'lodash'
import { voxelTileset } from './VoxelTileset'
import { MapBlock, MatPair, MaterialDefinition } from '../game/DfHack'
import {
  MAP_SYNCHRONIZER,
  BLOCK_WIDTH,
  BLOCK_DEPTH,
} from '../game/MapSynchronizer'
import * as THREE from 'three'

export interface Voxel {
  x: number
  y: number
  z: number
  height: number
  tile: number
  color: string
  baseColor: string
  cube: boolean
  material: MaterialDefinition
  baseMaterial: MaterialDefinition
  transparency: number
}

export interface PreparedVoxel {
  x: number
  y: number
  z: number
  height: number
  textureIndex: number
  cube: boolean
  baseVoxel: Voxel
}

function colorFromMaterial(matdef: MaterialDefinition) {
  return matdef.stateColor
    ? `#${new THREE.Color(
        matdef.stateColor.red / 255,
        matdef.stateColor.green / 255,
        matdef.stateColor.blue / 255
      ).getHexString()}`
    : '#000000'
}

function createVoxel(p: THREE.Vector3, tile: number, color: string): Voxel {
  return {
    cube: true,
    height: 1,
    x: p.x,
    y: p.y,
    z: p.z,
    color: color,
    tile: tile,
  } as Voxel
}

export function loadVoxelsFromBlock(block: MapBlock): Voxel[] {
  let x = 0
  let y = 0
  const voxels: Voxel[] = []
  for (let x = 0; x < BLOCK_WIDTH; x++) {
    for (let y = 0; y < BLOCK_DEPTH; y++) {
      const index = y * BLOCK_WIDTH + x
      if (block.hidden[index]) {
        continue
      }

      let matdef = MAP_SYNCHRONIZER.getMaterial(block.materials[index])
      if (block.constructionItems[index].matIndex !== -1) {
        matdef = MAP_SYNCHRONIZER.getMaterial(block.constructionItems[index])
      }
      const veinMatdef = MAP_SYNCHRONIZER.getMaterial(
        block.veinMaterials[index]
      )
      let transparency = 0
      if (!matdef || !veinMatdef) {
        continue
      }
      let tile = matdef.tile
      let color = colorFromMaterial(matdef)
      if (matdef.id.startsWith('PLANT') && matdef.id.endsWith('STRUCTURAL')) {
        tile = block.tiles[index]
        color = '#ffffff'
        transparency = 0.9
      }
      // const tile = 219
      const baseColor = colorFromMaterial(veinMatdef)
      voxels.push({
        ...createVoxel(
          new THREE.Vector3(block.mapX + x, block.mapY + y, block.mapZ),
          tile,
          color
        ),
        material: matdef,
        baseColor,
        baseMaterial: MAP_SYNCHRONIZER.getMaterial(block.baseMaterials[index]),
        transparency,
      })
    }
  }
  return voxels
}
