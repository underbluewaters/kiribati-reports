import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ReportError,
  ResultsCard,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import { GeogProp, ReportResult } from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { AreaResults } from "../functions/area.js";

const PercentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/**
 * Area component
 */
export const Area: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });



  return (
    <ResultsCard title={t("Area")} functionName="area">
      {(data: AreaResults) => {
        const areaByGroup = data.sketchArea.reduce((acc, sketchArea) => {
          sketchArea.groupAreas.forEach(groupArea => {
            acc[groupArea.islandGroup] = groupArea.area;
          });
          return acc;
        }, {} as { [groupName: string]: number });
        const sketchStr = isCollection ? t("sketch collection") : t("sketch");
        if (data.sketchArea.length === 1 && data.sketchArea[0].groupAreas.length === 1) {
          return (
            <ReportError>
              <p>
                <Trans i18nKey="AreaSimple">
                  📐
                  This {sketchStr} is{" "}
                  <b>{(Math.round(data.totalArea * 1e-6)).toLocaleString()}</b>{" "}
                  km², and covers <b>{PercentFormatter.format(data.totalArea / data.eezArea)}</b> of the EEZ. It falls entirely within the {data.sketchArea[0].groupAreas[0].islandGroup}.
                </Trans>
              </p>
            </ReportError>
          );
        } else if (data.sketchArea.length > 1 || data.sketchArea[0].groupAreas.length > 1) {
          return (
            <ReportError>
              <p>
                <Trans i18nKey="AreaSimple">
                  📐
                  This {sketchStr} is{" "}
                  <b>{(Math.round(data.totalArea * 1e-6)).toLocaleString()}</b>{" "}
                  km² and covers <b>{PercentFormatter.format(data.totalArea / data.eezArea)}</b> of the EEZ. It spans the following island groups.
                </Trans>
              </p>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr style={{ color: "#333" }}>
                    <th style={{ textAlign: "left", fontSize: 14 }}>Name</th>
                    <th style={{ fontWeight: "bold", fontSize: 14 }}>Area (km²)</th>
                    <th style={{ fontWeight: "bold", fontSize: 14 }}>% of Group</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(areaByGroup).map((groupName) => (
                    <tr key={groupName}>
                      <td>{groupName}</td>
                      <td style={{ textAlign: "center" }}>{(Math.round(areaByGroup[groupName] * 1e-6)).toLocaleString()}</td>
                      <td style={{ textAlign: "center" }}>{PercentFormatter.format(areaByGroup[groupName] / data.totalArea)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportError>
          );
        }
        return (
          <ReportError>
            <p>
              <Trans i18nKey="Area Sketch Message">
                📐
                This {sketchStr} is{" "}
                <b>{(Math.round(data.totalArea * 1e-6)).toLocaleString()}</b>{" "}
                km²
              </Trans>
            </p>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
