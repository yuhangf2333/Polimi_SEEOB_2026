import { MilanLayerViewer } from "@/components/milan-layer-viewer";
import { getContextLayers, getLayerGroups } from "@/lib/layer-registry";

export default function Page() {
  return <MilanLayerViewer groups={getLayerGroups()} contextLayers={getContextLayers()} />;
}
