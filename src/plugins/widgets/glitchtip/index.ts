import { Config } from "../../types";
import GlitchTip from "./GlitchTip";
import GlitchTipSettings from "./GlitchTipSettings";

const config: Config = {
  key: "widget/glitchtip",
  name: "GlitchTip Events",
  description: "See the latest error events from your project.",
  dashboardComponent: GlitchTip,
  settingsComponent: GlitchTipSettings,
  defaultPosition: "topRight",
};

export default config;
