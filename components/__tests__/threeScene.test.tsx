import React from "react";

// Mock Three.js and related libraries since they require WebGL
jest.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas-mock">{children}</div>
  ),
  useFrame: jest.fn(),
}));

jest.mock("@react-three/drei", () => ({
  OrbitControls: () => <div data-testid="orbit-controls-mock" />,
}));

jest.mock("three", () => ({
  Mesh: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import ThreeScene from "../threeScene";

describe("ThreeScene component", () => {
  // Happy path: component renders without crashing
  test("renders the ThreeScene component successfully", () => {
    const { container } = render(<ThreeScene />);
    expect(container).toBeTruthy();
  });

  // Bug reproduction: the component must be importable and export a default function
  test("ThreeScene is a valid React component (default export exists)", () => {
    expect(typeof ThreeScene).toBe("function");
  });

  // Edge case: the wrapper div has correct dimensions style
  test("renders a container div with 100% width and 500px height", () => {
    const { container } = render(<ThreeScene />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("100%");
    expect(wrapper.style.height).toBe("500px");
  });

  // Edge case: Canvas mock is present in the rendered output
  test("renders the Canvas element", () => {
    render(<ThreeScene />);
    expect(screen.getByTestId("canvas-mock")).toBeTruthy();
  });
});