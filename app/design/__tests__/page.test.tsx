import React from "react";

// Mock the dynamic import of ThreeScene
jest.mock("next/dynamic", () => {
  return jest.fn(() => {
    const MockComponent = () => <div data-testid="three-scene-mock">ThreeScene</div>;
    MockComponent.displayName = "DynamicThreeScene";
    return MockComponent;
  });
});

import { render, screen } from "@testing-library/react";
import Design from "../page";

describe("Design page", () => {
  // Bug reproduction: page must import and render ThreeScene without error
  it("renders without crashing (bug repro: import resolution)", () => {
    const { container } = render(<Design />);
    expect(container).toBeTruthy();
  });

  // Edge case: the wrapper div has the correct class
  it("renders a div with className centered-div", () => {
    const { container } = render(<Design />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toBe("centered-div");
  });

  // Happy path: ThreeScene component is rendered inside the page
  it("renders the ThreeScene component", () => {
    render(<Design />);
    expect(screen.getByTestId("three-scene-mock")).toBeTruthy();
  });
});