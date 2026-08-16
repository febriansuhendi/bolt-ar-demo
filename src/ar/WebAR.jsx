import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js'
import './styles.css'

// Change this to your product's purchase page.
const PRODUCT_URL = 'https://example.com/product'

const MODEL_URL = '/models/product.glb'
const TARGET_URL = '/targets/target.mind'
const TARGET_INDEX = 0

export default function WebAR() {
  const containerRef = useRef(null)
  const startedRef = useRef(false)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let mindar = null
    let renderer = null
    let model = null
    let disposed = false

    const setupModel = (anchorGroup) => {
      return new Promise((resolve) => {
        const loader = new GLTFLoader()
        loader.load(
          MODEL_URL,
          (gltf) => {
            const root = gltf.scene
            // Normalize model to roughly fit the image target.
            const box = new THREE.Box3().setFromObject(root)
            const size = box.getSize(new THREE.Vector3())
            const maxDim = Math.max(size.x, size.y, size.z) || 1
            const scale = 1 / maxDim
            root.scale.setScalar(scale)
            // Place the model sitting just above the target plane.
            root.position.set(0, size.y * scale * 0.5, 0)
            anchorGroup.add(root)
            model = root
            resolve()
          },
          undefined,
          () => {
            // Fallback: simple colored cube placeholder.
            const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
            const mat = new THREE.MeshNormalMaterial()
            const cube = new THREE.Mesh(geo, mat)
            cube.position.set(0, 0.25, 0)
            anchorGroup.add(cube)
            model = cube
            resolve()
          }
        )
      })
    }

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

        const anchor = mindar.addAnchor(TARGET_INDEX)
        const anchorGroup = anchor.group

        await setupModel(anchorGroup)

        anchor.onTargetFound = () => setStatus('tracking')
        anchor.onTargetLost = () => setStatus('idle')

        await mindar.start()

        if (disposed) return

        renderer.setAnimationLoop(() => {
          if (model) model.rotation.y += 0.01
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
