import React from "react";

// Mock the ThreeScene component to isolate the page test
jest.mock("@/components/threeScene", () => {
  const MockThreeScene = () => <div data-testid="three-scene-mock" />;
  MockThreeScene.displayName = "MockThreeScene";
  return { __esModule: true, default: MockThreeScene };
});

import { render } from "react-dom";
import { act } from "react-dom/test-utils";

describe("Design page", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test("Bug reproduction: page renders without import error (previously failed because threeScene.tsx was missing)", async () => {
    const Design = (await import("@/app/design/page")).default;
    expect(() => {
      act(() => {
        render(<Design />, container);
      });
    }).not.toThrow();
  });

  test("Edge case: page renders the ThreeScene component inside a wrapper div", async () => {
    const Design = (await import("@/app/design/page")).default;
    act(() => {
      render(<Design />, container);
    });
    const wrapper = container.querySelector(".centered-div");
    expect(wrapper).not.toBeNull();
    const mock = container.querySelector('[data-testid="three-scene-mock"]');
    expect(mock).not.toBeNull();
  });

  test("Happy path: default export is a valid React component function", async () => {
    const mod = await import("@/app/design/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});