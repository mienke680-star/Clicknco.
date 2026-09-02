import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

interface Bubble {
  x: number
  z: number
  y: number
  speed: number
  scale: number
  swaySpeed: number
  swayAmount: number
  phase: number
}

const BOUNDS = { top: 7, bottom: -7, half: 9 }

function makeBubbles(count: number): Bubble[] {
  return Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * BOUNDS.half,
    z: (Math.random() - 0.5) * 6 - 2,
    y: BOUNDS.bottom + Math.random() * (BOUNDS.top - BOUNDS.bottom),
    speed: 0.35 + Math.random() * 0.55,
    scale: 0.02 + Math.random() * 0.06,
    swaySpeed: 0.6 + Math.random() * 0.8,
    swayAmount: 0.15 + Math.random() * 0.3,
    phase: Math.random() * Math.PI * 2,
  }))
}

export default function Bubbles({ count = 70 }: { count?: number }) {
  const bubbles = useMemo(() => makeBubbles(count), [count])
  const refs = useRef<(THREE.Object3D | null)[]>([])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    bubbles.forEach((b, i) => {
      const obj = refs.current[i]
      if (!obj) return
      b.y += b.speed * delta
      if (b.y > BOUNDS.top) b.y = BOUNDS.bottom
      const sway = Math.sin(t * b.swaySpeed + b.phase) * b.swayAmount
      obj.position.set(b.x + sway, b.y, b.z)
    })
  })

  return (
    <Instances limit={count}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshPhysicalMaterial
        color="#bfeeff"
        transparent
        opacity={0.28}
        roughness={0.05}
        transmission={0.9}
        thickness={0.4}
        ior={1.2}
      />
      {bubbles.map((b, i) => (
        <Instance
          key={i}
          ref={(el: THREE.Object3D | null) => {
            refs.current[i] = el
          }}
          position={[b.x, b.y, b.z]}
          scale={b.scale}
        />
      ))}
    </Instances>
  )
}
