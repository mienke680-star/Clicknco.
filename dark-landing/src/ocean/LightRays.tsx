import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

function makeRayTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, 0, 256)
  gradient.addColorStop(0, 'rgba(160,230,255,0.55)')
  gradient.addColorStop(0.6, 'rgba(120,210,255,0.15)')
  gradient.addColorStop(1, 'rgba(80,180,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

const RAY_CONFIG = [
  { x: -4.5, rot: 0.18, width: 1.6, speed: 0.05, opacity: 0.5 },
  { x: -1.5, rot: -0.08, width: 1.1, speed: 0.07, opacity: 0.35 },
  { x: 2, rot: 0.12, width: 2, speed: 0.04, opacity: 0.4 },
  { x: 5, rot: -0.15, width: 1.4, speed: 0.06, opacity: 0.3 },
]

export default function LightRays() {
  const texture = useMemo(() => makeRayTexture(), [])
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current) return
    group.current.children.forEach((child, i) => {
      const cfg = RAY_CONFIG[i]
      child.rotation.z = cfg.rot + Math.sin(state.clock.elapsedTime * cfg.speed + i) * 0.05
    })
  })

  return (
    <group ref={group} position={[0, 3, -3]}>
      {RAY_CONFIG.map((cfg, i) => (
        <mesh key={i} position={[cfg.x, 0, 0]} rotation={[0, 0, cfg.rot]}>
          <planeGeometry args={[cfg.width, 14]} />
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={cfg.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
