import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  getFirstFromParam,
  DefaultExtraParams,
  Feature,
  isVectorDatasource,
  overlapFeatures,
  getFeatures,
  splitSketchAntimeridian,
} from "@seasketch/geoprocessing";
import bbox from "@turf/bbox";
import project from "../../project/projectClient.js";
import {
  BBox,
  Metric,
  ReportResult,
  rekeyMetrics,
  sortMetrics,
} from "@seasketch/geoprocessing/client-core";
import { clipToGeography } from "../util/clipToGeography.js";
import { getFeaturesForSketchBBoxes, splitBBoxAtAntimeridian } from "./utils.js";
import { bboxPolygon } from "@turf/turf";

export async function allenCoralAtlas(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
): Promise<ReportResult> {
  // Check for client-provided geography, fallback to first geography assigned as default-boundary in metrics.json
  const geographyId = getFirstFromParam("geographyIds", extraParams);
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });
  const splitSketch = splitSketchAntimeridian(sketch);

  if (sketch.properties.name === "Spans Island Groups") {
    console.log('splitSketch', JSON.stringify(splitSketch));
    const box = bbox(splitSketch);
    console.log('before split bbox', bbox(sketch));
    console.log('splitSketch bbox', bbox(splitSketch));
    console.log(JSON.stringify(bboxPolygon(bbox(splitSketch))));
    const splitBBoxes = splitBBoxAtAntimeridian(box);
    console.log('split box', splitBBoxes);
    if (splitBBoxes.length > 1) {
      for (const b of splitBBoxes) {
        console.log(JSON.stringify(bboxPolygon(b as BBox)));
      }
    }
  }
  // console.log('splitSketch', JSON.stringify(splitSketch));
  // Clip portion of sketch outside geography features
  const clippedSketch = await clipToGeography(splitSketch, curGeography);
  if (sketch.properties.name === "Spans Island Groups") {
    console.log('bbox after clip', bbox(clippedSketch));
  }

  const featuresByDatasource: Record<
    string,
    Feature<Polygon | MultiPolygon>[]
  > = {};

  if (sketch.properties.name === "Spans Island Groups") {
    console.log('clippedSketch', clippedSketch);
  }
  // console.log(bbox(clippedSketch), bbox(splitSketch));
  // Calculate overlap metrics for each class in metric group
  let metricGroup = project.getMetricGroup("geomorphicFeatures");
  let metrics = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        if (!curClass.datasourceId)
          throw new Error(`Expected datasourceId for ${curClass.classId}`);

        const ds = project.getDatasourceById(curClass.datasourceId);
        if (!isVectorDatasource(ds))
          throw new Error(`Expected vector datasource for ${ds.datasourceId}`);

        const url = project.getDatasourceUrl(ds);

        let features =
          featuresByDatasource[curClass.datasourceId];
        if (!features) {
          features = featuresByDatasource[curClass.datasourceId] = await getFeaturesForSketchBBoxes(clippedSketch, url);
        }
        if (sketch.properties.name === "Spans Island Groups") {
          console.log('related features', features.length);
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
          clippedSketch,
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

  metricGroup = project.getMetricGroup("benthicFeatures");
  const benthicMetrics = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        if (!curClass.datasourceId)
          throw new Error(`Expected datasourceId for ${curClass.classId}`);

        const ds = project.getDatasourceById(curClass.datasourceId);
        if (!isVectorDatasource(ds))
          throw new Error(`Expected vector datasource for ${ds.datasourceId}`);

        const url = project.getDatasourceUrl(ds);

        let features =
          featuresByDatasource[curClass.datasourceId];
        if (!features) {
          features = featuresByDatasource[curClass.datasourceId] = await getFeaturesForSketchBBoxes(clippedSketch, url);
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
          clippedSketch,
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

  metrics = [...metrics, ...benthicMetrics];

  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
  };
}

export default new GeoprocessingHandler(allenCoralAtlas, {
  title: "allenCoralAtlas",
  description: "Evaluate Geomorphic and Benthic Features",
  timeout: 500, // seconds
  memory: 4096, // megabytes
  executionMode: "async",
});