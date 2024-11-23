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
import { SeamountsResults } from "../functions/seamounts.js";

const PercentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/**
 * Seamounts component
 */
export const Seamounts: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  return (
    <ResultsCard title={t("Seamounts")} functionName="seamounts">
      {(data: SeamountsResults) => {
        const sketchStr = isCollection ? t("sketch collection") : t("sketch");
        const dataStr = JSON.stringify(data);

        if (data.area === 0) {
          return (
            <ReportError>
              <p>
                <Trans i18nKey="NoSeamounts">
                  This {sketchStr} contains no seamounts.
                </Trans>
              </p>
              <LayerToggle label={t("show seamounts on the map")} layerId="mL2OHYSyr" />
            </ReportError>
          );
        }

        const pluralizedSeamountStr = data.count === 1 ? t("seamount") : t("seamounts");
        return (
          <ReportError>
            <p>
              <Trans i18nKey="Seamounts Sketch Message">
                This {sketchStr} contains {data.count.toLocaleString()} {pluralizedSeamountStr}. The area of seamount habitat within this {sketchStr} is <span style={{
                  // borderBottom: "1px dotted navy"
                }}>{Math.round(data.area).toLocaleString()} km²</span>, {PercentFormatter.format(data.fractionOfEEZ)} of seamount habitat found in the EEZ.
              </Trans>
            </p>
            <p>
              {data.count === 1 && data.maxPeakDepth !== undefined ? <Trans i18nKey="SeamountsPeakHeightSingle">
                The seamount peak is <span style={{
                  // borderBottom: "1px dotted navy"
                }}>{data.maxPeakDepth.toLocaleString()} meters deep</span>.
              </Trans> : <Trans i18nKey="SeamountsPeakHeightPlural">
                Seamount peaks range from <span style={{
                  // borderBottom: "1px dotted navy"
                }}>{data.minPeakDepth!.toLocaleString()} meters</span> to <span style={{
                  // borderBottom: "1px dotted navy"
                }}>{data.maxPeakDepth!.toLocaleString()} meters</span> deep within this {sketchStr}.
              </Trans>}
            </p>
            <LayerToggle label={t("show seamounts on the map")} layerId="mL2OHYSyr" />
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
