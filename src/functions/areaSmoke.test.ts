import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { area } from "./area.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof area).toBe("function");
  });
  test("area - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await area(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "area", example.properties.name);
    }
  }, 60_000);
});
