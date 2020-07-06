import * as _ from 'lodash'
import { voxelTileset } from './VoxelTileset'
import { MapBlock, MatPair, MaterialDefinition } from '../game/DfHack'
import { MAP_SYNCHRONIZER, BLOCK_WIDTH } from '../game/MapSynchronizer'
import * as THREE from 'three'

export interface Voxel {
  x: number
  y: number
  z: number
  height: number
  tile: number
  color: string
  cube: boolean
}

export interface PreparedVoxel {
  x: number
  y: number
  z: number
  height: number
  textureIndex: number
  cube: boolean
}

function colorFromMaterial(matdef: MaterialDefinition) {
  return matdef.stateColor
    ? `#${new THREE.Color(
        matdef.stateColor.red,
        matdef.stateColor.red,
        matdef.stateColor.green
      ).getHexString()}`
    : '#000000'
}

function baseMaterialToVoxel(
  p: THREE.Vector3,
  baseMaterial: MatPair
): Voxel | null {
  const matdef = MAP_SYNCHRONIZER.getMaterial(baseMaterial)
  if (!matdef) {
    return null
  }

  return {
    cube: true,
    height: 1,
    x: p.x,
    y: p.y,
    z: p.z,
    color: colorFromMaterial(matdef),
    tile: matdef ? matdef.tile : 0,
  }
}

export function loadVoxelsFromBlock(block: MapBlock): Voxel[] {
  let x = 0
  let y = 0
  const voxels: Voxel[] = []
  for (const mat of block.baseMaterials) {
    const voxel = baseMaterialToVoxel(
      new THREE.Vector3(block.mapX + x, block.mapY + y, block.mapZ),
      mat
    )

    if (voxel) {
      voxels.push(voxel)
    }

    x++
    if (x >= BLOCK_WIDTH) {
      x = 0
      y++
    }
  }
  return voxels
}
