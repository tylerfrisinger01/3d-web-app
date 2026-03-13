import React from "react";

// Mock react-three packages since they require WebGL
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
  // Bug reproduction: component must exist and render without crashing
  it("renders without crashing (bug repro: missing component file)", () => {
    const { container } = render(<ThreeScene />);
    expect(container).toBeTruthy();
  });

  // Edge case: wrapper div has correct dimensions style
  it("renders a wrapper div with height style", () => {
    const { container } = render(<ThreeScene />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe("500px");
    expect(wrapper.style.width).toBe("100%");
  });

  // Happy path: Canvas mock is present in the DOM
  it("renders the Canvas element", () => {
    render(<ThreeScene />);
    expect(screen.getByTestId("canvas-mock")).toBeTruthy();
  });
});