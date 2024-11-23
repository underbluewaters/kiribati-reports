import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { benthicFeatures } from "./benthicFeatures.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof benthicFeatures).toBe("function");
  });
  test("benthicFeatures - tests run against all examples", async () => {
    let examples = (await getExamplePolygonSketchAll());
    for (const example of examples) {
      const result = await benthicFeatures(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "benthicFeatures", example.properties.name);
    }
  }, 60_000 * 10);
});
