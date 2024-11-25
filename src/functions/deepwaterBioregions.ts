import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  getFirstFromParam,
  DefaultExtraParams,
  splitSketchAntimeridian,
  Feature,
  isVectorDatasource,
  overlapFeatures,
  loadFgb,
} from "@seasketch/geoprocessing";
import bbox from "@turf/bbox";
import project from "../../project/projectClient.js";
import {
  Metric,
  ReportResult,
  rekeyMetrics,
  sortMetrics,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { clipToGeography } from "../util/clipToGeography.js";
import { getFeaturesForSketchBBoxes } from "./utils.js";

/**
 * deepwaterBioregions: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function deepwaterBioregions(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
): Promise<ReportResult> {
  // Use caller-provided geographyId if provided
  const geographyId = getFirstFromParam("geographyIds", extraParams);

  // Get geography features, falling back to geography assigned to default-boundary group
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Support sketches crossing antimeridian
  const normalizedSketch = splitSketchAntimeridian(sketch);

  // Chached features
  const cachedFeatures: Record<string, Feature<Polygon | MultiPolygon>[]> = {};

  // Calculate overlap metrics for each class in metric group
  const metricGroup = project.getMetricGroup("deepwaterBioregions");
  const metrics = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        if (!curClass.datasourceId)
          throw new Error(`Expected datasourceId for ${curClass.classId}`);

        const ds = project.getDatasourceById(curClass.datasourceId);
        if (!isVectorDatasource(ds))
          throw new Error(`Expected vector datasource for ${ds.datasourceId}`);

        const url = project.getDatasourceUrl(ds);

        // Fetch features overlapping with sketch, pull from cache if already fetched
        let features =
          cachedFeatures[curClass.datasourceId];
        if (!cachedFeatures[curClass.datasourceId]) {
          features = cachedFeatures[curClass.datasourceId] = await getFeaturesForSketchBBoxes(normalizedSketch, url);
        }

        // If this is a sub-class, filter by class name
        const finalFeatures =
          curClass.classKey && curClass.classId !== `${ds.datasourceId}_all`
            ? features.filter((feat) => {
              return (
                feat.geometry &&
                feat.properties![ds.classKeys[0]] === curClass.classId
              );
            })
            : features;

        // Calculate overlap metrics
        const overlapResult = await overlapFeatures(
          metricGroup.metricId,
          finalFeatures,
          normalizedSketch,
        );

        return overlapResult.map(
          (metric): Metric => ({
            ...metric,
            classId: curClass.classId,
            geographyId: curGeography.geographyId,
          }),
        );
      }),
    )
  ).flat();

  // Return a report result with metrics and a null sketch
  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
  };
}

export default new GeoprocessingHandler(deepwaterBioregions, {
  title: "deepwaterBioregions",
  description: "Overlap with deepwater bioregions",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
