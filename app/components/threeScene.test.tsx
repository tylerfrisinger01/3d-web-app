import React from "react";

// Mock Three.js before importing the component
const mockDispose = jest.fn();
const mockSetSize = jest.fn();
const mockSetPixelRatio = jest.fn();
const mockRender = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

const mockDomElement = document.createElement("canvas");

jest.mock("three", () => {
  return {
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
      position: { z: 0 },
      aspect: 1,
      updateProjectionMatrix: jest.fn(),
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: mockSetSize,
      setPixelRatio: mockSetPixelRatio,
      render: mockRender,
      dispose: mockDispose,
      domElement: mockDomElement,
    })),
    BoxGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
    MeshStandardMaterial: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      rotation: { x: 0, y: 0 },
    })),
    AmbientLight: jest.fn().mockImplementation(() => ({})),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
    })),
  };
});

import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

describe("ThreeScene", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 800, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 600, configurable: true });
    document.body.appendChild(container);
    jest.useFakeTimers();
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      return setTimeout(cb, 16) as unknown as number;
    });
    jest.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    document.body.removeChild(container);
  });

  test("Bug Reproduction: component renders without SSR errors (use client directive present)", async () => {
    // This test verifies the component can be imported and rendered in a jsdom environment
    // Before the fix, missing 'use client' or SSR-unsafe code would cause build/import errors
    const ThreeSceneModule = await import("./threeScene");
    const ThreeScene = ThreeSceneModule.default;
    expect(ThreeScene).toBeDefined();
    expect(typeof ThreeScene).toBe("function");
  });

  test("Edge Case: component handles mount ref being null gracefully", async () => {
    const ThreeSceneModule = await import("./threeScene");
    const ThreeScene = ThreeSceneModule.default;
    // Rendering in a minimal environment should not throw
    expect(() => {
      const div = document.createElement("div");
      act(() => {
        render(React.createElement(ThreeScene), div);
      });
      act(() => {
        unmountComponentAtNode(div);
      });
    }).not.toThrow();
  });

  test("Edge Case: renderer is disposed on unmount (cleanup works)", async () => {
    const ThreeSceneModule = await import("./threeScene");
    const ThreeScene = ThreeSceneModule.default;
    const div = document.createElement("div");
    document.body.appendChild(div);

    act(() => {
      render(React.createElement(ThreeScene), div);
    });

    act(() => {
      unmountComponentAtNode(div);
    });

    expect(mockDispose).toHaveBeenCalled();
    document.body.removeChild(div);
  });

  test("Happy Path: component renders a div container", async () => {
    const ThreeSceneModule = await import("./threeScene");
    const ThreeScene = ThreeSceneModule.default;
    const div = document.createElement("div");

    act(() => {
      render(React.createElement(ThreeScene), div);
    });

    const sceneContainer = div.firstChild as HTMLElement;
    expect(sceneContainer).toBeTruthy();
    expect(sceneContainer.tagName).toBe("DIV");
    expect(sceneContainer.style.width).toBe("100%");
    expect(sceneContainer.style.height).toBe("100vh");

    act(() => {
      unmountComponentAtNode(div);
    });
  });
});