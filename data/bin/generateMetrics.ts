import gdal from "gdal-async";
import fs from "fs";

export function extractClassesFromVectorSource(fpath: string, propertyName: string) {
  const ds = gdal.open(fpath);
  const classes = new Set<string>();
  const layer = ds.layers.get(0);
  layer.features.forEach((feature) => {
    const value = feature.fields.get(propertyName);
    if (value) {
      classes.add(value);
    }
  });
  return Array.from(classes);
}

(async () => {
  const metrics = [{
    metricId: "reefExtent",
    type: "areaOverlap",
    classes: []
  }] as any[];
  metrics.push({
    metricId: "deepwaterBioregions",
    type: "areaOverlap",
    classes: extractClassesFromVectorSource("data/dist/deepwater-bioregions.fgb", "Draft_name").map((classId) => ({
      classId,
      datasourceId: "deepwater-bioregions",
      classKey: "UNION",
      display: classId
    }))
  });
  metrics.push({
    metricId: "reefBioregions",
    type: "areaOverlap",
    classes: extractClassesFromVectorSource("data/dist/reef-bioregions.fgb", "Name").map((classId) => ({
      classId,
      datasourceId: "reef-bioregions",
      classKey: "Name",
      display: classId
    }))
  });
  metrics.push({
    metricId: "benthicFeatures",
    type: "areaOverlap",
    classes: extractClassesFromVectorSource("data/dist/benthic-features.fgb", "class").map((classId) => ({
      classId,
      datasourceId: "benthic-features",
      classKey: "class",
      display: classId
    }))
  });
  metrics.push({
    metricId: "geomorphicFeatures",
    type: "areaOverlap",
    classes: extractClassesFromVectorSource("data/dist/geomorphic-features.fgb", "class").map((classId) => ({
      classId,
      datasourceId: "geomorphic-features",
      classKey: "class",
      display: classId
    }))
  });
  fs.writeFileSync("project/metrics.json", JSON.stringify(metrics, null, 2));
})();