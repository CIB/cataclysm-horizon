import { Mesh, Vector3 } from 'three'

export interface RenderObject {
  position: Vector3
  type: string

  sprites(): string[]
}

export class CubeRenderObject implements RenderObject {
  public readonly type = 'cube'

  constructor(
    public position: Vector3,
    public height: number,
    public sprite: string
  ) {}

  sprites(): string[] {
    return [this.sprite]
  }
}

export class SpriteRenderObject implements RenderObject {
  public readonly type = 'sprite'

  constructor(
    public position: Vector3,
    public height: number,
    public sprite: string
  ) {}

  sprites(): string[] {
    return [this.sprite]
  }
}

export type RenderObjectTypeUnion = CubeRenderObject | SpriteRenderObject

export class RenderTile {
  mesh?: Mesh = undefined
  renderObjects: RenderObjectTypeUnion[] = []
  visible: boolean = false
  opacity: number = 1.0
}
