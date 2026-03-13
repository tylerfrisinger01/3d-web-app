import React from "react";
import { render, screen } from "@testing-library/react";

// Mock the ThreeScene component to isolate the page test
jest.mock("@/components/threeScene", () => {
  return function MockThreeScene() {
    return <div data-testid="mock-three-scene" />;
  };
});

import Design from "../page";

describe("Design page", () => {
  // Bug reproduction: page must render without import errors
  test("renders without crashing (missing component fix verification)", () => {
    expect(() => render(<Design />)).not.toThrow();
  });

  // Happy path: page renders the ThreeScene component inside a div
  test("renders ThreeScene component inside centered-div", () => {
    const { container } = render(<Design />);
    const centeredDiv = container.querySelector(".centered-div");
    expect(centeredDiv).toBeTruthy();
    expect(screen.getByTestId("mock-three-scene")).toBeTruthy();
  });

  // Edge case: Design is a valid default export
  test("exports a default function component", () => {
    expect(typeof Design).toBe("function");
  });
});