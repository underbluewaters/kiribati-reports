import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { reefBioregions } from "./reefBioregions.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof reefBioregions).toBe("function");
  });
  test("reefBioregions - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await reefBioregions(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "reefBioregions", example.properties.name);
    }
  }, 60_000);
});
