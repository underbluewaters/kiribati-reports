import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  Metric,
  DefaultExtraParams,
  getFirstFromParam,
  loadFgb,
  overlapFeatures,
  clip,
  splitSketchAntimeridian,
} from "@seasketch/geoprocessing";
import {
  Feature,
  ReportResult,
  rekeyMetrics,
  sortMetrics,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { clipToGeography } from "../util/clipToGeography.js";
import { bbox, featureCollection, intersect } from "@turf/turf";
import { fillBins, makeBins } from "./utils.js";
import calcArea from "@turf/area";

export type DepthResultType = {
  minDepth: number;
  maxDepth: number;
  meanDepth: number;
  histogram: { [depth: number]: number };
}

/**
 * depth for use with create:report command
 */
export async function depth(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
): Promise<DepthResultType> {
  const ds = project.getDatasourceById("bathy");
  const url = project.getDatasourceUrl(ds);
  // Check for client-provided geography, fallback to first geography assigned as default-boundary in metrics.json
  const geographyId = getFirstFromParam("geographyIds", extraParams);
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });
  const splitSketch = splitSketchAntimeridian(sketch);
  // Clip portion of sketch outside geography features
  const clippedSketch = await clipToGeography(splitSketch, curGeography);
  const bins = makeBins(0, 7000, 100);
  const result = {
    minDepth: 9999999999,
    maxDepth: 0,
    meanDepth: 0,
    histogram: {},
  }
  for (const sketch of toSketchArray(clippedSketch)) {
    const sketchBox = sketch.bbox || bbox(sketch);
    const depthFeatures = await loadFgb<Feature<Polygon | MultiPolygon>>(url, sketchBox);
    for (const feature of depthFeatures) {
      const clipped = intersect(featureCollection([feature, sketch]));
      if (clipped) {
        const amin = Math.abs(feature.properties!.amin);
        const amax = Math.abs(feature.properties!.amax);
        const area = calcArea(clipped.geometry);
        // fill in the bins
        fillBins(bins, amin, amax, area);
        if (amin < result.minDepth) {
          result.minDepth = amin;
        }
        const trueMax = Math.max(amin, Math.abs(feature.properties!.amax));
        if (trueMax > result.maxDepth) {
          result.maxDepth = trueMax;
        }
      }
    }
  }
  // calculate a weighted mean for meanDepth based on the histogram
  let sum = 0;
  let totalArea = 0;
  for (const { min, value } of bins) {
    sum += min * value;
    totalArea += value;
  }
  result.meanDepth = sum / totalArea;
  result.histogram = bins.reduce((acc, { min, value }) => {
    acc[min] = value;
    return acc;
  }, {} as { [depth: number]: number });
  return result;
}

export default new GeoprocessingHandler(depth, {
  title: "depth",
  description: "GEBCO contour overlays",
  timeout: 60, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
});

