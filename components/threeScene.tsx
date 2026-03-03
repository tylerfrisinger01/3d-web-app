'use client'

import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'



// const resetCamera = () => {
//     console.log("double click activated")
//     return (
//         <Canvas camera={{position: [0, 0, 5]}}>
//         </Canvas>
        
//     );
// };

const resetCamera = () => {
    console.log("double click activated")
}

export default function ThreeScene() {
    if (!THREE) {
        console.error('three.js failed to load properly')
        return <div>Error: 3D engine failed to load.</div>
    }

    return (
        <Canvas>
            <mesh onDoubleClick={resetCamera}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="hotpink" />
            </mesh>

            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <OrbitControls />
        </Canvas>
    );
}