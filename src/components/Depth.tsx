import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  LayerToggle,
  ReportError,
  ResultsCard,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import { GeogProp, ReportResult } from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { DepthResultType } from "../functions/depth.js";
import { interpolatePuBu as colorScale } from "d3-scale-chromatic";

/**
 * Depth component
 */
export const Depth: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  return (
    <ResultsCard title={t("Depth")} functionName="depth">
      {(data: DepthResultType) => {
        const sketchStr = isCollection ? t("sketch collection") : t("sketch");
        const dataStr = JSON.stringify(data);

        return (
          <ReportError>
            <p>
              <Trans i18nKey="Depth Sketch Message">
                The minimum depth within this {{ sketchStr }} is <span style={{
                  borderBottom: "1px dotted navy"
                }}>{data.minDepth.toLocaleString()} meters</span>.
                The max depth is <span style={{
                  borderBottom: "1px dotted navy"
                }}>{data.maxDepth.toLocaleString()} meters</span>. Weighted mean is <span style={{ borderBottom: "1px dotted red" }}>{Math.round(data.meanDepth).toLocaleString()} meters</span>.
              </Trans>
            </p>
            <div>
              <Histogram data={data.histogram} meanDepth={data.meanDepth} minDepth={data.minDepth} maxDepth={data.maxDepth} unit={t("m")} />
            </div>
            <div style={{ marginTop: 20, marginBottom: 5 }}>
              <h4 style={{ fontWeight: 500, paddingBottom: 0, marginBottom: 10, fontSize: 15, color: "#555" }}>{t("Show bathymetry on the map")}</h4>
              <LayerToggle label={t("Gilbert Islands")} layerId="9oKjPmmct" />
              <div style={{ marginTop: 6 }}>
                <LayerToggle label={t("Phoenix Group")} layerId="JkzhPHx_q" />
              </div>
              <div style={{ marginTop: 6 }}>
                <LayerToggle label={t("Line Group")} layerId="6R8VOgerd" />
              </div>
            </div>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};


export function Histogram({ data, meanDepth, minDepth, maxDepth, unit }: { data: { [bin: number]: number }, meanDepth: number, minDepth: number, maxDepth: number, unit?: string }) {
  const max = Math.max(...Object.values(data));
  const width = `${100 / Object.keys(data).length}%`;
  const numBuckets = Object.keys(data).length;
  const minBucketValue = Math.min(...Object.keys(data).map(Number));
  const maxBucketValue = Math.max(...Object.keys(data).map(Number));
  const values = Object.keys(data);
  const step = Number(values[1]) - Number(values[0]);
  const maxScaleValue = Number(values[values.length - 1]) + step;
  const minScaleValue = values[0];
  // find %-left marker should be positioned at
  const meanDepthPosition = ((meanDepth - minBucketValue) / (maxBucketValue - minBucketValue)) * 100;
  const maxDepthPosition = ((maxDepth - minBucketValue) / (maxBucketValue - minBucketValue)) * 100;
  const minDepthPosition = ((minDepth - minBucketValue) / (maxBucketValue - minBucketValue)) * 100;
  return (
    <div>
      {/* <h3>Depth Histogram</h3> */}
      <div style={{ overflow: "clip", display: "flex", height: 80, alignItems: "flex-end", width: "100%", backgroundColor: "#efefef", borderRadius: 5, paddingBottom: 0, paddingTop: 20, border: "1px solid rgba(0,0,0,0.2)", position: "relative" }}>
        {Object.values(data).map((value, i) => (
          <div key={i} style={{ borderLeft: "1px solid rgba(0, 0, 0, 0.1)", borderTop: "1px solid rgba(0, 0, 0, 0.1)", flex: 1, height: `${(value / max) * 100}%`, backgroundColor: colorScale((i / numBuckets)), marginRight: -1, zIndex: numBuckets - i, marginBottom: 15 }}>
          </div>
        ))}
        <div style={{ zIndex: 200, height: "100%", width: 1, borderLeft: "1px dotted red", left: meanDepthPosition + "%", position: "absolute", bottom: 0 }}></div>
        <div style={{ zIndex: 200, height: "100%", width: 1, borderLeft: "1px dotted navy", left: minDepthPosition + "%", position: "absolute", bottom: 0 }}></div>
        <div style={{ zIndex: 200, height: "100%", width: 1, borderLeft: "1px dotted navy", left: `calc(${maxDepthPosition}% + 2px)`, position: "absolute", bottom: 0 }}></div>
        <div style={{ color: "black", position: "absolute", height: 15, width: "100%", background: "#ddd", bottom: 0, zIndex: 9999, display: "flex", alignItems: "center", fontSize: 11, borderTop: "1px solid rgba(0,0,0,0.2)" }}>
          <div style={{ flex: 1, paddingLeft: 2 }}>{minScaleValue}{unit}</div>
          <div style={{ flex: 1, paddingRight: 2, textAlign: "right" }}>{maxScaleValue}{unit}</div>
        </div>
      </div>
    </div>
  )

}