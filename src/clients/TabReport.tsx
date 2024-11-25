import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { SegmentControl, ReportPage, SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { ViabilityPage } from "../components/ViabilityPage.js";
import Translator from "../components/TranslatorAsync.js";
import { Seamounts } from "../components/Seamounts.js";
import { Depth } from "../components/Depth.js";
import { Area } from "../components/Area.js";
import { DeepwaterBioregions } from "../components/DeepwaterBioregions.js";
import { ReefBioregions } from "../components/ReefBioregions.js";
import { AllenCoralAtlas } from "../components/AllenCoralAtlas.js";

const enableAllTabs = false;
const BaseReport = () => {
  const { t } = useTranslation();
  const segments = [
    { id: "PHYSICAL", label: t("Info") },
    { id: "HABITATS", label: t("Habitats") },
    // { id: "FISHING", label: t("Fishing") }
  ];
  const [tab, setTab] = useState<string>("PHYSICAL");

  return (
    <>
      <div style={{ marginTop: 5 }}>
        <SegmentControl
          value={tab}
          onClick={(segment) => setTab(segment)}
          segments={segments}
        />
      </div>
      <ReportPage hidden={!enableAllTabs && tab !== "PHYSICAL"}>
        <Area />
        <Depth />
        <SketchAttributesCard autoHide />
      </ReportPage>
      <ReportPage hidden={!enableAllTabs && tab !== "HABITATS"}>
        <Seamounts />
        <DeepwaterBioregions />
        <ReefBioregions />
        <AllenCoralAtlas />
      </ReportPage>
    </>
  );
};

// Named export loaded by storybook
export const TabReport = () => {
  return (
    <Translator>
      <BaseReport />
    </Translator>
  );
};

// Default export lazy-loaded by top-level ReportApp
export default TabReport;
