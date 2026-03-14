import React from "react";

// Mock Three.js and related modules before importing the component
jest.mock("three", () => ({
  Scene: jest.fn(),
  PerspectiveCamera: jest.fn(() => ({ position: { set: jest.fn(), z: 0 } })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    domElement: document.createElement("canvas"),
    setPixelRatio: jest.fn(),
  })),
  BoxGeometry: jest.fn(),
  MeshBasicMaterial: jest.fn(),
  MeshStandardMaterial: jest.fn(),
  Mesh: jest.fn(() => ({ rotation: { x: 0, y: 0 } })),
  AmbientLight: jest.fn(),
  DirectionalLight: jest.fn(() => ({ position: { set: jest.fn() } })),
  PointLight: jest.fn(() => ({ position: { set: jest.fn() } })),
  Color: jest.fn(),
}));

jest.mock("../../components/threeScene", () => {
  const MockThreeScene = () => <div data-testid="three-scene">ThreeScene</div>;
  MockThreeScene.displayName = "MockThreeScene";
  return { __esModule: true, default: MockThreeScene };
});

describe("app/components/threeScene re-export", () => {
  it("re-exports the default export from components/threeScene", () => {
    // This import resolves app/components/threeScene which re-exports from root
    const reExported = require("../components/threeScene");
    expect(reExported).toBeDefined();
    expect(reExported.default).toBeDefined();
  });

  it("the default export is a valid React component", () => {
    const { default: ThreeScene } = require("../components/threeScene");
    expect(typeof ThreeScene).toBe("function");
  });

  it("does not export undefined as default", () => {
    const { default: ThreeScene } = require("../components/threeScene");
    expect(ThreeScene).not.toBeUndefined();
    expect(ThreeScene).not.toBeNull();
  });
});

describe("Design page module", () => {
  it("design page module loads without throwing", () => {
    expect(() => {
      require("../design/page");
    }).not.toThrow();
  });
});