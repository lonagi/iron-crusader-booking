import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export interface SceneTable {
  id: number
  number: string
  available: boolean
}

export interface ClubScene {
  highlight: (id: number | null) => void
  setAvailability: (tables: SceneTable[]) => void
  zoom: (factor: number) => void
  reset: () => void
  dispose: () => void
}

interface SceneOptions {
  canvas: HTMLCanvasElement
  container: HTMLElement
  tables: SceneTable[]
  theme: 'dark' | 'light'
  onPick: (id: number) => void
  onHover: (id: number | null) => void
  onError: () => void
}

/** Renders only when the camera, viewport or table state changes. No idle animation. */
export function createClubScene({ canvas, container, tables, theme, onPick, onHover, onError }: SceneOptions): ClubScene {
  const dark = theme === 'dark'
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(dark ? '#161719' : '#e6e1d8')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = dark ? 1.45 : 1.25

  const columns = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(tables.length * 1.4))))
  const rows = Math.ceil(tables.length / columns)
  const roomWidth = columns * 3.8 + 2.1
  const roomDepth = rows * 3.5 + 2.3
  const extent = Math.max(roomWidth, roomDepth)
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, extent * 12)
  camera.position.set(extent * 0.95, extent * 1.15, extent * 1.2)
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0.65, 0)
  controls.enablePan = false
  controls.enableDamping = false
  controls.minPolarAngle = 0.2
  controls.maxPolarAngle = 1.22
  controls.minAzimuthAngle = -0.7
  controls.maxAzimuthAngle = 1.4
  controls.minZoom = 0.65
  controls.maxZoom = 2.8
  controls.rotateSpeed = 0.65
  controls.zoomSpeed = 0.8
  controls.update()
  controls.saveState()

  let disposed = false
  let pendingFrame = 0
  function requestRender() {
    if (disposed || pendingFrame) return
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0
      if (!disposed) renderer.render(scene, camera)
    })
  }
  controls.addEventListener('change', requestRender)

  const materials: THREE.Material[] = []
  function material(color: string, roughness = 0.85, metalness = 0) {
    const value = new THREE.MeshStandardMaterial({ color, roughness, metalness })
    materials.push(value)
    return value
  }
  const stone = material(dark ? '#383a3d' : '#b5b1a8')
  const floor = material(dark ? '#4a4640' : '#bfb5a3')
  const wall = material(dark ? '#343237' : '#c9c3b7')
  const trim = material(dark ? '#181a1c' : '#686966', 0.55, 0.25)
  const timber = material('#5d4233')
  const chair = material(dark ? '#34363a' : '#666765')
  const brass = material('#ab8253', 0.4, 0.5)
  const parchment = material('#d8c9a3')
  const red = material('#9f3834')
  const mats = [material('#635f52'), material('#626a68'), material('#6d6051')]

  function box(parent: THREE.Object3D, width: number, height: number, depth: number, x: number, y: number, z: number, surface: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), surface)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  function cylinder(parent: THREE.Object3D, radius: number, height: number, x: number, y: number, z: number, surface: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), surface)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  function label(text: string, foreground: string, background: string, width = 256, height = 128) {
    const image = document.createElement('canvas')
    image.width = width
    image.height = height
    const context = image.getContext('2d')!
    context.fillStyle = background
    context.fillRect(0, 0, width, height)
    context.fillStyle = foreground
    context.font = `600 ${Math.round(height * 0.48)}px sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, width / 2, height / 2, width - 24)
    const texture = new THREE.CanvasTexture(image)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  scene.add(new THREE.HemisphereLight('#fff2de', dark ? '#3c4049' : '#807969', 2.6))
  const sunlight = new THREE.DirectionalLight('#ffe4c0', 3.8)
  sunlight.position.set(4, extent, 7)
  sunlight.castShadow = true
  sunlight.shadow.mapSize.set(2048, 2048)
  sunlight.shadow.camera.left = -extent
  sunlight.shadow.camera.right = extent
  sunlight.shadow.camera.top = extent
  sunlight.shadow.camera.bottom = -extent
  sunlight.shadow.camera.far = extent * 4
  sunlight.shadow.normalBias = 0.04
  sunlight.shadow.bias = -0.0001
  scene.add(sunlight)
  const fill = new THREE.DirectionalLight('#c7d8f5', 1.8)
  fill.position.set(-8, 5, -2)
  scene.add(fill)

  box(scene, roomWidth + 0.25, 0.35, roomDepth + 0.25, 0, -0.24, 0, trim)
  box(scene, roomWidth, 0.12, roomDepth, 0, 0, 0, floor)
  // Low walls keep the table surfaces visible at every supported camera angle.
  box(scene, roomWidth, 2.1, 0.18, 0, 1.08, -roomDepth / 2, wall)
  box(scene, 0.18, 2.1, roomDepth, -roomWidth / 2, 1.08, 0, wall)
  box(scene, roomWidth, 0.12, 0.25, 0, 2.17, -roomDepth / 2, trim)
  box(scene, 0.25, 0.12, roomDepth, -roomWidth / 2, 2.17, 0, trim)
  box(scene, roomWidth, 0.18, 0.2, 0, 0.2, -roomDepth / 2 + 0.04, trim)
  box(scene, 0.2, 0.18, roomDepth, -roomWidth / 2 + 0.04, 0.2, 0, trim)

  const grid = new THREE.GridHelper(Math.max(roomWidth, roomDepth), Math.ceil(Math.max(roomWidth, roomDepth)), dark ? '#656159' : '#a3998c', dark ? '#56524b' : '#b2a797')
  grid.position.y = 0.067
  grid.scale.set(roomWidth / extent, 1, roomDepth / extent)
  scene.add(grid)

  // A wall sign and storage shelf give the space a club-room scale.
  const signTexture = label('IRON CRUSADER', '#e4dccb', '#762e2d', 1024, 160)
  const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture })
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.53), signMaterial)
  sign.position.set(0, 1.6, -roomDepth / 2 + 0.11)
  scene.add(sign)
  for (let i = 0; i < Math.min(columns, 3); i++) {
    const x = (i - (Math.min(columns, 3) - 1) / 2) * 2.25
    box(scene, 1.7, 0.65, 0.4, x, 0.48, -roomDepth / 2 + 0.37, timber)
    box(scene, 1.8, 0.09, 0.48, x, 0.85, -roomDepth / 2 + 0.37, trim)
    for (let book = 0; book < 6; book++) {
      box(scene, 0.15, 0.24 + (book % 3) * 0.04, 0.22, x - 0.6 + book * 0.19, 1, -roomDepth / 2 + 0.32, book % 2 ? red : parchment)
    }
  }

  const tableGroups: THREE.Object3D[] = []
  const accents = new Map<number, THREE.MeshStandardMaterial>()
  let highlighted: number | null = null
  for (let index = 0; index < tables.length; index++) {
    const table = tables[index]
    const group = new THREE.Group()
    group.userData.tableId = table.id
    group.position.set((index % columns - (columns - 1) / 2) * 3.8, 0, (Math.floor(index / columns) - (rows - 1) / 2) * 3.5 + 0.35)
    scene.add(group)
    tableGroups.push(group)

    const accent = material(table.available ? '#a6463c' : '#666763', 0.5, 0.1)
    accents.set(table.id, accent)
    box(group, 2.55, 0.13, 1.86, 0, 1, 0, timber)
    box(group, 2.45, 0.045, 1.76, 0, 1.09, 0, accent)
    box(group, 2.23, 0.035, 1.55, 0, 1.13, 0, mats[index % mats.length])
    for (const x of [-1.05, 1.05]) for (const z of [-0.67, 0.67]) box(group, 0.12, 0.87, 0.12, x, 0.49, z, trim)

    // Playable terrain, dice, and miniatures built from lightweight geometry.
    for (let terrain = 0; terrain < 3; terrain++) {
      const x = -0.69 + terrain * 0.68
      const z = terrain % 2 ? -0.37 : 0.25
      const height = 0.2 + ((index + terrain) % 3) * 0.1
      box(group, 0.45, height, 0.25, x, 1.16 + height / 2, z, stone)
      box(group, 0.11, height + 0.15, 0.25, x - 0.17, 1.2 + height / 2, z, stone)
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), stone)
      rock.position.set(x + 0.12, 1.21, z + 0.28)
      rock.scale.set(1.2, 0.65, 0.8)
      rock.castShadow = true
      group.add(rock)
    }
    for (let miniature = 0; miniature < 4; miniature++) {
      const x = -0.83 + miniature * 0.53
      const z = miniature % 2 ? -0.6 : 0.57
      cylinder(group, 0.07, 0.03, x, 1.17, z, trim)
      cylinder(group, 0.028, 0.13, x, 1.24, z, miniature % 2 ? brass : red)
    }
    box(group, 0.27, 0.012, 0.22, 0.95, 1.17, 0.5, parchment)
    box(group, 0.1, 0.1, 0.1, 0.79, 1.2, 0.59, red)
    for (const z of [-1.25, 1.25]) for (const x of [-0.65, 0.65]) {
      box(group, 0.5, 0.1, 0.43, x, 0.52, z, chair)
      box(group, 0.5, 0.45, 0.08, x, 0.75, z + Math.sign(z) * 0.19, chair)
      for (const legX of [-0.18, 0.18]) for (const legZ of [-0.14, 0.14]) box(group, 0.055, 0.45, 0.055, x + legX, 0.27, z + legZ, trim)
    }

    const numberMaterial = new THREE.SpriteMaterial({ map: label(table.number, '#f6eede', '#34302d'), depthTest: false })
    const number = new THREE.Sprite(numberMaterial)
    number.position.set(0, 1.95, 0)
    number.scale.set(0.78, 0.39, 1)
    number.renderOrder = 2
    group.add(number)
  }

  function highlight(id: number | null) {
    highlighted = id
    for (const [tableId, accent] of accents) {
      accent.emissive.set(tableId === id ? '#c55240' : '#000000')
      accent.emissiveIntensity = tableId === id ? 0.85 : 0
    }
    requestRender()
  }
  function setAvailability(next: SceneTable[]) {
    for (const table of next) {
      accents.get(table.id)?.color.set(table.available ? '#a6463c' : '#666763')
    }
    requestRender()
  }

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pointerStart: { id: number; x: number; y: number } | null = null
  let moved = false
  const activePointers = new Set<number>()
  function intersect(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(tableGroups, true)[0]
    let target: THREE.Object3D | null = hit?.object ?? null
    while (target && target.userData.tableId === undefined) target = target.parent
    return typeof target?.userData.tableId === 'number' ? target.userData.tableId as number : null
  }
  function pointerDown(event: PointerEvent) {
    activePointers.add(event.pointerId)
    if (activePointers.size > 1) { moved = true; return }
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY }
    moved = false
    canvas.focus({ preventScroll: true })
  }
  function pointerMove(event: PointerEvent) {
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) moved = true
    if (event.pointerType === 'touch' || activePointers.size) return
    const id = intersect(event)
    canvas.style.cursor = id !== null ? 'pointer' : 'grab'
    if (highlighted !== id) { highlight(id); onHover(id) }
  }
  function pointerUp(event: PointerEvent) {
    activePointers.delete(event.pointerId)
    if (pointerStart?.id === event.pointerId && !moved && event.button === 0) {
      const id = intersect(event)
      if (id !== null) onPick(id)
    }
    if (!activePointers.size) pointerStart = null
  }
  function pointerCancel(event: PointerEvent) { activePointers.delete(event.pointerId); pointerStart = null; moved = true }
  function pointerLeave() { if (!activePointers.size) { highlight(null); onHover(null) } }
  function zoom(factor: number) {
    camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom)
    camera.updateProjectionMatrix()
    controls.update()
    requestRender()
  }
  function reset() { controls.reset(); requestRender() }
  function keyDown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === '+' || event.key === '=') zoom(1.15)
    else if (event.key === '-') zoom(1 / 1.15)
    else if (event.key.toLowerCase() === 'r' || event.key === 'Home') reset()
    else if (event.key.startsWith('Arrow')) {
      const offset = camera.position.clone().sub(controls.target)
      const spherical = new THREE.Spherical().setFromVector3(offset)
      if (event.key === 'ArrowLeft') spherical.theta -= 0.12
      if (event.key === 'ArrowRight') spherical.theta += 0.12
      if (event.key === 'ArrowUp') spherical.phi -= 0.1
      if (event.key === 'ArrowDown') spherical.phi += 0.1
      spherical.theta = THREE.MathUtils.clamp(spherical.theta, controls.minAzimuthAngle, controls.maxAzimuthAngle)
      spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle)
      camera.position.copy(controls.target).add(offset.setFromSpherical(spherical))
      controls.update()
      requestRender()
    } else return
    event.preventDefault()
  }
  function contextLost(event: Event) { event.preventDefault(); onError() }
  canvas.addEventListener('pointerdown', pointerDown)
  canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerup', pointerUp)
  canvas.addEventListener('pointercancel', pointerCancel)
  canvas.addEventListener('pointerleave', pointerLeave)
  canvas.addEventListener('keydown', keyDown)
  canvas.addEventListener('webglcontextlost', contextLost)

  function resize() {
    const width = Math.max(1, container.clientWidth)
    const height = Math.max(1, container.clientHeight)
    const aspect = width / height
    const viewHeight = Math.max(roomDepth * 0.75 + roomWidth * 0.3, (roomWidth * 0.92 + roomDepth * 0.65) / aspect) * 0.78
    camera.left = -viewHeight * aspect / 2
    camera.right = viewHeight * aspect / 2
    camera.top = viewHeight / 2
    camera.bottom = -viewHeight / 2
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    requestRender()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()

  return {
    highlight, setAvailability, zoom, reset,
    dispose() {
      disposed = true
      cancelAnimationFrame(pendingFrame)
      observer.disconnect()
      controls.removeEventListener('change', requestRender)
      controls.dispose()
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('pointercancel', pointerCancel)
      canvas.removeEventListener('pointerleave', pointerLeave)
      canvas.removeEventListener('keydown', keyDown)
      canvas.removeEventListener('webglcontextlost', contextLost)
      const geometries = new Set<THREE.BufferGeometry>()
      const surfaces = new Set<THREE.Material>(materials)
      const textures = new Set<THREE.Texture>()
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Sprite) {
          if ('geometry' in object) geometries.add(object.geometry)
          const list = Array.isArray(object.material) ? object.material : [object.material]
          list.forEach(surface => surfaces.add(surface))
        }
      })
      surfaces.forEach(surface => {
        if ('map' in surface && surface.map instanceof THREE.Texture) textures.add(surface.map)
        surface.dispose()
      })
      geometries.forEach(geometry => geometry.dispose())
      textures.forEach(texture => texture.dispose())
      sunlight.shadow.dispose()
      renderer.dispose()
    },
  }
}
