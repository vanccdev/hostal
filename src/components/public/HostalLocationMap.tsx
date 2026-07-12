"use client";

import "ol/ol.css";
import { Feature, Map, View } from "ol";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { useEffect, useRef } from "react";

const hostalCoordinates = {
  latitude: -20.641224228393003,
  longitude: -65.20948944626011,
};

export const HostalLocationMap = () => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapElementRef.current) {
      return undefined;
    }

    const center = fromLonLat([hostalCoordinates.longitude, hostalCoordinates.latitude]);
    const marker = new Feature({
      geometry: new Point(center),
    });
    marker.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: "#c7a35a" }),
          stroke: new Stroke({ color: "#ffffff", width: 3 }),
        }),
      }),
    );

    const map = new Map({
      target: mapElementRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: new VectorSource({
            features: [marker],
          }),
        }),
      ],
      view: new View({
        center,
        zoom: 17,
      }),
      controls: [],
    });

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  return (
    <div className="relative min-h-[22rem] overflow-hidden rounded-2xl border border-[#d8d4c8] bg-[#ece4d4] dark:border-[#314237] dark:bg-[#1d2c23]">
      <div ref={mapElementRef} className="absolute inset-0" aria-label="Mapa de ubicación del hostal en Camargo" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-white/95 px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.16)] backdrop-blur dark:bg-[#18251d]/95">
        <p className="text-sm font-semibold text-[#18221b] dark:text-zinc-100">Hostal Plaza</p>
        <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">Camargo, Chuquisaca</p>
      </div>
    </div>
  );
};
