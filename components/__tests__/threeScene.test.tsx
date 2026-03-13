import React from "react";
import { render, screen } from "@testing-library/react";

// Mock three.js to avoid WebGL issues in test environment
jest.mock("three", () => {
  const actualThree = jest.requireActual("three");
  return {
    ...actualThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
      domElement: document.createElement("canvas"),
    })),
  };
});

import ThreeScene from "../threeScene";

describe("ThreeScene component", () => {
  beforeEach(() => {
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      return 1;
    });
    jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Bug reproduction: component must exist and render without throwing
  test("renders without crashing (build error fix verification)", () => {
    expect(() => render(<ThreeScene />)).not.toThrow();
  });

  // Happy path: container div is rendered with correct test id
  test("renders a container div with data-testid", () => {
    render(<ThreeScene />);
    const container = screen.getByTestId("three-scene-container");
    expect(container).toBeTruthy();
  });

  // Edge case: component can be unmounted without errors (cleanup works)
  test("unmounts cleanly without errors", () => {
    const { unmount } = render(<ThreeScene />);
    expect(() => unmount()).not.toThrow();
  });

  // Edge case: module exports a valid React component as default
  test("exports a default function component", () => {
    expect(typeof ThreeScene).toBe("function");
  });
});