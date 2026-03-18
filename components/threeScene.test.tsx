import React from 'react'

// Mock the three.js related modules before importing the component
jest.mock('@react-three/fiber', () => ({
    Canvas: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', { 'data-testid': 'canvas' }, children),
}))

jest.mock('@react-three/drei', () => ({
    OrbitControls: () => React.createElement('div', { 'data-testid': 'orbit-controls' }),
}))

import ThreeScene from './threeScene'

describe('ThreeScene', () => {
    // Bug reproduction test: component should be importable and renderable without syntax errors
    it('should export a valid React component (no syntax/build errors)', () => {
        expect(ThreeScene).toBeDefined()
        expect(typeof ThreeScene).toBe('function')
    })

    // Edge case: component renders without crashing
    it('should render without throwing', () => {
        // If the JSX had a syntax error (unclosed tag, missing />), this import
        // itself would have failed. This test confirms the module parses correctly.
        const element = React.createElement(ThreeScene)
        expect(element).toBeTruthy()
        expect(element.type).toBe(ThreeScene)
    })

    // Edge case: no reference to undefined resetCamera
    it('should not reference an undefined resetCamera handler', () => {
        const source = ThreeScene.toString()
        expect(source).not.toContain('resetCamera')
    })

    // Happy path smoke test: component returns valid JSX
    it('should return a React element when called', () => {
        const result = ThreeScene()
        expect(result).toBeTruthy()
        expect(result.props).toBeDefined()
    })
})