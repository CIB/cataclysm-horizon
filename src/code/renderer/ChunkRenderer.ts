import * as THREE from 'three'
import * as _ from 'lodash'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { chunkCache } from '../ChunkCache'
import { Object3D, Vector3 } from 'three'
import { PreparedVoxel } from '../loader/VoxelLoader'

export interface RenderInfo {
  triangles: number
  frameDuration: number
}

export class ChunkRenderer {
  private canvas: HTMLCanvasElement = null as any
  private renderer: THREE.WebGLRenderer = null as any
  private camera: THREE.PerspectiveCamera = null as any
  private controls: OrbitControls = null as any
  private scene: THREE.Scene = null as any
  private onRenderTick?: (renderer: ChunkRenderer) => Promise<void>
  private renderRequested: undefined | true
  private frameDurations: number[] = []
  public voxelMap: { [position: string]: PreparedVoxel } = {}
  private highlightBlock: THREE.Mesh = null as any
  private mouseX = 0
  private mouseY = 0

  public debugInfo = ''

  public attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  public async load() {
    window.addEventListener('mousemove', event => {
      this.mouseX = event.clientX
      this.mouseY = event.clientY
      this.updateHighlightedVoxel()
      this.requestRenderIfNotRequested()
    })

    const canvas = this.canvas
    const renderer = (this.renderer = new THREE.WebGLRenderer({ canvas }))
    renderer.setPixelRatio(2)

    const fov = 75
    const aspect = 1
    const near = 0.5
    const far = 5000
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    this.camera = camera
    camera.up.set(0, 0, 1)

    const controls = (this.controls = new OrbitControls(camera, canvas))
    controls.enableDamping = true
    controls.keyPanSpeed = 200
    controls.dampingFactor = 0.3
    controls.update()

    const scene = (this.scene = new THREE.Scene())
    scene.background = new THREE.Color('lightblue')

    function addLight(x: number, y: number, z: number) {
      const color = 0xffffff
      const intensity = 1
      const light = new THREE.DirectionalLight(color, intensity)
      const targetObject = new Object3D()
      targetObject.position.set(x, y, z)
      // light.position.set(x, y, z)
      scene.add(light)
    }
    //addLight(0, 0, -400)
    // addLight(1, -1, -2)
    const light = new THREE.AmbientLight(0xffffff, 1)
    scene.add(light)

    this.createHighlightBlock()

    controls.addEventListener('change', () =>
      this.requestRenderIfNotRequested()
    )
  }

  private createHighlightBlock() {
    const geometry = new THREE.BoxBufferGeometry(1.05, 1.05, 1.05)
    const wireFrameGeometry = new THREE.EdgesGeometry(geometry) // or WireframeGeometry
    const wireFrameMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 40,
    })
    const mesh = new THREE.Mesh()
    mesh.add(new THREE.LineSegments(wireFrameGeometry, wireFrameMaterial))
    this.scene.add(mesh)
    this.highlightBlock = mesh
    this.highlightBlock.position.set(80, -80, 141)
  }

  private resizeRendererToDisplaySize(renderer: THREE.Renderer) {
    const canvas = renderer.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needResize = canvas.width !== width || canvas.height !== height
    if (needResize) {
      renderer.setSize(width, height, false)
    }
    return needResize
  }

  private getCanvasRelativePosition(x, y) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: ((x - rect.left) * this.canvas.width) / rect.width,
      y: ((y - rect.top) * this.canvas.height) / rect.height,
    }
  }

  private updateHighlightedVoxel() {
    const pos = this.getCanvasRelativePosition(this.mouseX, this.mouseY)
    const x = (pos.x / this.canvas.width) * 2 - 1
    const y = (pos.y / this.canvas.height) * -2 + 1 // note we flip Y

    const start = new THREE.Vector3()
    const end = new THREE.Vector3()
    start.setFromMatrixPosition(this.camera.matrixWorld)
    end.set(x, y, 1).unproject(this.camera)

    // Find the voxel the cursor is currently hovering over
    const highlightVoxel = this.intersectRay(start, end)
    if (highlightVoxel) {
      this.highlightBlock.position.set(
        highlightVoxel.x + 0.5,
        -highlightVoxel.y + 0.5,
        highlightVoxel.z + 0.5
      )

      this.debugInfo = JSON.stringify(highlightVoxel.baseVoxel)
    }
  }

  private async render() {
    const startTime = window.performance.now()
    this.renderRequested = undefined

    this.updateHighlightedVoxel()

    if (this.resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight
      this.camera.updateProjectionMatrix()
    }

    this.controls.update()
    if (this.onRenderTick) {
      await this.onRenderTick(this)
    }
    this.renderer.render(this.scene, this.camera)
    this.frameDurations.push(window.performance.now() - startTime)
    this.frameDurations = _.takeRight(this.frameDurations, 60)
  }

  private requestRenderIfNotRequested() {
    if (!this.renderRequested) {
      this.renderRequested = true
      requestAnimationFrame(() => this.render())
    }
  }

  public getPosition(): { x: number; y: number; z: number } {
    return {
      x: this.controls.target.x,
      y: -this.controls.target.y,
      z: this.controls.target.z,
    }
  }

  public setPosition(x: number, y: number, z: number): void {
    this.controls.target.x = x
    this.controls.target.y = -y
    this.controls.target.z = z
    this.requestRenderIfNotRequested()
  }

  public moveZ(z: number) {
    this.controls.target.z += z
    this.camera.position.z += z
    this.requestRenderIfNotRequested()
  }

  public teleport(x: number, y: number) {
    this.controls.target.x = x
    this.controls.target.y = -y
    this.controls.target.z = 158
    this.camera.position.x = x
    this.camera.position.y = -y
    this.camera.position.z = 165
    this.requestRenderIfNotRequested()
  }

  public getInfo(): RenderInfo {
    return {
      triangles: this.renderer.info.render.triangles,
      frameDuration: _.sum(this.frameDurations) / this.frameDurations.length,
    }
  }

  public onTick(callback: (renderer: ChunkRenderer) => Promise<void>) {
    this.onRenderTick = callback
  }

  public addMesh(mesh: THREE.Mesh, voxels: PreparedVoxel[]): void {
    this.scene.add(mesh)
    this.requestRenderIfNotRequested()

    for (let voxel of voxels) {
      this.voxelMap[`${voxel.x}:${voxel.y}:${voxel.z}`] = voxel
    }
  }

  public removeMesh(mesh: THREE.Mesh, voxels: PreparedVoxel[]): void {
    this.scene.remove(mesh)
    for (let voxel of voxels) {
      delete this.voxelMap[`${voxel.x}:${voxel.y}:${voxel.z}`]
    }
  }

  private getVoxel(x: number, y: number, z: number): PreparedVoxel {
    return this.voxelMap[`${x}:${-y}:${z}`]
  }

  // http://www.cse.chalmers.se/edu/year/2010/course/TDA361/grid.pdf
  private intersectRay(start: Vector3, end: Vector3): PreparedVoxel {
    let dx = end.x - start.x
    let dy = end.y - start.y
    let dz = end.z - start.z
    const lenSq = dx * dx + dy * dy + dz * dz
    const len = Math.sqrt(lenSq) * 10

    dx /= len
    dy /= len
    dz /= len

    let t = 0.0
    let ix = Math.floor(start.x)
    let iy = Math.floor(start.y)
    let iz = Math.floor(start.z)

    const stepX = dx > 0 ? 1 : -1
    const stepY = dy > 0 ? 1 : -1
    const stepZ = dz > 0 ? 1 : -1

    const txDelta = Math.abs(1 / dx)
    const tyDelta = Math.abs(1 / dy)
    const tzDelta = Math.abs(1 / dz)

    const xDist = stepX > 0 ? ix + 1 - start.x : start.x - ix
    const yDist = stepY > 0 ? iy + 1 - start.y : start.y - iy
    const zDist = stepZ > 0 ? iz + 1 - start.z : start.z - iz

    let txMax = txDelta < Infinity ? txDelta * xDist : Infinity
    let tyMax = tyDelta < Infinity ? tyDelta * yDist : Infinity
    let tzMax = tzDelta < Infinity ? tzDelta * zDist : Infinity

    let steppedIndex = -1

    while (t <= len) {
      const voxel = this.getVoxel(ix, iy, iz)
      if (voxel) {
        return voxel
        // return {
        //   position: [start.x + t * dx, start.y + t * dy, start.z + t * dz],
        //   normal: [
        //     steppedIndex === 0 ? -stepX : 0,
        //     steppedIndex === 1 ? -stepY : 0,
        //     steppedIndex === 2 ? -stepZ : 0,
        //   ],
        //   voxel,
        // }
      }

      if (txMax < tyMax) {
        if (txMax < tzMax) {
          ix += stepX
          t = txMax
          txMax += txDelta
          steppedIndex = 0
        } else {
          iz += stepZ
          t = tzMax
          tzMax += tzDelta
          steppedIndex = 2
        }
      } else {
        if (tyMax < tzMax) {
          iy += stepY
          t = tyMax
          tyMax += tyDelta
          steppedIndex = 1
        } else {
          iz += stepZ
          t = tzMax
          tzMax += tzDelta
          steppedIndex = 2
        }
      }
    }
    return null
  }
}

export const chunkRenderer = new ChunkRenderer()
