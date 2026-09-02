import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Full-viewport, fixed Three.js canvas: a slowly drifting field of points
 * plus a faint wireframe icosahedron, both rotating on their own axes.
 * Purely decorative — sits behind the page content (z-index handled by caller).
 */
export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    )
    camera.position.z = 8

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    mount.appendChild(renderer.domElement)

    // Particle field
    const particleCount = 900
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30
    }
    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    )
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x8f8fff,
      size: 0.035,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    // Faint wireframe icosahedron as a centerpiece
    const icoGeometry = new THREE.IcosahedronGeometry(2.6, 1)
    const icoMaterial = new THREE.MeshBasicMaterial({
      color: 0x7c6bff,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    })
    const ico = new THREE.Mesh(icoGeometry, icoMaterial)
    scene.add(ico)

    let frameId: number
    let elapsed = 0
    const clock = new THREE.Clock()

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const delta = prefersReducedMotion ? 0 : clock.getDelta()
      elapsed += delta

      particles.rotation.y += delta * 0.015
      particles.rotation.x += delta * 0.005

      ico.rotation.y += delta * 0.06
      ico.rotation.x += delta * 0.04

      camera.position.x = Math.sin(elapsed * 0.05) * 0.6
      camera.position.y = Math.cos(elapsed * 0.04) * 0.4
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      particleGeometry.dispose()
      particleMaterial.dispose()
      icoGeometry.dispose()
      icoMaterial.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10"
    />
  )
}
