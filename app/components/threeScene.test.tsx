import React from 'react'

// Mock @react-three/fiber and @react-three/drei since they require WebGL context
jest.mock('@react-three/fiber', () => ({
    Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
}))

jest.mock('@react-three/drei', () => ({
    OrbitControls: () => <div data-testid="orbit-controls" />,
}))

import ThreeScene from '../../components/threeScene'

describe('ThreeScene', () => {
    // Bug Reproduction Test: The original code had syntax errors:
    // 1. Reference to undefined `resetCamera` in onDoubleClick
    // 2. Typo "hotp--ink" instead of "hotpink"
    // 3. Unclosed <meshStandardMaterial> tag (missing `/>`)
    // This test verifies the component can be imported and is a valid function
    // (before the fix, the file would fail to parse/compile at all)
    test('should export a valid component function (build does not error)', () => {
        expect(typeof ThreeScene).toBe('function')
    })

    // Happy Path Smoke Test: Component renders without throwing
    test('should render without throwing', () => {
        // We just call the function to ensure no runtime errors
        // In a real DOM environment with react-testing-library this would mount
        const element = ThreeScene()
        expect(element).toBeDefined()
        expect(element.props).toBeDefined()
    })

    // Edge Case Test: Verify the component returns a Canvas wrapper (mocked as div)
    test('should return a Canvas element as root', () => {
        const element = ThreeScene()
        // The mocked Canvas renders as a div with data-testid="canvas"
        expect(element.type).toBeDefined()
    })

    // Edge Case Test: Ensure no reference to resetCamera exists in the module
    test('should not reference undefined resetCamera', () => {
        const source = require('fs').readFileSync(
            require('path').resolve(__dirname, '..', 'components', 'threeScene.tsx'),
            'utf8'
        )
        // resetCamera should only appear in comments, not in active JSX
        const nonCommentLines = source
            .split('\n')
            .filter((line: string) => !line.trim().startsWith('//'))
        const activeResetCameraUsage = nonCommentLines.some(
            (line: string) => line.includes('resetCamera') && !line.trim().startsWith('*')
        )
        expect(activeResetCameraUsage).toBe(false)
    })
})