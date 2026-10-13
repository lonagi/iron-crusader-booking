import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ROOM_LAYOUT, resolveRoomTables, type RoomItem, type RoomTableRole } from './roomLayout'

export interface SceneTable {
  id: number
  name: string
  role?: RoomTableRole
  available: boolean
  statusLabel?: string
}

export interface ClubScene {
  highlight: (id: number | null) => void
  setAvailability: (tables: SceneTable[]) => void
  zoom: (factor: number) => void
  reset: () => void
  topDown: () => void
  dispose: () => void
}

export interface RoomLabels {
  kitchen: string
  craft: string
  sofa: string
  entrance: string
}

interface SceneOptions {
  canvas: HTMLCanvasElement
  container: HTMLElement
  tables: SceneTable[]
  theme: 'dark' | 'light'
  labels?: Partial<RoomLabels>
  onPick: (id: number) => void
  onHover: (id: number | null) => void
  onError: () => void
}

const DEFAULT_LABELS: RoomLabels = {
  kitchen: 'Kitchen', craft: 'Hobby desk', sofa: 'Sofa', entrance: 'Entrance',
}

/** Fixed room from the club's drawing. Only confirmed API matches are clickable. */
export function createClubScene({ canvas, container, tables, theme, labels: customLabels, onPick, onHover, onError }: SceneOptions): ClubScene {
  const labels = { ...DEFAULT_LABELS, ...customLabels }
  const dark = theme === 'dark'
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(dark ? '#202125' : '#e9e7e2')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08

  let narrow = container.clientWidth < 560
  let topDownView = false
  const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 150)
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(-0.3, 0.25, 0)
  controls.enablePan = false
  controls.enableDamping = false
  controls.minPolarAngle = 0.01
  controls.maxPolarAngle = 1.17
  controls.minAzimuthAngle = -0.6
  controls.maxAzimuthAngle = narrow ? 1.75 : 0.95
  controls.minZoom = 0.7
  controls.maxZoom = 3
  controls.rotateSpeed = 0.55
  controls.zoomSpeed = 0.8
  const desktopPosition = new THREE.Vector3(4.2, 15.5, 17.5)
  const mobilePosition = new THREE.Vector3(18, 18, 5)
  camera.position.copy(narrow ? mobilePosition : desktopPosition)
  controls.update()

  let disposed = false
  let pendingFrame = 0
  function requestRender() {
    if (disposed || pendingFrame) return
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0
      if (!disposed) { sizeTableLabels(); renderer.render(scene, camera) }
    })
  }
  controls.addEventListener('change', requestRender)

  const materials: THREE.Material[] = []
  function material(color: string, roughness = 0.8, metalness = 0) {
    const value = new THREE.MeshStandardMaterial({ color, roughness, metalness })
    materials.push(value)
    return value
  }
  const plaster = material('#bdd0d0')
  const plasterCap = material('#d5ded9')
  const skirting = material('#59443c')
  const foundation = material('#525253')
  const white = material('#e8e6de', 0.63)
  const black = material('#303338', 0.5, 0.18)
  const chairWood = material('#b88a52', 0.65)
  const wood = material('#8d6550')
  const mauve = material('#887583')
  const mauveLight = material('#a4919c')
  const cabinetBlue = material('#4d6698', 0.6)
  const cabinetEdge = material('#3c4867', 0.6)
  const crimson = material('#923d40')
  const gold = material('#bd9b60', 0.45, 0.2)
  const paper = material('#e1d4b6')
  const stone = material('#83837f')
  const darkStone = material('#5c6361')
  const olive = material('#7a825f')

  function box(parent: THREE.Object3D, width: number, height: number, depth: number, x: number, y: number, z: number, surface: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), surface)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  function cylinder(parent: THREE.Object3D, radius: number, height: number, x: number, y: number, z: number, surface: THREE.Material, segments = 12) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), surface)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  function rod(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, surface: THREE.Material) {
    const mesh = cylinder(parent, radius, from.distanceTo(to), 0, 0, 0, surface, 6)
    mesh.position.copy(from).add(to).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
    return mesh
  }
  function labelTexture(text: string, foreground: string, background: string, width = 768, height = 160, dot?: string) {
    const image = document.createElement('canvas')
    image.width = width
    image.height = height
    const context = image.getContext('2d')!
    context.fillStyle = background
    context.beginPath()
    context.roundRect(3, 3, width - 6, height - 6, 28)
    context.fill()
    context.fillStyle = foreground
    context.font = `600 ${Math.round(height * (width <= 256 ? 0.5 : 0.43))}px Arial, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, width / 2 + (dot ? 18 : 0), height / 2, width - (dot ? 135 : width <= 256 ? 24 : 55))
    if (dot) {
      context.fillStyle = dot
      context.beginPath()
      context.arc(48, height / 2, 13, 0, Math.PI * 2)
      context.fill()
    }
    const texture = new THREE.CanvasTexture(image)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }
  // A table's API name is its only display name, in every language and viewport.
  // Wrap the text instead of substituting a physical role or a mobile number.
  function tableNameTexture(name: string, available: boolean, status: string) {
    const image = document.createElement('canvas')
    image.width = 768
    const context = image.getContext('2d')!
    const font = '600 86px Arial, sans-serif'
    context.font = font
    const lines: string[] = []
    let line = ''
    for (const character of Array.from(name)) {
      if (line && context.measureText(line + character).width > 676) {
        const lastSpace = line.lastIndexOf(' ')
        if (lastSpace > 0) {
          lines.push(line.slice(0, lastSpace))
          line = line.slice(lastSpace + 1) + character
        } else { lines.push(line); line = character }
      } else line += character
    }
    if (line) lines.push(line)
    const nameWidth = Math.max(...lines.map(text => context.measureText(text).width))
    context.font = '500 54px Arial, sans-serif'
    image.width = Math.max(360, Math.ceil(Math.max(nameWidth, context.measureText(status).width) + 92))
    image.height = Math.max(160, lines.length * 100 + 44) + (status ? 74 : 0)
    context.fillStyle = available ? '#292a2c' : '#68372e'
    context.beginPath()
    context.roundRect(3, 3, image.width - 6, image.height - 6, 28)
    context.fill()
    context.fillStyle = '#faf2e6'
    context.font = font
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    lines.forEach((text, index) => context.fillText(text, image.width / 2, 72 + index * 100))
    if (status) {
      context.font = '500 54px Arial, sans-serif'
      context.fillStyle = available ? '#e5e5d2' : '#ffe0d4'
      context.fillText(status, image.width / 2, image.height - 47)
    }
    const texture = new THREE.CanvasTexture(image)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }
  const auxiliaryLabels: THREE.Sprite[] = []
  function plaque(parent: THREE.Object3D, text: string, width: number, x: number, y: number, z: number, primary = false, dot?: string) {
    const surface = new THREE.SpriteMaterial({
      map: labelTexture(text, primary ? '#faf2e6' : '#3e4544', primary ? '#292a2c' : '#e0e4de', 768, 160, dot),
      depthTest: false, transparent: true,
    })
    const sprite = new THREE.Sprite(surface)
    sprite.position.set(x, y, z)
    sprite.scale.set(width, width * 160 / 768, 1)
    sprite.renderOrder = 3
    parent.add(sprite)
    if (!primary) auxiliaryLabels.push(sprite)
    return sprite
  }

  scene.add(new THREE.HemisphereLight('#f0f6fb', '#6c5144', 2.5))
  const sunlight = new THREE.DirectionalLight('#ffe9d0', 3)
  sunlight.position.set(3, 13, 5)
  sunlight.castShadow = true
  sunlight.shadow.mapSize.set(2048, 2048)
  sunlight.shadow.camera.left = -11
  sunlight.shadow.camera.right = 11
  sunlight.shadow.camera.top = 9
  sunlight.shadow.camera.bottom = -9
  sunlight.shadow.camera.far = 35
  sunlight.shadow.normalBias = 0.028
  sunlight.shadow.bias = -0.0001
  sunlight.shadow.radius = 3
  scene.add(sunlight)
  const fill = new THREE.DirectionalLight('#cddfeb', 1.4)
  fill.position.set(-6, 6, -3)
  scene.add(fill)

  // Herringbone parquet, as in the photograph. One texture keeps the room cheap to render.
  function parquetTexture() {
    const image = document.createElement('canvas')
    image.width = image.height = 1024
    const context = image.getContext('2d')!
    context.fillStyle = '#302622'
    context.fillRect(0, 0, 1024, 1024)
    const shades = ['#574239', '#674b3b', '#77523d', '#684738', '#5b4033', '#775746', '#483831']
    function plank(x: number, y: number, width: number, height: number, seed: number) {
      context.fillStyle = shades[Math.abs(seed) % shades.length]
      context.fillRect(x + 1, y + 1, width - 2, height - 2)
      context.strokeStyle = 'rgba(229, 201, 162, .11)'
      context.lineWidth = 1
      context.strokeRect(x + 2, y + 2, width - 4, height - 4)
      context.fillStyle = 'rgba(25, 20, 18, .13)'
      for (let grain = 0; grain < 3; grain++) {
        if (width > height) context.fillRect(x + 8, y + 6 + grain * 6, width - 16, 1)
        else context.fillRect(x + 6 + grain * 6, y + 8, 1, height - 16)
      }
    }
    for (let i = -14; i < 28; i++) for (let j = -45; j < 45; j++) {
      const x = i * 96 - j * 24
      const y = i * 96 + j * 24
      plank(x, y, 96, 24, i * 17 + j * 31)
      plank(x + 72, y + 24, 24, 96, i * 43 + j * 11 + 3)
    }
    const texture = new THREE.CanvasTexture(image)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(0.3, 0.3)
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    return texture
  }
  const floor = material('#ffffff', 0.92)
  floor.map = parquetTexture()
  const outline = new THREE.Shape(ROOM_LAYOUT.outline.map(point => new THREE.Vector2(point.x, -point.z)))
  const base = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.22, bevelEnabled: false }), foundation)
  base.rotation.x = -Math.PI / 2
  base.position.y = -0.2
  base.receiveShadow = true
  scene.add(base)
  const floorMesh = new THREE.Mesh(new THREE.ShapeGeometry(outline), floor)
  floorMesh.rotation.x = -Math.PI / 2
  floorMesh.position.y = 0.023
  floorMesh.receiveShadow = true
  scene.add(floorMesh)

  function wallSegment(x1: number, z1: number, x2: number, z2: number, height: number) {
    const length = Math.hypot(x2 - x1, z2 - z1)
    const group = new THREE.Group()
    group.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2)
    group.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
    box(group, length, height, 0.105, 0, height / 2, 0, plaster)
    box(group, length + 0.025, 0.045, 0.13, 0, height + 0.01, 0, plasterCap)
    box(group, length, 0.1, 0.13, 0, 0.075, 0, skirting)
    scene.add(group)
  }
  const west = -ROOM_LAYOUT.width / 2
  const east = ROOM_LAYOUT.width / 2
  const north = -ROOM_LAYOUT.depth / 2
  const south = ROOM_LAYOUT.depth / 2
  const entrance = ROOM_LAYOUT.entrance
  // The back/left walls remain full height; the front/right are architectural cutaways.
  wallSegment(west, north, east, north, 2.25)
  wallSegment(west, north, west, south, 2.25)
  wallSegment(east, north, east, south, 0.17)
  wallSegment(west, south, entrance.x - entrance.width / 2, south, 0.08)
  wallSegment(entrance.x + entrance.width / 2, south, east, south, 0.08)

  // Blue storage cabinets and a pennant are recognizable details from the club photo.
  const cabinet = new THREE.Group()
  cabinet.position.set(ROOM_LAYOUT.cabinet.x, 0, ROOM_LAYOUT.cabinet.z)
  cabinet.rotation.y = ROOM_LAYOUT.cabinet.rotation
  scene.add(cabinet)
  box(cabinet, ROOM_LAYOUT.cabinet.width, 1.82, ROOM_LAYOUT.cabinet.depth, 0, 0.94, 0, cabinetEdge)
  for (const x of [-0.255, 0.255]) {
    box(cabinet, 0.49, 1.69, 0.065, x, 0.97, ROOM_LAYOUT.cabinet.depth / 2 + 0.025, cabinetBlue)
    box(cabinet, 0.022, 0.2, 0.035, x - Math.sign(x) * 0.17, 1, ROOM_LAYOUT.cabinet.depth / 2 + 0.07, gold)
  }
  box(cabinet, 1.12, 0.065, 0.5, 0, 1.89, 0, cabinetEdge)
  const bannerShape = new THREE.Shape()
  bannerShape.moveTo(-0.25, 0.6)
  bannerShape.lineTo(0.25, 0.6)
  bannerShape.lineTo(0.25, -0.45)
  bannerShape.lineTo(0, -0.3)
  bannerShape.lineTo(-0.25, -0.45)
  bannerShape.closePath()
  const bannerMount = new THREE.Group()
  bannerMount.position.set(ROOM_LAYOUT.banner.x, ROOM_LAYOUT.banner.y, ROOM_LAYOUT.banner.z)
  bannerMount.rotation.y = ROOM_LAYOUT.banner.rotation
  scene.add(bannerMount)
  const banner = new THREE.Mesh(new THREE.ShapeGeometry(bannerShape), crimson)
  bannerMount.add(banner)
  box(bannerMount, 0.6, 0.035, 0.055, 0, 0.62, 0.001, black)
  box(bannerMount, 0.23, 0.085, 0.013, 0, 0.09, 0.011, paper)
  box(bannerMount, 0.085, 0.3, 0.014, 0, 0.09, 0.013, paper)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({
    map: labelTexture('IRON CRUSADER', '#3e4544', '#d6dedd', 1024, 160), transparent: true,
  }))
  sign.position.set(-4, 1.65, north + 0.07)
  scene.add(sign)

  function foldingTable(parent: THREE.Object3D, width: number, depth: number, height = 0.82) {
    box(parent, width, 0.09, depth, 0, height, 0, white)
    box(parent, width - 0.12, 0.05, depth - 0.12, 0, height - 0.068, 0, black)
    // Slim black folding supports instead of chunky furniture legs.
    for (const x of [-width * 0.33, width * 0.33]) {
      const spread = depth * 0.34
      rod(parent, new THREE.Vector3(x, 0.06, -spread), new THREE.Vector3(x, height - 0.08, -spread * 0.75), 0.022, black)
      rod(parent, new THREE.Vector3(x, 0.06, spread), new THREE.Vector3(x, height - 0.08, spread * 0.75), 0.022, black)
      rod(parent, new THREE.Vector3(x, 0.09, -spread), new THREE.Vector3(x, 0.09, spread), 0.02, black)
      rod(parent, new THREE.Vector3(x, 0.12, -spread * 0.9), new THREE.Vector3(x, height - 0.13, spread * 0.7), 0.012, black)
    }
  }
  function woodenChair(parent: THREE.Object3D, x: number, z: number, rotation: number) {
    const chair = new THREE.Group()
    chair.position.set(x, 0, z)
    chair.rotation.y = rotation
    box(chair, 0.38, 0.055, 0.38, 0, 0.44, 0, chairWood)
    for (const legX of [-0.15, 0.15]) for (const legZ of [-0.15, 0.15]) {
      box(chair, 0.035, legZ < 0 ? 0.89 : 0.42, 0.035, legX, legZ < 0 ? 0.455 : 0.23, legZ, chairWood)
    }
    for (const y of [0.67, 0.84]) box(chair, 0.32, 0.05, 0.035, 0, y, -0.15, chairWood)
    parent.add(chair)
  }
  // One neutral figure marks a reserved table, not the number of guests.
  const occupants = new Map<number, THREE.Group>()
  const occupantBody = material('#d39a78', 0.82)
  const occupantHead = material('#eee2ce', 0.8)
  function occupiedSeat(parent: THREE.Object3D, table: SceneTable, x: number, z: number, rotation: number, seated = true) {
    const figure = new THREE.Group()
    figure.position.set(x, 0, z)
    figure.rotation.y = rotation
    figure.visible = !table.available
    if (seated) {
      cylinder(figure, 0.14, 0.36, 0, 0.71, 0, occupantBody)
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), occupantHead)
      head.position.set(0, 1.04, 0)
      head.castShadow = true
      figure.add(head)
      for (const side of [-1, 1]) {
        rod(figure, new THREE.Vector3(side * 0.09, 0.52, 0), new THREE.Vector3(side * 0.1, 0.48, 0.24), 0.064, occupantBody)
        rod(figure, new THREE.Vector3(side * 0.1, 0.48, 0.24), new THREE.Vector3(side * 0.1, 0.13, 0.24), 0.055, occupantBody)
        rod(figure, new THREE.Vector3(side * 0.13, 0.85, 0), new THREE.Vector3(side * 0.2, 0.7, 0.2), 0.045, occupantBody)
      }
    } else {
      // The craft desk has no drawn chair, so use a small tabletop reservation pawn.
      cylinder(figure, 0.15, 0.035, 0, 0.93, 0, occupantBody)
      cylinder(figure, 0.09, 0.2, 0, 1.04, 0, occupantBody)
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), occupantHead)
      head.position.set(0, 1.24, 0)
      head.castShadow = true
      figure.add(head)
    }
    parent.add(figure)
    occupants.set(table.id, figure)
  }
  function zone(item: RoomItem) {
    const group = new THREE.Group()
    group.position.set(item.x, 0, item.z)
    scene.add(group)
    return group
  }
  const kitchen = zone(ROOM_LAYOUT.kitchen)
  foldingTable(kitchen, ROOM_LAYOUT.kitchen.width, ROOM_LAYOUT.kitchen.depth)
  box(kitchen, 0.42, 0.46, 0.4, -0.99, 1.1, -0.14, white)
  box(kitchen, 0.31, 0.19, 0.022, -0.99, 1.1, 0.073, black)
  cylinder(kitchen, 0.105, 0.25, 0.76, 0.98, -0.2, black)
  for (let mug = 0; mug < 3; mug++) cylinder(kitchen, 0.047, 0.09, 0.3 + mug * 0.14, 0.91, 0.15, mug === 1 ? crimson : white)
  box(kitchen, 0.57, 0.024, 0.31, -0.15, 0.88, 0.13, wood)
  plaque(kitchen, labels.kitchen, 1.6, 0, 1.3, 0.3)

  const sofa = zone(ROOM_LAYOUT.sofa)
  const sofaDepth = ROOM_LAYOUT.sofa.depth
  box(sofa, 0.71, 0.3, sofaDepth, 0, 0.26, 0, mauve)
  box(sofa, 0.16, 0.66, sofaDepth, -0.28, 0.48, 0, mauve)
  for (let cushion = 0; cushion < 3; cushion++) {
    box(sofa, 0.5, 0.13, (sofaDepth - 0.35) / 3 - 0.03, 0.02, 0.48, (cushion - 1) * (sofaDepth - 0.35) / 3, mauveLight)
  }
  for (const z of [-sofaDepth / 2 + 0.065, sofaDepth / 2 - 0.065]) box(sofa, 0.76, 0.35, 0.13, 0, 0.55, z, mauve)
  plaque(sofa, labels.sofa, 1.1, 0.05, 0.95, 0.8)

  const craft = zone(ROOM_LAYOUT.craft)
  foldingTable(craft, ROOM_LAYOUT.craft.width, ROOM_LAYOUT.craft.depth)
  box(craft, 0.85, 0.012, 0.55, -0.18, 0.875, 0, olive)
  for (let pot = 0; pot < 8; pot++) cylinder(craft, 0.04, 0.1, -0.75 + pot * 0.1, 0.915, -0.27, [white, crimson, cabinetBlue, black][pot % 4], 8)
  box(craft, 0.3, 0.17, 0.26, 0.78, 0.95, -0.1, black)
  rod(craft, new THREE.Vector3(0.5, 0.88, -0.32), new THREE.Vector3(0.5, 1.48, -0.32), 0.014, black)
  rod(craft, new THREE.Vector3(0.5, 1.48, -0.32), new THREE.Vector3(0.05, 1.48, -0.15), 0.014, black)
  box(craft, 0.29, 0.04, 0.15, 0.05, 1.45, -0.15, white)

  box(scene, entrance.width, 0.02, entrance.depth, entrance.x, 0.055, entrance.z - entrance.depth / 2, material('#9c9383'))
  plaque(scene, labels.entrance, 1.45, entrance.x, 0.37, entrance.z - 0.18)

  const tableGroups: THREE.Object3D[] = []
  const accents = new Map<number, THREE.MeshStandardMaterial>()
  interface TableLabel { sprite: THREE.Sprite; text: string; status: string; available: boolean; desktopWidth: number; aspect: number }
  const tableLabels = new Map<number, TableLabel>()
  const allTableLabels: TableLabel[] = []
  const matched = resolveRoomTables(tables)
  let highlighted: number | null = null
  function addTableLabel(group: THREE.Group, table: SceneTable, z: number) {
    if (!table.name.trim()) return
    const sprite = plaque(group, table.name, 2.25, 0, 1.55, z, true)
    const label: TableLabel = { sprite, text: table.name, status: table.statusLabel ?? '', available: table.available, desktopWidth: 2.25, aspect: 768 / 160 }
    allTableLabels.push(label)
    tableLabels.set(table.id, label)
  }
  if (matched.craft) {
    const table = matched.craft
    craft.userData.tableId = table.id
    tableGroups.push(craft)
    const accent = material(table.available ? '#b55748' : '#814439', 0.7)
    accents.set(table.id, accent)
    const { width, depth } = ROOM_LAYOUT.craft
    for (const z of [-depth / 2 + 0.06, depth / 2 - 0.06]) box(craft, width - 0.08, 0.018, 0.04, 0, 0.872, z, accent)
    for (const x of [-width / 2 + 0.06, width / 2 - 0.06]) box(craft, 0.04, 0.018, depth - 0.08, x, 0.872, 0, accent)
    occupiedSeat(craft, table, 0.55, 0.19, 0, false)
    addTableLabel(craft, table, 0.35)
  } else plaque(craft, labels.craft, 1.7, 0, 1.22, 0.35)
  function battleMat(index: number) {
    const image = document.createElement('canvas')
    image.width = image.height = 512
    const context = image.getContext('2d')!
    context.fillStyle = index ? '#756e60' : '#846e51'
    context.fillRect(0, 0, 512, 512)
    context.strokeStyle = index ? '#646760' : '#75644f'
    context.lineWidth = 45
    context.beginPath()
    context.moveTo(-20, 220); context.lineTo(230, 250); context.lineTo(530, 210)
    context.moveTo(210, -20); context.lineTo(240, 250); context.lineTo(350, 540)
    context.stroke()
    for (let i = 0; i < 240; i++) {
      const x = ((i * 127 + index * 13) % 509)
      const y = ((i * 71 + i * i * 3) % 503)
      context.fillStyle = i % 3 ? 'rgba(217, 205, 171, .16)' : 'rgba(47, 47, 39, .19)'
      context.beginPath()
      context.ellipse(x, y, 3 + i % 17, 3 + i % 11, i, 0, Math.PI * 2)
      context.fill()
    }
    const texture = new THREE.CanvasTexture(image)
    texture.colorSpace = THREE.SRGBColorSpace
    const surface = material('#ffffff')
    surface.map = texture
    return surface
  }
  const matSurfaces = [battleMat(0), battleMat(1)]
  function ruins(group: THREE.Group, x: number, z: number, rotation: number, alternate: boolean) {
    const ruin = new THREE.Group()
    ruin.position.set(x, 0.92, z)
    ruin.rotation.y = rotation
    box(ruin, 0.61, 0.024, 0.42, 0, 0, 0, alternate ? darkStone : stone)
    box(ruin, 0.53, 0.22, 0.07, 0, 0.12, -0.15, stone)
    box(ruin, 0.07, 0.34, 0.37, -0.22, 0.18, 0, stone)
    box(ruin, 0.12, 0.16, 0.08, 0.16, 0.31, -0.15, stone)
    for (const xWindow of [-0.1, 0.08]) box(ruin, 0.075, 0.07, 0.075, xWindow, 0.15, -0.145, black)
    group.add(ruin)
  }
  for (const role of ['rpg', 'warhammer1', 'warhammer2'] as const) {
    const item = ROOM_LAYOUT.tables[role]
    const group = zone(item)
    const table = matched[role]
    if (table) {
      group.userData.tableId = table.id
      tableGroups.push(group)
    }
    const accent = material(table ? (table.available ? '#b55748' : '#814439') : '#b1b4b0', 0.7)
    if (table) accents.set(table.id, accent)
    foldingTable(group, item.width, item.depth)
    box(group, item.width - 0.1, 0.028, item.depth - 0.1, 0, 0.878, 0, accent)
    if (role === 'rpg') {
      box(group, item.width - 0.18, 0.018, item.depth - 0.18, 0, 0.9, 0, white)
      box(group, 0.81, 0.012, 0.98, 0.08, 0.917, 0.06, paper)
      const screen = box(group, 0.7, 0.27, 0.018, 0, 1.05, -0.76, crimson)
      screen.rotation.x = -0.1
      for (const z of [-0.45, 0.48]) {
        box(group, 0.24, 0.023, 0.33, -0.53, 0.923, z, paper)
        box(group, 0.24, 0.023, 0.33, 0.53, 0.923, z, paper)
      }
      for (let die = 0; die < 3; die++) {
        const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.064), die % 2 ? gold : crimson)
        mesh.position.set(-0.19 + die * 0.13, 0.97, 0.12 + die * 0.09)
        mesh.castShadow = true
        group.add(mesh)
      }
      woodenChair(group, 0, -item.depth / 2 - 0.27, 0)
      woodenChair(group, 0, item.depth / 2 + 0.27, Math.PI)
      woodenChair(group, item.width / 2 + 0.28, 0.4, -Math.PI / 2)
    } else {
      const second = role === 'warhammer2'
      box(group, item.width - 0.18, 0.018, item.depth - 0.18, 0, 0.903, 0, matSurfaces[second ? 1 : 0])
      ruins(group, -0.75, -0.35, 0.15, second)
      ruins(group, 0.66, 0.32, Math.PI + 0.2, second)
      ruins(group, 0.6, -0.38, -0.2, second)
      for (let miniature = 0; miniature < 7; miniature++) {
        const x = -1.05 + miniature * 0.32
        const z = miniature % 2 ? -0.58 : 0.53
        cylinder(group, 0.057, 0.028, x, 0.932, z, black)
        cylinder(group, 0.022, 0.095, x, 0.99, z, miniature % 2 ? crimson : olive, 6)
      }
      for (const x of [-0.67, 0.67]) {
        woodenChair(group, x, -item.depth / 2 - 0.31, 0)
        woodenChair(group, x, item.depth / 2 + 0.31, Math.PI)
      }
    }
    if (table) {
      occupiedSeat(group, table, role === 'rpg' ? 0 : -0.67, item.depth / 2 + (role === 'rpg' ? 0.27 : 0.31), Math.PI)
      addTableLabel(group, table, -0.3)
    }
  }

  function refreshTableLabel(label: TableLabel) {
    const old = label.sprite.material.map
    const texture = tableNameTexture(label.text, label.available, label.status)
    label.sprite.material.map = texture
    label.aspect = texture.image.width / texture.image.height
    label.desktopWidth = 2.25 * texture.image.width / 768
    label.sprite.material.needsUpdate = true
    old?.dispose()
  }
  function sizeTableLabels() {
    const unitsPerPixel = (camera.top - camera.bottom) / (Math.max(1, container.clientHeight) * camera.zoom)
    for (const label of allTableLabels) {
      if (narrow) {
        const width = Math.min(128, container.clientWidth * (topDownView ? 0.3 : 0.4)) * label.desktopWidth / 2.25 * unitsPerPixel
        label.sprite.scale.set(width, width / label.aspect, 1)
      } else label.sprite.scale.set(label.desktopWidth, label.desktopWidth / label.aspect, 1)
    }
  }

  function highlight(id: number | null) {
    highlighted = id
    for (const [tableId, accent] of accents) {
      accent.emissive.set(tableId === id ? '#cd694d' : '#000000')
      accent.emissiveIntensity = tableId === id ? 0.6 : 0
    }
    requestRender()
  }
  function setAvailability(next: SceneTable[]) {
    for (const table of next) {
      accents.get(table.id)?.color.set(table.available ? '#b55748' : '#814439')
      const occupant = occupants.get(table.id)
      if (occupant) occupant.visible = !table.available
      const label = tableLabels.get(table.id)
      if (label && (label.available !== table.available || label.status !== (table.statusLabel ?? ''))) {
        label.available = table.available
        label.status = table.statusLabel ?? ''
        refreshTableLabel(label)
      }
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
  function reset() {
    topDownView = false
    camera.position.copy(narrow ? mobilePosition : desktopPosition)
    controls.target.set(-0.3, 0.25, 0)
    camera.zoom = 1
    controls.update()
    resize()
  }
  function topDown() {
    topDownView = true
    camera.position.set(controls.target.x, 25, controls.target.z + 0.01)
    camera.zoom = 1
    controls.update()
    resize()
  }
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

  let labelMode: boolean | null = null
  function resize() {
    const width = Math.max(1, container.clientWidth)
    const height = Math.max(1, container.clientHeight)
    const aspect = width / height
    const nextNarrow = width < 560
    if (narrow !== nextNarrow) {
      narrow = nextNarrow
      controls.maxAzimuthAngle = narrow ? 1.75 : 0.95
      if (!topDownView) camera.position.copy(narrow ? mobilePosition : desktopPosition)
      camera.zoom = 1
      controls.update()
    }
    if (labelMode !== narrow) {
      labelMode = narrow
      allTableLabels.forEach(refreshTableLabel)
      auxiliaryLabels.forEach(label => { label.visible = !narrow })
    }
    camera.updateMatrixWorld(true)
    const bounds = new THREE.Box3()
    for (const point of ROOM_LAYOUT.outline) for (const y of [0, 2.5]) {
      bounds.expandByPoint(new THREE.Vector3(point.x, y, point.z).applyMatrix4(camera.matrixWorldInverse))
    }
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const viewHeight = Math.max(size.y, size.x / aspect) * 1.12
    camera.left = center.x - viewHeight * aspect / 2
    camera.right = center.x + viewHeight * aspect / 2
    camera.top = center.y + viewHeight / 2
    camera.bottom = center.y - viewHeight / 2
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    requestRender()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()

  return {
    highlight, setAvailability, zoom, reset, topDown,
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
