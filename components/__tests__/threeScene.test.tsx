import React from "react";

// Mock three.js before importing the component
jest.mock("three", () => {
  const actualThree = jest.requireActual("three");
  const mockRenderer = {
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    domElement: document.createElement("canvas"),
  };
  return {
    ...actualThree,
    WebGLRenderer: jest.fn(() => mockRenderer),
    Scene: jest.fn(() => ({
      add: jest.fn(),
      background: null,
    })),
    PerspectiveCamera: jest.fn(() => ({
      position: { z: 0 },
      aspect: 1,
      updateProjectionMatrix: jest.fn(),
    })),
    BoxGeometry: jest.fn(() => ({
      dispose: jest.fn(),
    })),
    MeshStandardMaterial: jest.fn(() => ({
      dispose: jest.fn(),
    })),
    Mesh: jest.fn(() => ({
      rotation: { x: 0, y: 0 },
    })),
    AmbientLight: jest.fn(() => ({})),
    DirectionalLight: jest.fn(() => ({
      position: { set: jest.fn() },
    })),
    Color: jest.fn(),
  };
});

// Mock requestAnimationFrame
let rafCallback: FrameRequestCallback | null = null;
global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
  rafCallback = cb;
  return 1;
});
global.cancelAnimationFrame = jest.fn();

import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

describe("ThreeScene component", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test("Bug reproduction: component renders without throwing (previously failed due to missing file)", async () => {
    // This import would have failed before the fix because the file didn't exist
    const ThreeScene = (await import("@/components/threeScene")).default;
    expect(() => {
      act(() => {
        render(<ThreeScene />, container);
      });
    }).not.toThrow();
    act(() => {
      unmountComponentAtNode(container);
    });
  });

  test("Edge case: component mounts and creates a canvas element", async () => {
    const ThreeScene = (await import("@/components/threeScene")).default;
    act(() => {
      render(<ThreeScene />, container);
    });
    // The renderer's domElement (a canvas) should be appended
    const THREE = require("three");
    expect(THREE.WebGLRenderer).toHaveBeenCalled();
    act(() => {
      unmountComponentAtNode(container);
    });
  });

  test("Edge case: cleanup disposes renderer on unmount", async () => {
    const THREE = require("three");
    const ThreeScene = (await import("@/components/threeScene")).default;
    act(() => {
      render(<ThreeScene />, container);
    });
    const rendererInstance = THREE.WebGLRenderer.mock.results[0]?.value;
    act(() => {
      unmountComponentAtNode(container);
    });
    expect(rendererInstance.dispose).toHaveBeenCalled();
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });

  test("Happy path: default export is a valid React component", async () => {
    const mod = await import("@/components/threeScene");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});