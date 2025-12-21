import { Layout } from "./Layout";
import { Feed } from "./components/Feeds";
import { JsonRenderer } from "./components/InfoPanels";
import FieldView from "./components/FieldView";
import "react-mosaic-component/react-mosaic-component.css";
import "./app.css";

// Create the map of window IDs to components
const windowComponents = {
  1: (props: any) => <Feed {...props} type="color" />,
  2: (props: any) => <Feed {...props} type="depth" />,
  3: JsonRenderer,
  4: FieldView,
};

// Create the map of window IDs to titles
const windowTitles = {
  1: "Color Feed",
  2: "Depth Feed",
  3: "Raw Data",
  4: "Field View",
};

// Main App Component
export default function VAIRCApp() {
  return (
    <Layout windowComponents={windowComponents} windowTitles={windowTitles} />
  );
}
