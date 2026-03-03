import React from "react";

// Mock the heavy Three.js dependencies so tests run without WebGL
jest.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas-mock">{children}</div>,
  useFrame: jest.fn(),
}));

jest.mock("@react-three/drei", () => ({
  OrbitControls: () => <div data-testid="orbit-controls-mock" />,
}));

jest.mock("three", () => ({
  Mesh: jest.fn(),
}));

import ThreeScene from "../threeScene";

describe("ThreeScene component", () => {
  // Bug reproduction: component must exist and be importable (was missing before fix)
  test("ThreeScene is a valid React component (module exists)", () => {
    expect(ThreeScene).toBeDefined();
    expect(typeof ThreeScene).toBe("function");
  });

  // Happy path: renders without throwing
  test("ThreeScene renders without crashing", () => {
    const { default: render } = jest.requireActual("@testing-library/react") as any;
    // Minimal smoke: just confirm the function can be called as JSX
    expect(() => {
      ThreeScene({});
    }).not.toThrow();
  });

  // Edge case: default export is not null/undefined
  test("ThreeScene default export is not null or undefined", () => {
    expect(ThreeScene).not.toBeNull();
    expect(ThreeScene).not.toBeUndefined();
  });
});