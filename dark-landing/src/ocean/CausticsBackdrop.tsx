import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import './shaders/causticsMaterial'

interface CausticsMaterialImpl extends THREE.ShaderMaterial {
  uTime: number
}

export default function CausticsBackdrop() {
  const matRef = useRef<CausticsMaterialImpl>(null)

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uTime += delta
  })

  return (
    <mesh position={[0, 0, -6]} scale={[26, 16, 1]}>
      <planeGeometry args={[1, 1]} />
      <causticsMaterial
        ref={matRef}
        uColor={new THREE.Color('#2fd8ff')}
        uIntensity={1.1}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
