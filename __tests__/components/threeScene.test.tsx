import React from 'react'
import { render } from '@testing-library/react'

// Mock @react-three/fiber and @react-three/drei since they require WebGL context
jest.mock('@react-three/fiber', () => ({
    Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
}))

jest.mock('@react-three/drei', () => ({
    OrbitControls: () => <div data-testid="orbit-controls" />,
}))

import ThreeScene from '../../components/threeScene'

describe('[Ticket: Website Build Errors] Fix syntax errors in threeScene.tsx', () => {
    it('should render without crashing (bug reproduction - previously failed due to syntax errors)', () => {
        expect(() => render(<ThreeScene />)).not.toThrow()
    })

    it('should render the Canvas with child elements', () => {
        const { getByTestId } = render(<ThreeScene />)
        const canvas = getByTestId('canvas')
        expect(canvas).toBeTruthy()
    })

    it('should include OrbitControls', () => {
        const { getByTestId } = render(<ThreeScene />)
        const controls = getByTestId('orbit-controls')
        expect(controls).toBeTruthy()
    })

    it('should export a default function component', () => {
        expect(typeof ThreeScene).toBe('function')
    })
})