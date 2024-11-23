import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { geomorphicFeatures } from "./geomorphicFeatures.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof geomorphicFeatures).toBe("function");
  });
  test("geomorphicFeatures - tests run against all examples", async () => {
    const examples = (await getExamplePolygonSketchAll()).slice(0, 1);
    for (const example of examples) {
      const result = await geomorphicFeatures(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "geomorphicFeatures", example.properties.name);
    }
  }, 60_000);
});
