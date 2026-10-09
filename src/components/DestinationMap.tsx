"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";

import { site } from "@/config/site";

export type MapPoint = { name: string; lat: number; lng: number; count: number; href: string };

/**
 * The destinations map (UC-15, ADR-0007): a numbered pin per town with
 * upcoming events. The list beside it carries the same information, so the
 * map is an extra; without JavaScript it simply doesn't appear.
 */
export function DestinationMap({ points, focus }: { points: MapPoint[]; focus?: { lat: number; lng: number } }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer(site.mapTiles.url, { attribution: site.mapTiles.attribution, maxZoom: 15 }).addTo(map);

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
      else map.setView([site.mapCenter.lat, site.mapCenter.lng], 7);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points, focus]);

  return <div ref={el} className="destination-map" role="region" aria-label="Map of destinations" />;
}
