import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { deepwaterBioregions } from "./deepwaterBioregions.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof deepwaterBioregions).toBe("function");
  });
  test("deepwaterBioregions - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await deepwaterBioregions(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "deepwaterBioregions", example.properties.name);
    }
  }, 60_000);
});
