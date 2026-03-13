import React from "react";

// Mock next/dynamic to render a simple placeholder
jest.mock("next/dynamic", () => {
  return jest.fn(() => {
    const MockedComponent = () => (
      <div data-testid="three-scene-mock">Mocked ThreeScene</div>
    );
    MockedComponent.displayName = "MockedDynamic";
    return MockedComponent;
  });
});

import { render, screen } from "@testing-library/react";
import Design from "../page";

describe("Design page", () => {
  // Bug reproduction: page must render without import errors
  test("renders the Design page without crashing", () => {
    const { container } = render(<Design />);
    expect(container).toBeTruthy();
  });

  // Happy path: the page contains the centered-div wrapper
  test("renders a div with className centered-div", () => {
    const { container } = render(<Design />);
    const wrapper = container.querySelector(".centered-div");
    expect(wrapper).toBeTruthy();
  });

  // Edge case: the dynamically loaded ThreeScene component is present
  test("renders the dynamically imported ThreeScene component", () => {
    render(<Design />);
    expect(screen.getByTestId("three-scene-mock")).toBeTruthy();
  });

  // Edge case: Design is a valid default export function
  test("Design is a valid React component", () => {
    expect(typeof Design).toBe("function");
  });
});