import React from "react";

// Mock ThreeScene so the design page test doesn't need WebGL
jest.mock("@/components/threeScene", () => {
  return {
    __esModule: true,
    default: () => <div data-testid="three-scene-mock" />,
  };
});

import Design from "../page";

describe("Design page", () => {
  // Bug reproduction: page must import ThreeScene without error (was failing before fix)
  test("Design page component is importable and defined", () => {
    expect(Design).toBeDefined();
    expect(typeof Design).toBe("function");
  });

  // Happy path: renders without throwing
  test("Design page renders without crashing", () => {
    expect(() => {
      Design();
    }).not.toThrow();
  });

  // Edge case: returns a valid React element
  test("Design page returns a React element", () => {
    const result = Design();
    expect(result).toBeTruthy();
    expect(result.props).toBeDefined();
    expect(result.props.className).toBe("centered-div");
  });
});