"use client";

import React from "react";
import dynamic from "next/dynamic";

const ThreeScene = dynamic(() => import("@/components/threeScene"), {
  ssr: false,
  loading: () => <p>Loading 3D scene...</p>,
});

export default function Design() {
  return (
    <div className="centered-div">
      <ThreeScene />
    </div>
  );
}