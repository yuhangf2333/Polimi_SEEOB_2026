import { MilanLayerViewer } from "@/components/milan-layer-viewer";
import { getLayerGroups } from "@/lib/layer-registry";

export default function Home() {
  return <MilanLayerViewer groups={getLayerGroups()} />;
}
