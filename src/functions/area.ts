import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  getFirstFromParam,
  DefaultExtraParams,
  isSketchCollection,
  toSketchArray,
  FeatureCollection,
  Feature,
  splitSketchAntimeridian,
} from "@seasketch/geoprocessing";
import bbox from "@turf/bbox";
import turfArea from "@turf/area";
import eez from "./kiribati-eez.json";
import { featureCollection, intersect } from "@turf/turf";
import project from "../../project/projectClient.js";
import { clipToGeography } from "../util/clipToGeography.js";



type SketchAreaResults = {
  sketchName: string;
  area: number;
  groupAreas: {
    islandGroup: string;
    area: number;
    fractionOfGroup: number;
  }[]
};

export interface AreaResults {
  /** area of the sketch in square meters */
  sketchArea: SketchAreaResults[];
  totalArea: number;
  eezArea: number;
}


const GI = eez.features.find((f) => f.properties["UNION"] === "Gilbert Islands") as Feature<Polygon | MultiPolygon>;
const PI = eez.features.find((f) => f.properties["UNION"] === "Phoenix Group") as Feature<Polygon | MultiPolygon>;
const LI = eez.features.find((f) => f.properties["UNION"] === "Line Group") as Feature<Polygon | MultiPolygon>;
if (!GI || !PI || !LI) {
  throw new Error("Missing island group. Found " + [GI, PI, LI].filter((f) => f).map((f) => f!.properties!.UNION).join(", "));
}

const islandGroupAreas: { [group: string]: number } = {
  "Gilbert Islands": turfArea(GI),
  "Phoenix Group": turfArea(PI),
  "Line Group": turfArea(LI),
};

export async function area(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {}
): Promise<AreaResults> {
  const geographyId = getFirstFromParam("geographyIds", extraParams);

  // Get geography features, falling back to geography assigned to default-boundary group
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Support sketches crossing antimeridian
  const normalizedSketch = splitSketchAntimeridian(sketch);

  // // Clip to portion of sketch within current geography
  // const clippedSketch: SketchCollection<Polygon | MultiPolygon> | Sketch<Polygon | MultiPolygon> = await clipToGeography(splitSketch, curGeography);

  const results: AreaResults = {
    sketchArea: [],
    totalArea: 0,
    eezArea: Object.keys(islandGroupAreas).reduce((acc, cur) => acc + islandGroupAreas[cur], 0)
  }
  for (const feature of toSketchArray(normalizedSketch)) {
    const r: SketchAreaResults = {
      sketchName: feature.properties.name || "",
      area: 0,
      groupAreas: []
    };
    for (const group of (eez as FeatureCollection<Polygon | MultiPolygon>).features) {
      const clipped = intersect<Polygon | MultiPolygon>(featureCollection([feature, group]));
      if (clipped && clipped.geometry) {
        const islandGroup = group.properties?.UNION;
        if (islandGroup) {
          r.groupAreas.push({
            islandGroup,
            area: turfArea(clipped),
            fractionOfGroup: turfArea(clipped) / islandGroupAreas[islandGroup]!
          });
        }
      }
    }
    r.area = r.groupAreas.reduce((acc, cur) => acc + cur.area, 0);
    results.sketchArea.push(r);
  }
  results.totalArea = results.sketchArea.reduce((acc, cur) => acc + cur.area, 0);
  return results;
}

export default new GeoprocessingHandler(area, {
  title: "area",
  description: "Function description",
  timeout: 30, // seconds
  memory: 1024, // megabytes
  executionMode: "sync",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});