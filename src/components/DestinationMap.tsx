"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef, useState } from "react";

export type MapPoint = { name: string; lat: number; lng: number; count: number; href: string };
type LatLng = { lat: number; lng: number };

/**
 * The destinations map (UC-15, ADR-0007): a numbered pin per town with
 * upcoming events. The list beside it carries the same information, so the
 * map is an extra; without JavaScript it simply doesn't appear, and the
 * container only becomes a labelled region once the map has mounted.
 *
 * The tile server and fallback center come in as props from the server page,
 * so the site config stays out of the client bundle.
 */
export function DestinationMap({
  points,
  focus,
  tiles,
  center,
}: {
  points: MapPoint[];
  focus?: LatLng;
  tiles: { url: string; attribution: string };
  center: LatLng;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!el.current) return;
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer(tiles.url, { attribution: tiles.attribution, maxZoom: 15 }).addTo(map);

      for (const p of points) {
        const icon = L.divIcon({
          className: "map-pin",
          html: `<span>${p.count}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([p.lat, p.lng], { icon, title: `${p.name}: ${p.count} upcoming`, alt: p.name }).addTo(map);
        marker.on("click", () => {
          window.location.href = p.href;
        });
      }

      if (focus) map.setView([focus.lat, focus.lng], 9);
      else if (points.length) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [30, 30], maxZoom: 10 });
      else map.setView([center.lat, center.lng], 7);
      setMounted(true);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points, focus, tiles, center]);

  return (
    <div
      ref={el}
      className="destination-map"
      role={mounted ? "region" : undefined}
      aria-label={mounted ? "Map of destinations" : undefined}
    />
  );
}
