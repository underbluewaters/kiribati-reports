import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { allenCoralAtlas } from "./allenCoralAtlas.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof allenCoralAtlas).toBe("function");
  });
  test("allenCoralAtlas - tests run against all examples", async () => {
    let examples = (await getExamplePolygonSketchAll());
    for (const example of examples) {
      const result = await allenCoralAtlas(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "allenCoralAtlas", example.properties.name);
    }
  }, 60_000 * 10);
});
