import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  ReportError,
  ResultsCard,
  SketchClassTable,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  Metric,
  MetricGroup,
  ReportResult,
  SketchProperties,
  flattenBySketchAllClass,
  metricsWithSketchId,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";


export const AllenCoralAtlas: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const geomorphicMetricGroup = project.getMetricGroup("geomorphicFeatures", t);
  const geomorphicPrecalcMetrics = project.getPrecalcMetrics(
    geomorphicMetricGroup,
    "area",
    curGeography.geographyId,
  );

  const benthicMetricGroup = project.getMetricGroup("benthicFeatures", t);
  const benthicPrecalcMetrics = project.getPrecalcMetrics(
    benthicMetricGroup,
    "area",
    curGeography.geographyId,
  );

  // Labels
  const titleLabel = t("Allen Coral Atlas");
  const mapLabel = t("Map");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("km²");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="allenCoralAtlas"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: ReportResult) => {
        const geomorphicPercMetricIdName = `${geomorphicMetricGroup.metricId}Perc`;

        const geomorphicValueMetrics = metricsWithSketchId(
          data.metrics.filter((m) => m.metricId === geomorphicMetricGroup.metricId),
          [id],
        );
        const geomorphicPercentMetrics = toPercentMetric(geomorphicValueMetrics, geomorphicPrecalcMetrics, {
          metricIdOverride: geomorphicPercMetricIdName,
        });
        const geomorphicMetrics = [...geomorphicValueMetrics, ...geomorphicPercentMetrics];

        const geomorphicObjectives = (() => {
          const objectives = project.getMetricGroupObjectives(geomorphicMetricGroup, t);
          if (objectives.length) {
            return objectives;
          } else {
            return;
          }
        })();

        const benthicPercMetricIdName = `${benthicMetricGroup.metricId}Perc`;

        const benthicValueMetrics = metricsWithSketchId(
          data.metrics.filter((m) => m.metricId === benthicMetricGroup.metricId),
          [id],
        );
        const benthicPercentMetrics = toPercentMetric(benthicValueMetrics, benthicPrecalcMetrics, {
          metricIdOverride: benthicPercMetricIdName,
        });
        const benthicMetrics = [...benthicValueMetrics, ...benthicPercentMetrics];

        const benthicObjectives = (() => {
          const objectives = project.getMetricGroupObjectives(benthicMetricGroup, t);
          if (objectives.length) {
            return objectives;
          } else {
            return;
          }
        })();

        return (
          <ReportError>
            <p>
              <Trans i18nKey="ACADescription">
                This report summarizes geomorphic and benthic features using data provided by the Allen Coral Atlas. A detailed description of these habitat classification can be found in the <a target="_blank" href="https://allencoralatlas.org/methods/#habitatmaps">Allen Coral Atlas Methods</a>.
              </Trans>
            </p>
            <h4 style={{ fontWeight: 500 }}>{t("Geomorphic Features")}</h4>
            <ClassTable
              rows={geomorphicMetrics}
              metricGroup={geomorphicMetricGroup}
              objective={geomorphicObjectives}
              columnConfig={[
                {
                  columnLabel: " ",
                  type: "class",
                  width: 30,
                },
                {
                  columnLabel: withinLabel,
                  type: "metricValue",
                  metricId: geomorphicMetricGroup.metricId,
                  valueFormatter: (v) =>
                    (Math.round(((v as number) * 1e-6) * 1) / 1).toLocaleString(),
                  valueLabel: unitsLabel,
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 20,
                },
                {
                  columnLabel: percWithinLabel,
                  type: "metricChart",
                  metricId: geomorphicPercMetricIdName,
                  valueFormatter: "percent",
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 40,
                }
              ]}
            />
            {isCollection && childProperties && (
              <Collapse title={t("Show by Sketch")}>
                {genSketchTable(
                  data,
                  geomorphicMetricGroup,
                  geomorphicPrecalcMetrics,
                  childProperties,
                )}
              </Collapse>
            )}

            <h4 style={{ fontWeight: 500 }}>{t("Benthic Features")}</h4>
            <ClassTable
              rows={benthicMetrics}
              metricGroup={benthicMetricGroup}
              objective={benthicObjectives}
              columnConfig={[
                {
                  columnLabel: " ",
                  type: "class",
                  width: 30,
                },
                {
                  columnLabel: withinLabel,
                  type: "metricValue",
                  metricId: benthicMetricGroup.metricId,
                  valueFormatter: (v) =>
                    (Math.round(((v as number) * 1e-6) * 1) / 1).toLocaleString(),
                  valueLabel: unitsLabel,
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 20,
                },
                {
                  columnLabel: percWithinLabel,
                  type: "metricChart",
                  metricId: benthicPercMetricIdName,
                  valueFormatter: "percent",
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 40,
                }
              ]}
            />
            {isCollection && childProperties && (
              <Collapse title={t("Show by Sketch")}>
                {genSketchTable(
                  data,
                  benthicMetricGroup,
                  benthicPrecalcMetrics,
                  childProperties,
                )}
              </Collapse>
            )}


            <Collapse title={t("Learn More")}>
              <Trans i18nKey="Allen Coral Atlas - learn more">
                <p>🗺️ Source Data: Allen Coral Atlas maps, bathymetry and map statistics are © 2018-2023 Allen Coral Atlas Partnership and Arizona State University and licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)</p>
                <p>
                  📈 Report: This report calculates the total value of each
                  feature within the plan. This value is divided by the total
                  value of each feature to obtain the % contained within the
                  plan. If the plan includes multiple areas that overlap, the
                  overlap is only counted once.
                </p>
              </Trans>
            </Collapse>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

const genSketchTable = (
  data: ReportResult,
  metricGroup: MetricGroup,
  precalcMetrics: Metric[],
  childProperties: SketchProperties[],
) => {
  const childSketchIds = childProperties
    ? childProperties.map((skp) => skp.id)
    : [];
  // Build agg metric objects for each child sketch in collection with percValue for each class
  const childSketchMetrics = toPercentMetric(
    metricsWithSketchId(
      data.metrics.filter((m) => m.metricId === metricGroup.metricId),
      childSketchIds,
    ),
    precalcMetrics,
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childProperties,
  );
  return (
    <SketchClassTable rows={sketchRows} metricGroup={metricGroup} formatPerc />
  );
};
