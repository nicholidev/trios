import { ComponentPropsOptions, defineComponent, watch } from 'vue'
import { BufferGeometry } from 'three'
import { MeshInjectionKey, MeshInterface } from '../meshes/Mesh'

export interface GeometrySetupInterface {
  mesh?: MeshInterface
  geometry?: BufferGeometry
  watchProps?: string[]
}

// function defaultSetup(): GeometryInterface {
//   const mesh = inject('mesh') as MeshInterface
//   const watchProps: string[] = []
//   return { mesh, watchProps }
// }

const Geometry = defineComponent({
  props: {
    rotateX: Number,
    rotateY: Number,
    rotateZ: Number,
  },
  // inject for sub components
  inject: {
    mesh: MeshInjectionKey as symbol,
  },
  setup(): GeometrySetupInterface {
    return {}
  },
  created() {
    if (!this.mesh) {
      console.error('Missing parent Mesh')
      return
    }

    this.createGeometry()
    this.rotateGeometry()
    if (this.geometry) this.mesh.setGeometry(this.geometry)

    Object.keys(this.$props).forEach(prop => {
      // @ts-ignore
      watch(() => this[prop], this.refreshGeometry)
    })
  },
  unmounted() {
    this.geometry?.dispose()
  },
  methods: {
    createGeometry() {},
    rotateGeometry() {
      if (!this.geometry) return
      if (this.rotateX) this.geometry.rotateX(this.rotateX)
      if (this.rotateY) this.geometry.rotateY(this.rotateY)
      if (this.rotateZ) this.geometry.rotateZ(this.rotateZ)
    },
    refreshGeometry() {
      const oldGeo = this.geometry
      this.createGeometry()
      this.rotateGeometry()
      if (this.geometry && this.mesh) this.mesh.setGeometry(this.geometry)
      oldGeo?.dispose()
    },
  },
  render() { return [] },
})

export default Geometry

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function geometryComponent<P extends Readonly<ComponentPropsOptions>>(
  name: string,
  props: P,
  createGeometry: {(c: any): BufferGeometry}
) {
  return defineComponent({
    name,
    extends: Geometry,
    props,
    methods: {
      createGeometry() {
        this.geometry = createGeometry(this)
      },
    },
  })
}
