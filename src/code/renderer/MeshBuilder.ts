import * as THREE from 'three'
import { Texture } from 'three'

import * as _ from 'lodash'
import { RenderObjectTypeUnion, RenderObject, CubeRenderObject } from './RenderTile'

export interface ThreeResource {
  dispose(): void
}

export interface GeometryData {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  indices: number[]
}

export type TextureIndexMap = { [key: string]: number }

export function buildGeometry(
  renderObjects: RenderObject[],
  textureRows: number,
  textureIndexMap: TextureIndexMap
): GeometryData {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let voxel of renderObjects) {
    const x = voxel.position.x
    const y = voxel.position.y
    const z = voxel.position.z

    const uvVoxel = textureIndexMap[voxel.sprites()[0]]
    const uvRow = _.floor(uvVoxel / 16)
    const uvCol = uvVoxel % 16
    let height = 0
    if (voxel instanceof CubeRenderObject) {
      height = voxel.height
    }
    const useFaces = height > 0 ? faces : [faces[2]]
    for (const { dir, corners } of useFaces) {
      const ndx = positions.length / 3
      for (const { pos, uv } of corners) {
        positions.push(pos[0] + x, pos[1] - y, (pos[2] * height + z) * 2.5)
        normals.push(...dir)
        uvs.push((uvCol + uv[0]) / 16, 1 - (uvRow + uv[1]) / textureRows)
      }
      indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3)
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indices,
  }
}

/**
 * Constructs a mesh from the given voxel definition.
 *
 * @return [mesh, resources] A three.js mesh and a list of resources that
 *                           have to be free'd when the mesh is no longer rendered.
 */
export async function buildMesh(
  { positions, normals, uvs, indices }: GeometryData,
  textureImage: string
): Promise<[THREE.Mesh, ThreeResource[]]> {
  const loader = new THREE.TextureLoader()
  const texture = await new Promise<Texture>((resolve, reject) =>
    loader.load(
      textureImage,
      image => resolve(image),
      err => reject(err)
    )
  )
  texture.needsUpdate = true
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter

  const geometry = new THREE.BufferGeometry()
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    side: THREE.DoubleSide,
    alphaTest: 0,
    opacity: 1,
    transparent: false,
  })

  const positionNumComponents = 3
  const normalNumComponents = 3
  const uvNumComponents = 2
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, positionNumComponents)
  )
  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(normals, normalNumComponents)
  )
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, uvNumComponents))
  geometry.setIndex(indices)
  return [new THREE.Mesh(geometry, material), [material, texture, geometry]]
}

const faces = [
  {
    // left
    dir: [-1, 0, 0],
    corners: [
      { pos: [0, 0, 1], uv: [1, 0] },
      { pos: [0, 0, 0], uv: [1, 1] },
      { pos: [0, 1, 1], uv: [0, 0] },
      { pos: [0, 1, 0], uv: [0, 1] },
    ],
  },
  {
    // right
    dir: [1, 0, 0],
    corners: [
      { pos: [1, 1, 1], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [1, 1] },
      { pos: [1, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 0], uv: [0, 1] },
    ],
  },
  {
    // bottom
    dir: [0, 0, -1],
    corners: [
      { pos: [1, 1, 0], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 1] },
      { pos: [1, 0, 0], uv: [0, 0] },
      { pos: [0, 0, 0], uv: [1, 0] },
    ],
  },
  {
    // top
    dir: [0, 1, 0],
    corners: [
      { pos: [0, 1, 1], uv: [0, 0] },
      { pos: [1, 1, 1], uv: [1, 0] },
      { pos: [0, 0, 1], uv: [0, 1] },
      { pos: [1, 0, 1], uv: [1, 1] },
    ],
  },
  {
    // back
    dir: [0, 0, -1],
    corners: [
      { pos: [1, 0, 0], uv: [1, 1] },
      { pos: [0, 0, 0], uv: [0, 1] },
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 0, 1], uv: [0, 0] },
    ],
  },
  {
    // front
    dir: [0, 0, 1],
    corners: [
      { pos: [0, 1, 0], uv: [1, 1] },
      { pos: [1, 1, 0], uv: [0, 1] },
      { pos: [0, 1, 1], uv: [1, 0] },
      { pos: [1, 1, 1], uv: [0, 0] },
    ],
  },
]
