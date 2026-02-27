'use client'

import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
//import * as THREE from 'three'



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

// No test file generated: this project does not have a testing framework
// (no jest, vitest, @testing-library/react, or @types/jest found in dependencies).

export default function ThreeScene() {
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