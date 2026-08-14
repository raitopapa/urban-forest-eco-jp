import { useEffect, useRef } from "react";
import { LngLatBounds, Map, NavigationControl, type GeoJSONSource, type MapGeoJSONFeature, type MapMouseEvent } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { TreeRecord } from "../domain/tree";

interface Props { trees: TreeRecord[]; selectedTreeId?: string; onSelectTree: (treeId: string) => void }
const SOURCE_ID = "trees";

export function TreeMap({ trees, selectedTreeId, onSelectTree }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const selectRef = useRef(onSelectTree);
  useEffect(() => { selectRef.current = onSelectTree; }, [onSelectTree]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new Map({
      container: containerRef.current, center: [140.1117, 36.0837], zoom: 15,
      style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] },
    });
    map.addControl(new NavigationControl(), "bottom-right");
    map.on("load", () => {
      map.addSource(SOURCE_ID, { type: "geojson", data: toGeoJson(trees, selectedTreeId) });
      map.addLayer({ id: "tree-halo", type: "circle", source: SOURCE_ID, paint: { "circle-radius": ["case", ["get", "selected"], 13, 9], "circle-color": "#fff", "circle-opacity": .9 } });
      map.addLayer({
        id: "tree-points", type: "circle", source: SOURCE_ID,
        paint: {
          "circle-radius": ["case", ["get", "selected"], 9, 6],
          "circle-color": ["match", ["get", "health"], "critical", "#c43d33", "poor", "#e68a2e", "dead", "#5b5b5b", "fair", "#d8b83f", "#278a55"],
          "circle-stroke-color": "#17372a", "circle-stroke-width": 1,
        },
      });
      map.on("click", "tree-points", (event: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        const id = event.features?.[0]?.properties?.treeId;
        if (id) selectRef.current(String(id));
      });
      map.on("mouseenter", "tree-points", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "tree-points", () => { map.getCanvas().style.cursor = ""; });
      fitToTrees(map, trees);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData(toGeoJson(trees, selectedTreeId));
    fitToTrees(map, trees);
  }, [trees, selectedTreeId]);

  return <div ref={containerRef} className="tree-map" aria-label="樹木位置図" />;
}

function toGeoJson(trees: TreeRecord[], selectedTreeId?: string): FeatureCollection<Point> {
  return { type: "FeatureCollection", features: trees.map((tree) => ({ type: "Feature", geometry: { type: "Point", coordinates: [tree.longitude, tree.latitude] }, properties: { treeId: tree.treeId, health: tree.healthCondition, selected: tree.treeId === selectedTreeId } })) };
}
function fitToTrees(map: Map, trees: TreeRecord[]) {
  if (!trees.length) return;
  const bounds = new LngLatBounds();
  trees.forEach((tree) => bounds.extend([tree.longitude, tree.latitude]));
  if (trees.length === 1) map.easeTo({ center: bounds.getCenter(), zoom: 17 });
  else map.fitBounds(bounds, { padding: 70, maxZoom: 17, duration: 500 });
}
