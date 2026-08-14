"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { LngLatBounds, Map, Marker, NavigationControl, Popup } from "maplibre-gl";
import type { TreeRecord } from "../domain/tree";

interface Props {
  trees: TreeRecord[];
  selectedTreeId?: string;
  onSelectTree: (treeId: string) => void;
}

export function TreeMap({ trees, selectedTreeId, onSelectTree }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const popupRef = useRef<Popup | null>(null);
  const treesRef = useRef(trees);
  const selectedRef = useRef(selectedTreeId);
  const selectRef = useRef(onSelectTree);
  const previousSelectedRef = useRef<string | undefined>(undefined);
  const [mapError, setMapError] = useState(false);

  treesRef.current = trees;
  selectedRef.current = selectedTreeId;
  selectRef.current = onSelectTree;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!document.createElement("canvas").getContext("webgl2")) {
      setMapError(true);
      return;
    }

    let map: Map;
    try {
      map = new Map({
        container: containerRef.current,
        center: [140.1117, 36.0837],
        zoom: 15,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
      });
    } catch {
      setMapError(true);
      return;
    }

    map.addControl(new NavigationControl(), "bottom-right");
    map.on("load", () => {
      syncMarkers(map, treesRef.current, selectedRef.current, markersRef, popupRef, selectRef);
      fitAllTrees(map, treesRef.current);
      previousSelectedRef.current = selectedRef.current;
    });
    map.on("error", (event) => {
      if (String(event.error?.message ?? "").includes("WebGL")) setMapError(true);
    });
    mapRef.current = map;

    return () => {
      clearMarkers(markersRef);
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncMarkers(map, trees, selectedTreeId, markersRef, popupRef, selectRef);

    if (previousSelectedRef.current === undefined) {
      fitAllTrees(map, trees);
    } else if (selectedTreeId && selectedTreeId !== previousSelectedRef.current) {
      const selectedTree = trees.find((tree) => tree.treeId === selectedTreeId);
      if (selectedTree) {
        map.flyTo({
          center: [selectedTree.longitude, selectedTree.latitude],
          zoom: Math.max(map.getZoom(), 17),
          duration: 650,
          essential: true,
        });
      }
    }
    previousSelectedRef.current = selectedTreeId;
  }, [trees, selectedTreeId]);

  return (
    <div ref={containerRef} className="tree-map" aria-label="樹木位置図">
      {!mapError && (
        <div className="map-legend">
          <strong>樹木ポイント</strong>
          <span><i className="legend-good" />良好</span>
          <span><i className="legend-fair" />普通</span>
          <span><i className="legend-alert" />要確認</span>
          <small>黄色の外枠：選択中</small>
        </div>
      )}
      {mapError && <div className="map-error">この環境では地図を表示できません。樹木データは一覧から確認できます。</div>}
    </div>
  );
}

function syncMarkers(
  map: Map,
  trees: TreeRecord[],
  selectedTreeId: string | undefined,
  markersRef: MutableRefObject<Marker[]>,
  popupRef: MutableRefObject<Popup | null>,
  selectRef: MutableRefObject<(treeId: string) => void>,
) {
  clearMarkers(markersRef);

  markersRef.current = trees.map((tree) => {
    const markerButton = document.createElement("button");
    const markerPin = document.createElement("span");
    const label = tree.japaneseName || tree.speciesOriginal || tree.scientificName || "樹木";
    markerButton.type = "button";
    markerButton.className = `tree-marker ${healthClass(tree)}${tree.treeId === selectedTreeId ? " is-selected" : ""}`;
    markerButton.setAttribute("aria-label", `${label} ${tree.externalTreeId ?? tree.treeId}`);
    markerButton.title = `${label} / ${tree.externalTreeId ?? tree.treeId}`;
    markerPin.className = "tree-marker-pin";
    markerButton.append(markerPin);
    markerButton.addEventListener("click", (event) => {
      event.stopPropagation();
      selectRef.current(tree.treeId);
      const content = document.createElement("div");
      const title = document.createElement("strong");
      const meta = document.createElement("span");
      title.textContent = label;
      meta.textContent = tree.externalTreeId ?? tree.treeId;
      content.className = "tree-popup";
      content.append(title, meta);
      popupRef.current?.remove();
      popupRef.current = new Popup({ closeButton: false, offset: 24 })
        .setLngLat([tree.longitude, tree.latitude])
        .setDOMContent(content)
        .addTo(map);
    });

    return new Marker({ element: markerButton, anchor: "center" })
      .setLngLat([tree.longitude, tree.latitude])
      .addTo(map);
  });
}

function clearMarkers(markersRef: MutableRefObject<Marker[]>) {
  markersRef.current.forEach((marker) => marker.remove());
  markersRef.current = [];
}

function healthClass(tree: TreeRecord) {
  if (tree.healthCondition === "fair") return " marker-fair";
  if (["poor", "critical", "dead"].includes(tree.healthCondition)) return " marker-alert";
  return " marker-good";
}

function fitAllTrees(map: Map, trees: TreeRecord[]) {
  if (!trees.length) return;
  const bounds = new LngLatBounds();
  trees.forEach((tree) => bounds.extend([tree.longitude, tree.latitude]));
  if (trees.length === 1) map.easeTo({ center: bounds.getCenter(), zoom: 18 });
  else map.fitBounds(bounds, { padding: 100, maxZoom: 18, duration: 450 });
}
