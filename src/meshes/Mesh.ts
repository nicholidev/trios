import { ComponentPropsOptions, defineComponent, InjectionKey, watch } from 'vue'
import { BufferGeometry, Material, Mesh as TMesh } from 'three'
import Object3D, { Object3DSetupInterface } from '../core/Object3D'
import { bindProp } from '../tools'

export const pointerProps = {
  onPointerEnter: Function,
  onPointerOver: Function,
  onPointerMove: Function,
  onPointerLeave: Function,
  onPointerDown: Function,
  onPointerUp: Function,
  onClick: Function,
}

export interface MeshSetupInterface extends Object3DSetupInterface {
  mesh?: TMesh
  geometry?: BufferGeometry
  material?: Material
  loading?: boolean
}

export interface MeshInterface extends MeshSetupInterface {
  setGeometry(g: BufferGeometry): void
  setMaterial(m: Material): void
}

export const MeshInjectionKey: InjectionKey<MeshInterface> = Symbol('Mesh')

const Mesh = defineComponent({
  name: 'Mesh',
  extends: Object3D,
  props: {
    castShadow: Boolean,
    receiveShadow: Boolean,
    ...pointerProps,
  },
  setup(): MeshSetupInterface {
    return {}
  },
  provide() {
    return {
      [MeshInjectionKey as symbol]: this,
    }
  },
  mounted() {
    // TODO : proper ?
    if (!this.mesh && !this.loading) this.initMesh()
  },
  methods: {
    initMesh() {
      const mesh = new TMesh(this.geometry, this.material)
      mesh.userData.component = this

      bindProp(this, 'castShadow', mesh)
      bindProp(this, 'receiveShadow', mesh)

      if (this.onPointerEnter ||
        this.onPointerOver ||
        this.onPointerMove ||
        this.onPointerLeave ||
        this.onPointerDown ||
        this.onPointerUp ||
        this.onClick) {
        if (this.renderer) this.renderer.three.addIntersectObject(mesh)
      }

      this.mesh = mesh
      this.initObject3D(mesh)
    },
    createGeometry() {},
    addGeometryWatchers(props: ComponentPropsOptions) {
      Object.keys(props).forEach(prop => {
        // @ts-ignore
        watch(() => this[prop], () => {
          this.refreshGeometry()
        })
      })
    },
    setGeometry(geometry: BufferGeometry) {
      this.geometry = geometry
      if (this.mesh) this.mesh.geometry = geometry
    },
    setMaterial(material: Material) {
      this.material = material
      if (this.mesh) this.mesh.material = material
    },
    refreshGeometry() {
      const oldGeo = this.geometry
      this.createGeometry()
      if (this.mesh && this.geometry) this.mesh.geometry = this.geometry
      oldGeo?.dispose()
    },
  },
  unmounted() {
    if (this.mesh) {
      if (this.renderer) this.renderer.three.removeIntersectObject(this.mesh)
    }
    // for predefined mesh (geometry/material are not unmounted)
    if (this.geometry) this.geometry.dispose()
    if (this.material) this.material.dispose()
  },
  __hmrId: 'Mesh',
})

export default Mesh

// @ts-ignore
export function meshComponent(name, props, createGeometry) {
  return defineComponent({
    name,
    extends: Mesh,
    props,
    setup(): MeshSetupInterface {
      return {}
    },
    created() {
      this.createGeometry()
      this.addGeometryWatchers(props)
    },
    methods: {
      createGeometry() {
        this.geometry = createGeometry(this)
      },
    },
    // __hmrId: name,
  })
}
