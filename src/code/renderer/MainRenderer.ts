import * as THREE from 'three'
import * as _ from 'lodash'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Vector3 } from 'three'

export interface RenderInfo {
  triangles: number
  frameDuration: number
}

export class MainRenderer {
  private canvas: HTMLCanvasElement = null as any
  private renderer: THREE.WebGLRenderer = null as any
  private camera: THREE.PerspectiveCamera = null as any
  private controls: OrbitControls = null as any
  private scene: THREE.Scene = null as any
  private onRenderTick?: (renderer: MainRenderer) => Promise<void>
  private renderRequested: undefined | true
  private frameDurations: number[] = []

  public async load(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    console.log('canvas', canvas)
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
      light.position.set(x, y, z)
      scene.add(light)
    }
    addLight(-1, 2, 4)
    addLight(1, -1, -2)

    this.render()

    controls.addEventListener('change', () =>
      this.requestRenderIfNotRequested()
    )
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

  private async render() {
    const startTime = window.performance.now()
    this.renderRequested = undefined

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

  public getPosition(): { x: number; y: number, z: number } {
    return { x: this.controls.target.x, y: -this.controls.target.y, z: this.controls.target.z }
  }

  public setPosition(x: number, y: number, z: number): void {
    this.controls.target.x = x
    this.controls.target.y = -y
    this.controls.target.z = z
    this.requestRenderIfNotRequested()
  }

  public moveZ(z: number) {
    this.controls.target.z += z;
    this.camera.position.z += z;
    this.requestRenderIfNotRequested()
  }

  public teleport(x: number, y: number) {
    const movedX = x - this.controls.target.x
    const movedY = -y - this.controls.target.y
    this.controls.target.x = x
    this.controls.target.y = -y
    this.controls.target.z = 0
    this.camera.position.x += movedX
    this.camera.position.y += movedY
    if (!this.camera.position.z) {
      this.camera.position.z = 10
    }

    console.log('target', this.controls.target, this.camera.position)
    this.requestRenderIfNotRequested()
  }

  public getInfo(): RenderInfo {
    return {
      triangles: this.renderer.info.render.triangles,
      frameDuration: _.sum(this.frameDurations) / this.frameDurations.length,
    }
  }

  public onTick(callback: (renderer: MainRenderer) => Promise<void>) {
    this.onRenderTick = callback
  }

  public addMesh(mesh: THREE.Mesh): void {
    this.scene.add(mesh)
    this.requestRenderIfNotRequested()
  }

  public removeMesh(mesh: THREE.Mesh): void {
    this.scene.remove(mesh)
  }
}

export const mainRenderer = new MainRenderer()
