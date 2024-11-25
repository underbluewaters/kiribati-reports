import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  DefaultExtraParams,
  getFirstFromParam,
  loadFgb,
  splitSketchAntimeridian,
} from "@seasketch/geoprocessing";
import {
  Feature,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { clipToGeography } from "../util/clipToGeography.js";
import { bbox, feature, featureCollection, intersect } from "@turf/turf";
import calcArea from "@turf/area";
import { getFeaturesForSketchBBoxes } from "./utils.js";

/** Generated using data/bin/precalcExtra.ts */
const TOTAL_EEZ_AREA = 190339.3521636479;
const TOTAL_EEZ_COUNT = 199;

export type SeamountsResults = {
  /** Number of seamounts in this sketch or collection */
  count: number;
  /** Number of seamounts in the entire eez */
  countEEZ: number;
  /** deepest peak */
  maxPeakDepth?: number;
  /** shllowest peak */
  minPeakDepth?: number;
  /** Area of seamount habitat */
  area: number;
  /** Area of seamount habitat as a fraction of the entire eez */
  fractionOfEEZ: number;
}


/**
 * seamounts for use with create:report command
 */
export async function seamounts(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
): Promise<SeamountsResults> {
  const ds = project.getDatasourceById("seamounts");
  const url = project.getDatasourceUrl(ds);
  const normalizedSketch = splitSketchAntimeridian(sketch);
  const results: SeamountsResults = {
    count: 0,
    countEEZ: TOTAL_EEZ_COUNT,
    area: 0,
    fractionOfEEZ: 0,
  }
  const seamountIds = new Set<string>();
  let unknownSeamountCount = 0;
  for (const sketch of toSketchArray(normalizedSketch)) {
    const seamountFeatures = await getFeaturesForSketchBBoxes(normalizedSketch, url);
    for (const feature of seamountFeatures) {
      const clipped = intersect(featureCollection([feature, sketch]));
      if (clipped) {
        if (feature.properties?.["SeamountID"]) {
          seamountIds.add(feature.properties["SeamountID"]);
        } else {
          unknownSeamountCount++;
        }
        results.area += clipped.geometry ? calcArea(clipped) * 1e-6 : 0;
        if (feature.properties && "Peak_Depth" in feature.properties) {
          const peakDepth = Math.abs(feature.properties["Peak_Depth"]);
          if (results.maxPeakDepth === undefined || peakDepth > results.maxPeakDepth) {
            results.maxPeakDepth = peakDepth;
          }
          if (results.minPeakDepth === undefined || peakDepth < results.minPeakDepth) {
            results.minPeakDepth = peakDepth;
          }
        }
      }
    }
  }
  results.count = seamountIds.size;
  results.fractionOfEEZ = results.area / TOTAL_EEZ_AREA;
  return results;
}

export default new GeoprocessingHandler(seamounts, {
  title: "seamounts",
  description: "Seamounts",
  timeout: 60, // seconds
  memory: 1024, // megabytes
  executionMode: "sync",
});
