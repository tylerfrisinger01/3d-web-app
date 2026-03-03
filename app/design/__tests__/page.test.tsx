import React from "react";

// Mock ThreeScene since it depends on three.js / WebGL
jest.mock("@/components/threeScene", () => {
  const MockThreeScene = () => React.createElement("div", { "data-testid": "three-scene-mock" });
  MockThreeScene.displayName = "MockThreeScene";
  return { __esModule: true, default: MockThreeScene };
});

describe("Design page", () => {
  // Bug reproduction: the design page module should resolve without errors
  // Previously this failed because @/components/threeScene did not exist
  test("design page module can be imported without module resolution errors", () => {
    expect(() => {
      require("../page");
    }).not.toThrow();
  });

  // Happy path: the page exports a default component
  test("exports a default React component", () => {
    const mod = require("../page");
    const PageComponent = mod.default;
    expect(PageComponent).toBeDefined();
    expect(typeof PageComponent).toBe("function");
  });

  // Edge case: the page component can be rendered as a React element
  test("page component creates a valid React element", () => {
    const mod = require("../page");
    const PageComponent = mod.default;
    const element = React.createElement(PageComponent);
    expect(element).toBeDefined();
    expect(element.type).toBe(PageComponent);
  });
});