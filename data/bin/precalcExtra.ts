import gdal from "gdal-async";
import * as turf from "@turf/turf";
import cliProgress from "cli-progress";
import path from "path";

function getUTMZoneEPSG(layer: gdal.Layer): number {
  // Get the extent (bounding box) of the dataset
  const extent = layer.getExtent();

  // Calculate the longitude of the centroid
  const centroidLongitude = (extent.minX + extent.maxX) / 2;
  const centroidLatitude = (extent.minY + extent.maxY) / 2;

  // Determine the UTM zone
  const zone = Math.floor((centroidLongitude + 180) / 6) + 1;

  // Determine hemisphere
  const isNorthernHemisphere = centroidLatitude >= 0;

  // Return the EPSG code for UTM
  return isNorthernHemisphere ? 32600 + zone : 32700 + zone;
}

export function extractClassesFromVectorSource(fpath: string, propertyName: string) {
  const ds = gdal.open(fpath);
  const layer = ds.layers.get(0);
  // const zone = getUTMZoneEPSG(layer);
  // const targetSRS = gdal.SpatialReference.fromEPSG(zone);
  // const memoryDriver = gdal.drivers.get("Memory");
  //   const outDataset = memoryDriver.create("");
  if (!layer.features.count) {
    throw new Error("No features found in dataset");
  }
  const classes: {[className: string]: {area: number, fraction: number, count: number}} = {};
  // reproject dataset in memory to UTM
  // const reprojected = reprojectVectorDataset(ds, zone);
  let area = 0;
  let count = 0;
  const totalFeatures = layer.features.count();
  const b1 = new cliProgress.SingleBar({
    format: path.basename(fpath) + '|' +'{bar}' + '| {percentage}% || {value}/{total} features || {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    etaBuffer: 500
  });
  b1.start(totalFeatures, 0);
  layer.features.forEach((feature) => {
    count++;
    const value = feature.fields.get(propertyName);
    if (value && value.length) {
      if (!(value in classes)) {
        classes[value] = {area: 0, fraction: 0, count: 0};
      }
      const geom = feature.getGeometry();
      const geomArea = turf.area(JSON.parse(geom.toJSON())) * 1e-6;
      // @ts-ignore
      // const geomArea = geom.getArea() * 12362653.511704 * 1000 * 1e-6;
      area += geomArea;
      classes[value].area += geomArea;
      classes[value].count++;
    }
    b1.update(count);
  });
  b1.update(totalFeatures);
  b1.stop();
  area = area;
  // adjust fraction based on total area
  for (const klass in classes) {
    classes[klass].area = classes[klass].area;
    classes[klass].fraction = classes[klass].area / area;
  }
  return classes;
}

function reprojectVectorDataset(dataset: gdal.Dataset, targetEPSG: number) {
  if (!dataset.layers.count()) {
      throw new Error("No layers found in the dataset.");
  }
  console.log('reprojecting');

  // Define the target spatial reference
  const targetSRS = gdal.SpatialReference.fromEPSG(targetEPSG);

  // Create a new in-memory dataset
  const memoryDriver = gdal.drivers.get("Memory");
  const outDataset = memoryDriver.create("");

  // Loop through each layer in the original dataset
  dataset.layers.forEach((layer) => {
      const sourceSRS = layer.srs;

      if (!sourceSRS) {
          throw new Error(`Layer ${layer.name} does not have a spatial reference.`);
      }

      // Create a coordinate transformation
      const transform = new gdal.CoordinateTransformation(sourceSRS, targetSRS);

      // Create a new layer in the output dataset
      const outLayer = outDataset.layers.create(layer.name, targetSRS, layer.geomType);

      // Copy fields (attributes) from the source layer
      layer.fields.forEach((fieldDefn) => {
          outLayer.fields.add(new gdal.FieldDefn(fieldDefn.name, fieldDefn.type));
      });

      // Transform and copy each feature
      layer.features.forEach((feature) => {
          const transformedFeature = new gdal.Feature(layer);

          // Copy field values
          feature.fields.forEach((value, key) => {
              transformedFeature.fields.set(key, value);
          });

          // Transform geometry
          const geometry = feature.getGeometry();
          if (geometry) {
              geometry.transform(transform);
              transformedFeature.setGeometry(geometry);
          }

          // Add the transformed feature to the new layer
          outLayer.features.add(transformedFeature);
      });
  });

  return outDataset;
}

function calculateTotalAreaForAllFeatures(fname: string) {
  const ds = gdal.open(fname);
  const layer = ds.layers.get(0);
  let area = 0;
  let count = 0;
  const totalFeatures = layer.features.count();
  const b1 = new cliProgress.SingleBar({
    format: path.basename(fname) + '|' +'{bar}' + '| {percentage}% || {value}/{total} features || {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    etaBuffer: 500
  });
  b1.start(totalFeatures, 0);
  layer.features.forEach((feature) => {
    count++;
    const geom = feature.getGeometry();
    const geomArea = turf.area(JSON.parse(geom.toJSON())) * 1e-6;
    // @ts-ignore
    // const geomArea = geom.getArea() * 12362653.511704 * 1000 * 1e-6;
    area += geomArea;
    b1.update(count);
  });
  b1.update(totalFeatures);
  b1.stop();
  return area;
}

function getSeamountsStats(fname: string) {
  const ds = gdal.open(fname);
  const layer = ds.layers.get(0);
  const stats = {
    area: 0,
    count: 0,
    peakDepth: {min: 0, max: 0},
    height: {min: 0, max: 0},
  }
  const totalFeatures = layer.features.count();
  const b1 = new cliProgress.SingleBar({
    format: path.basename(fname) + '|' +'{bar}' + '| {percentage}% || {value}/{total} features || {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    etaBuffer: 500
  });
  b1.start(totalFeatures, 0);
  layer.features.forEach((feature) => {
    stats.count++;
    const geom = feature.getGeometry();
    const geomArea = turf.area(JSON.parse(geom.toJSON())) * 1e-6;
    stats.area += geomArea;
    const peakDepth = feature.fields.get("Peak_Depth");
    if (peakDepth !== null && peakDepth !== undefined) {
      if (peakDepth < stats.peakDepth.min) {
        stats.peakDepth.min = peakDepth;
      }
      if (peakDepth > stats.peakDepth.max) {
        stats.peakDepth.max = peakDepth;
      }
    }
    const height = feature.fields.get("Height");
    if (height !== null && height !== undefined) {
      if (height < stats.height.min) {
        stats.height.min = height;
      }
      if (height > stats.height.max) {
        stats.height.max = height;
      }
    }
    b1.update(stats.count);
  });
  b1.update(totalFeatures);
  b1.stop();
  return stats;
}

(async () => {
  // const areas = extractClassesFromVectorSource("./data/dist/geomorphic-features.fgb", "class");
  // console.log({
  //   title: "Geomorphic Features",
  //   classes: areas
  // });
  // const totalArea = Object.values(areas).reduce((acc, cur) => acc + cur.area, 0);
  // const totalFraction = Object.values(areas).reduce((acc, cur) => acc + cur.fraction, 0);
  // console.log("Total area:", totalArea, "km^2");
  // console.log("Total fraction:", totalFraction);
  console.log({
    seamounts: getSeamountsStats("./data/dist/seamounts.fgb")
  });
})();