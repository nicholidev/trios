/* eslint-disable no-use-before-define */
import { WebGLRenderer } from 'three'
import { defineComponent, PropType } from 'vue'
import useThree, { SizeInterface, ThreeConfigInterface, ThreeInterface } from './useThree'

type CallbackType<T> = (event?: T) => void

// type EventType = 'init' | 'mounted' | 'beforerender' | 'afterrender' | 'resize'

interface EventInterface {
  type: 'init' | 'mounted'
  renderer: RendererInterface
}

interface RenderEventInterface {
  type: 'beforerender' | 'afterrender'
  renderer: RendererInterface
  time: number
}

interface ResizeEventInterface {
  type: 'resize'
  renderer: RendererInterface
  size: SizeInterface
}

type InitCallbackType = CallbackType<EventInterface>
type MountedCallbackType = CallbackType<EventInterface>
type RenderCallbackType = CallbackType<RenderEventInterface>
type ResizeCallbackType = CallbackType<ResizeEventInterface>

// interface EventMap {
//   'init': EventInterface;
//   'mounted': EventInterface;
//   'beforerender': RenderEventInterface;
//   'afterrender': RenderEventInterface;
//   'resize': ResizeEventInterface;
// }

interface EventCallbackMap {
  'init': InitCallbackType;
  'mounted': MountedCallbackType;
  'beforerender': RenderCallbackType;
  'afterrender': RenderCallbackType;
  'resize': ResizeCallbackType;
}

interface RendererSetupInterface {
  canvas: HTMLCanvasElement
  three: ThreeInterface
  renderer: WebGLRenderer
  size: SizeInterface
  renderFn(): void
  raf: boolean

  // pointerPosition?: Vector2
  // pointerPositionN?: Vector2
  // pointerPositionV3?: Vector3

  initCallbacks: InitCallbackType[]
  mountedCallbacks: MountedCallbackType[]
  beforeRenderCallbacks: RenderCallbackType[]
  afterRenderCallbacks: RenderCallbackType[]
  resizeCallbacks: ResizeCallbackType[]
}

export interface RendererInterface extends RendererSetupInterface {
  onInit(cb: InitCallbackType): void
  onMounted(cb: MountedCallbackType): void

  onBeforeRender(cb: RenderCallbackType): void
  offBeforeRender(cb: RenderCallbackType): void
  onAfterRender(cb: RenderCallbackType): void
  offAfterRender(cb: RenderCallbackType): void

  onResize(cb: ResizeCallbackType): void
  offResize(cb: ResizeCallbackType): void

  addListener<T extends keyof EventCallbackMap>(t: T, cb: EventCallbackMap[T]): void
  removeListener<T extends keyof EventCallbackMap>(t: T, cb: EventCallbackMap[T]): void
}

export default defineComponent({
  name: 'Renderer',
  props: {
    antialias: Boolean,
    alpha: Boolean,
    autoClear: { type: Boolean, default: true },
    orbitCtrl: { type: [Boolean, Object], default: false },
    pointer: { type: [Boolean, Object], default: false },
    resize: { type: [Boolean, String], default: false },
    shadow: Boolean,
    width: String,
    height: String,
    xr: Boolean,
    onReady: Function as PropType<(r: RendererInterface) => void>,
  },
  setup(props): RendererSetupInterface {
    const initCallbacks: InitCallbackType[] = []
    const mountedCallbacks: MountedCallbackType[] = []
    const beforeRenderCallbacks: RenderCallbackType[] = []
    const afterRenderCallbacks: RenderCallbackType[] = []
    const resizeCallbacks: ResizeCallbackType[] = []

    const canvas = document.createElement('canvas')
    const config: ThreeConfigInterface = {
      canvas,
      antialias: props.antialias,
      alpha: props.alpha,
      autoClear: props.autoClear,
      orbitCtrl: props.orbitCtrl,
      pointer: props.pointer,
      resize: props.resize,
    }

    if (props.width) config.width = parseInt(props.width)
    if (props.height) config.height = parseInt(props.height)

    const three = useThree(config)

    const renderFn: {(): void} = () => {}

    return {
      canvas,
      three,
      renderer: three.renderer,
      size: three.size,
      renderFn,
      raf: true,
      initCallbacks,
      mountedCallbacks,
      beforeRenderCallbacks,
      afterRenderCallbacks,
      resizeCallbacks,
    }
  },
  provide() {
    return {
      renderer: this,
      three: this.three,
    }
  },
  mounted() {
    // appendChild won't work on reload
    this.$el.parentNode.insertBefore(this.canvas, this.$el)

    if (this.three.init()) {
      // if (this.three.pointer) {
      //   this.pointerPosition = this.three.pointer.position
      //   this.pointerPositionN = this.three.pointer.positionN
      //   this.pointerPositionV3 = this.three.pointer.positionV3
      // }

      // TODO : don't use config
      this.three.config.onResize = (size) => {
        this.resizeCallbacks.forEach(e => e({ type: 'resize', renderer: this, size }))
      }

      // TODO : improve shadow params
      this.renderer.shadowMap.enabled = this.shadow

      this.renderFn = this.three.composer ? this.three.renderC : this.three.render

      this.initCallbacks.forEach(e => e({ type: 'init', renderer: this }))
      this.onReady?.(this as RendererInterface)

      if (this.xr) {
        this.renderer.xr.enabled = true
        this.renderer.setAnimationLoop(this.render)
      } else {
        requestAnimationFrame(this.renderLoop)
      }
    }

    this.mountedCallbacks.forEach(e => e({ type: 'mounted', renderer: this }))
  },
  beforeUnmount() {
    this.canvas.remove()
    this.beforeRenderCallbacks = []
    this.afterRenderCallbacks = []
    this.raf = false
    this.three.dispose()
  },
  methods: {
    onInit(cb: InitCallbackType) { this.addListener('init', cb) },
    onMounted(cb: MountedCallbackType) { this.addListener('mounted', cb) },
    onBeforeRender(cb: RenderCallbackType) { this.addListener('beforerender', cb) },
    offBeforeRender(cb: RenderCallbackType) { this.removeListener('beforerender', cb) },
    onAfterRender(cb: RenderCallbackType) { this.addListener('afterrender', cb) },
    offAfterRender(cb: RenderCallbackType) { this.removeListener('afterrender', cb) },
    onResize(cb: ResizeCallbackType) { this.addListener('resize', cb) },
    offResize(cb: ResizeCallbackType) { this.removeListener('resize', cb) },
    addListener(type: string, cb: {(): void}) {
      const callbacks = this.getCallbacks(type)
      callbacks.push(cb)
    },
    removeListener(type: string, cb: {(): void}) {
      const callbacks = this.getCallbacks(type)
      const index = callbacks.indexOf(cb)
      if (index) callbacks.splice(index, 1)
    },
    getCallbacks(type: string) {
      if (type === 'init') {
        return this.initCallbacks
      } else if (type === 'mounted') {
        return this.mountedCallbacks
      } else if (type === 'beforerender') {
        return this.beforeRenderCallbacks
      } else if (type === 'afterrender') {
        return this.afterRenderCallbacks
      } else {
        return this.resizeCallbacks
      }
    },
    render(time: number) {
      this.beforeRenderCallbacks.forEach(e => e({ type: 'beforerender', renderer: this, time }))
      // this.onFrame?.(cbParams)
      this.renderFn()
      this.afterRenderCallbacks.forEach(e => e({ type: 'afterrender', renderer: this, time }))
    },
    renderLoop(time: number) {
      if (this.raf) requestAnimationFrame(this.renderLoop)
      this.render(time)
    },
  },
  render() {
    return this.$slots.default ? this.$slots.default() : []
  },
  __hmrId: 'Renderer',
})
