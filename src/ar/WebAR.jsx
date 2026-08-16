import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js'
import './styles.css'

// Change this to your product's purchase page.
const PRODUCT_URL = 'https://example.com/product'

// Combined MindAR image target source. MindAR supports multiple targets in a
// single .mind file; target indexes are assigned in compilation order.
const TARGET_URL = '/targets/target.mind'

// target index -> model file
const TARGETS = [
  { index: 0, model: '/models/sail.glb' },
  { index: 1, model: '/models/payung-sekaki.glb' },
]

export default function WebAR() {
  const containerRef = useRef(null)
  const startedRef = useRef(false)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let mindar = null
    let renderer = null
    let disposed = false
    const mixers = []
    const autoRotate = [] // booleans per target, true when no GLB animation
    const models = [] // THREE.Object3D per target
    const clock = new THREE.Clock()

    const loadModel = (url) =>
      new Promise((resolve) => {
        const loader = new GLTFLoader()
        loader.load(
          url,
          (gltf) => {
            const root = gltf.scene

            // Auto-scale to fit the image target using bounding box.
            const box = new THREE.Box3().setFromObject(root)
            const size = box.getSize(new THREE.Vector3())
            const maxDim = Math.max(size.x, size.y, size.z) || 1
            const scale = 1 / maxDim
            root.scale.setScalar(scale)

            // Sit just above the target plane so it appears to emerge from it.
            const scaledHeight = size.y * scale
            root.position.set(0, scaledHeight * 0.5, 0)

            // Hide until its target is found.
            root.visible = false

            // Preserve original materials and textures (no overrides).

            let mixer = null
            let hasAnim = false
            if (gltf.animations && gltf.animations.length > 0) {
              mixer = new THREE.AnimationMixer(root)
              gltf.animations.forEach((clip) => mixer.clipAction(clip).play())
              mixers.push(mixer)
              hasAnim = true
            }

            resolve({ root, hasAnim })
          },
          undefined,
          (err) => {
            console.error(`Failed to load model ${url}:`, err)
            // Fallback: simple colored cube placeholder.
            const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
            const mat = new THREE.MeshNormalMaterial()
            const cube = new THREE.Mesh(geo, mat)
            cube.position.set(0, 0.25, 0)
            cube.visible = false
            resolve({ root: cube, hasAnim: false })
          }
        )
      })

    const start = async () => {
      try {
        // Surface a clear error if the MindAR target file is missing.
        const targetRes = await fetch(TARGET_URL, { method: 'HEAD' })
        if (!targetRes.ok) throw new Error('missing-target')

        mindar = new MindARThree({
          container: containerRef.current,
          imageTargetSrc: TARGET_URL,
          uiScanning: false,
          uiLoading: false,
          filterMinCF: 1,
          filterBeta: 1000,
        })

        renderer = mindar.renderer
        const scene = mindar.scene
        const camera = mindar.camera

        // Load every model once, create one anchor per target.
        for (let i = 0; i < TARGETS.length; i++) {
          const { index, model } = TARGETS[i]
          const { root, hasAnim } = await loadModel(model)

          const anchor = mindar.addAnchor(index)
          anchor.group.add(root)

          models[index] = root
          autoRotate[index] = !hasAnim

          anchor.onTargetFound = () => {
            if (disposed) return
            root.visible = true
            setStatus('tracking')
          }
          anchor.onTargetLost = () => {
            if (disposed) return
            root.visible = false
            const anyVisible = models.some((m) => m && m.visible)
            setStatus(anyVisible ? 'tracking' : 'idle')
          }
        }

        await mindar.start()

        if (disposed) return

        renderer.setAnimationLoop(() => {
          const d = clock.getDelta()
          for (let i = 0; i < mixers.length; i++) mixers[i].update(d)
          for (let i = 0; i < autoRotate.length; i++) {
            if (autoRotate[i] && models[i] && models[i].visible) {
              models[i].rotation.y += d * 0.5
            }
          }
          renderer.render(scene, camera)
        })

        setStatus('idle')
      } catch (err) {
        if (disposed) return
        console.error('WebAR init failed:', err)
        setStatus('error')
      }
    }

    start()

    return () => {
      disposed = true
      const cleanup = async () => {
        try {
          if (renderer) renderer.setAnimationLoop(null)
          if (mindar) await mindar.stop()
          mixers.forEach((m) => m.update(0))
          if (renderer) renderer.dispose()
        } catch (e) {
          // ignore cleanup errors
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }
      }
      cleanup()
    }
  }, [])

  const message =
    status === 'loading'
      ? 'Starting camera...'
      : status === 'tracking'
      ? 'Product detected'
      : status === 'error'
      ? 'Unable to start AR. Please check camera permission.'
      : 'Point your camera at the product image'

  return (
    <div className="webar-root">
      <div className="webar-container" ref={containerRef} />

      <div className="webar-overlay">
        <div className="webar-status">
          {status === 'loading' && <span className="webar-spinner" />}
          <span className="webar-status-text">{message}</span>
        </div>
      </div>

      {status === 'tracking' && (
        <button
          className="webar-buy"
          onClick={() => window.open(PRODUCT_URL, '_blank', 'noopener,noreferrer')}
        >
          Buy Now
        </button>
      )}
    </div>
  )
}
