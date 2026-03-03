import React from "react";

// Mock three.js before importing the component
jest.mock("three", () => {
  const mockRenderer = {
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    domElement: document.createElement("canvas"),
  };

  const mockGeometry = {
    dispose: jest.fn(),
  };

  const mockMaterial = {
    dispose: jest.fn(),
  };

  const mockMesh = {
    rotation: { x: 0, y: 0 },
  };

  return {
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
      position: { z: 0 },
      aspect: 1,
      updateProjectionMatrix: jest.fn(),
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => mockRenderer),
    BoxGeometry: jest.fn().mockImplementation(() => mockGeometry),
    MeshStandardMaterial: jest.fn().mockImplementation(() => mockMaterial),
    Mesh: jest.fn().mockImplementation(() => mockMesh),
    AmbientLight: jest.fn().mockImplementation(() => ({})),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
    })),
  };
});

// Now import the real component
import ThreeScene from "../threeScene";

describe("ThreeScene component", () => {
  let originalRAF: typeof requestAnimationFrame;
  let originalCAF: typeof cancelAnimationFrame;

  beforeEach(() => {
    originalRAF = global.requestAnimationFrame;
    originalCAF = global.cancelAnimationFrame;
    global.requestAnimationFrame = jest.fn().mockReturnValue(1);
    global.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRAF;
    global.cancelAnimationFrame = originalCAF;
  });

  // Bug reproduction: importing ThreeScene should not throw module-not-found
  test("module can be imported without errors", () => {
    expect(ThreeScene).toBeDefined();
    expect(typeof ThreeScene).toBe("function");
  });

  // Edge case: component renders a container div
  test("renders a mount container div", () => {
    const { render: rtlRender } = require("@testing-library/react");
    const { container } = rtlRender(React.createElement(ThreeScene));
    const div = container.firstChild as HTMLElement;
    expect(div).toBeTruthy();
    expect(div.tagName).toBe("DIV");
    expect(div.style.width).toBe("100%");
    expect(div.style.height).toBe("100%");
  });

  // Edge case: default export matches expected component name
  test("exports a valid React component as default", () => {
    expect(ThreeScene).not.toBeNull();
    // Should be callable as a React component
    const element = React.createElement(ThreeScene);
    expect(element).toBeTruthy();
    expect(element.type).toBe(ThreeScene);
  });

  // Happy path: component mounts and initializes Three.js
  test("initializes Three.js renderer on mount", () => {
    const THREE = require("three");
    const { render: rtlRender } = require("@testing-library/react");
    rtlRender(React.createElement(ThreeScene));
    expect(THREE.Scene).toHaveBeenCalled();
    expect(THREE.PerspectiveCamera).toHaveBeenCalled();
    expect(THREE.WebGLRenderer).toHaveBeenCalled();
  });
});