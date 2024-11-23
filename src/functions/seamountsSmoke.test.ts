import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { seamounts } from "./seamounts.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof seamounts).toBe("function");
  });
  test("seamounts - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await seamounts(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "seamounts", example.properties.name);
    }
  }, 60_000);
});
