import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { depth } from "./depth.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof depth).toBe("function");
  });
  test("depth - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await depth(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "depth", example.properties.name);
    }
  }, 60_000);
});
