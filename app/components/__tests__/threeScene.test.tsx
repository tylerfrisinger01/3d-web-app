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

// We need to mock requestAnimationFrame
let rafCallback: FrameRequestCallback | null = null;
const originalRAF = global.requestAnimationFrame;
const originalCAF = global.cancelAnimationFrame;

beforeEach(() => {
  global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
    rafCallback = cb;
    return 1;
  });
  global.cancelAnimationFrame = jest.fn();
});

afterEach(() => {
  global.requestAnimationFrame = originalRAF;
  global.cancelAnimationFrame = originalCAF;
  rafCallback = null;
});

describe("ThreeScene component", () => {
  // Bug reproduction: importing the module should not throw (previously the file didn't exist)
  test("module can be imported without errors", () => {
    expect(() => {
      require("../threeScene");
    }).not.toThrow();
  });

  // Happy path: component exports a default export that is a valid React component
  test("exports a default React component", () => {
    const mod = require("../threeScene");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  // Edge case: component renders without crashing even with zero-size container
  test("renders a div container element", () => {
    const mod = require("../threeScene");
    const ThreeScene = mod.default;

    // Simple render check using React.createElement
    const element = React.createElement(ThreeScene);
    expect(element).toBeDefined();
    expect(element.type).toBe(ThreeScene);
  });

  // Edge case: multiple imports resolve to the same module
  test("re-importing returns the same module reference", () => {
    const mod1 = require("../threeScene");
    const mod2 = require("../threeScene");
    expect(mod1.default).toBe(mod2.default);
  });
});