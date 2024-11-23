import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { reefExtent } from "./reefExtent.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof reefExtent).toBe("function");
  });
  test("reefExtent - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await reefExtent(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "reefExtent", example.properties.name);
    }
  }, 60_000);
});
