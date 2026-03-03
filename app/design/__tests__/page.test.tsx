import React from "react";

// Mock the ThreeScene component to isolate the design page test
jest.mock("@/components/threeScene", () => {
  const MockThreeScene = () =>
    React.createElement("div", { "data-testid": "three-scene-mock" });
  MockThreeScene.displayName = "MockThreeScene";
  return { __esModule: true, default: MockThreeScene };
});

// Import the real design page
import DesignPage from "../page";

describe("Design page", () => {
  // Bug reproduction: design page should import ThreeScene without module-not-found error
  test("design page module can be imported without errors", () => {
    expect(DesignPage).toBeDefined();
  });

  // Edge case: page renders without crashing
  test("design page renders without throwing", () => {
    const { render: rtlRender } = require("@testing-library/react");
    expect(() => {
      rtlRender(React.createElement(DesignPage));
    }).not.toThrow();
  });

  // Happy path: page includes the ThreeScene component
  test("design page includes ThreeScene component", () => {
    const { render: rtlRender } = require("@testing-library/react");
    const { getByTestId } = rtlRender(React.createElement(DesignPage));
    expect(getByTestId("three-scene-mock")).toBeTruthy();
  });
});