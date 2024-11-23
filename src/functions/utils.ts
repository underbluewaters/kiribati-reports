import { BBox, Feature, loadFgb, MultiPolygon, Polygon, Sketch, SketchCollection, splitFeatureAntimeridian, toSketchArray } from "@seasketch/geoprocessing";
import { createHash } from "crypto";
import bbox from "@turf/bbox";
import { bboxPolygon } from "@turf/turf";

/**
 * Loads features from a FlatGeobuf referenced by URL, which intersect the
 * bounding boxes of each individual sketch in a SketchCollection, or a single
 * Sketch. 
 *
 * In the case of a SketchCollection, it is possible that duplicate features may
 * be fetched in the case of overlapping bounding boxes or very large features
 * that span multiple bounding boxes. This function will de-dupe those features.
 * Ideally, there is a feature.id property set. If not the caller can provide a
 * uniqueIdProperty to de-dupe features. If neither is provided, a hash of the
 * feature coordinates will be used.
 *
 * If feature.id is not available, and uniqueIdProperty is not provided, there
 * is the potential for elimination of features that are geometrically identical
 * but have different properties.
 *
 * @param sketch Sketch or SketchCollection
 * @param fgbUrl FlatGeobuf location
 * @param uniqueIdProperty Used to de-dupe features when feature.id is not
 * available
 * @returns 
 */
export async function getFeaturesForSketchBBoxes(sketch: Sketch | SketchCollection, fgbUrl: string, uniqueIdProperty?: string) {
  const features: Feature<Polygon | MultiPolygon>[] = [];
  const addedIdentifiers = new Set<string>();
  await Promise.all(toSketchArray(sketch).map(async (sketch) => {
    const box = bbox(sketch);
    const splitBoxes = splitBBoxAtAntimeridian(box) as BBox[];
    console.log('splitBoxes', splitBoxes);
    const results = (await Promise.all(splitBoxes.map(async (box) => {
      return await loadFgb<Feature<Polygon | MultiPolygon>>(fgbUrl, box);
    }))).flat();
    for (const feature of results) {
      let id = feature.id?.toString();
      if (!id) {
        if (uniqueIdProperty) {
          id = feature.properties?.[uniqueIdProperty];
        } else {
          id = createHash("md5").update(JSON.stringify(feature.geometry.coordinates)).digest("hex");
        }
      }
      if (id && !addedIdentifiers.has(id)) {
        addedIdentifiers.add(id);
        features.push(feature);
      }
    }
  }));
  return features;
}

type Bin = { min: number, value: number };

// example makeBins(0, 10, 1) -> [{min: 0, value: 0}, {min: 1, value: 0}, ... {min: 9, value: 0}]
export function makeBins(min: number, max: number, step: number) {
  const bins: { min: number, value: 0 }[] = [];
  for (let i = min; i < max; i += step) {
    bins.push({ min: i, value: 0 });
  }
  return bins;
}

// Finds the appropriate bins (plural), based on the min and max value and adds
// the value to bin.value
export function fillBins(bins: Bin[], min: number, max: number, value: number) {
  for (const bin of bins) {
    const nextBin = bins[bins.indexOf(bin) + 1];
    if (min >= bin.min && (nextBin === undefined || max < nextBin.min)) {
      bin.value += value;
    }
  }
}

export function splitBBoxAtAntimeridian(bbox: number[]) {
  // first, test whether bbox crosses antimeridian
  const [minX, minY, maxX, maxY] = bbox;

  // Normalize longitudes to the [-180, 180] range if needed
  const normMinX = ((minX + 180) % 360 + 360) % 360 - 180;
  const normMaxX = ((maxX + 180) % 360 + 360) % 360 - 180;

  // If the normalized bbox crosses the antimeridian, splitting is needed
  if (normMinX > normMaxX) {
    return [
      [normMinX, minY, 180, maxY],
      [-180, minY, normMaxX, maxY],
    ];
  } else {
    return [bbox];
  }
}