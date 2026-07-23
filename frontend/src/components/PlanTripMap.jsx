import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

// Custom pin generation using DivIcon to avoid Vite Leaflet asset resolution bugs
const getCustomIcon = (color, label) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #fff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      ">
        <div style="
          transform: rotate(45deg);
          color: #fff;
          font-weight: bold;
          font-size: 11px;
          font-family: sans-serif;
        ">
          ${label}
        </div>
      </div>
    `,
    className: "custom-leaflet-pin",
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -38]
  });
};

// Map controller to dynamically update center/zoom/bounds when coordinates change
function MapController({ startCoords, endCoords }) {
  const map = useMap();

  useEffect(() => {
    // Both coordinates available -> Fit Bounds
    if (startCoords && endCoords) {
      const bounds = L.latLngBounds([startCoords, endCoords]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    // Only start coordinates available -> Center and zoom in
    else if (startCoords) {
      map.setView(startCoords, 10);
    }
    // Only end coordinates available -> Center and zoom in
    else if (endCoords) {
      map.setView(endCoords, 10);
    }
    // Default fallback view: central Bagmati province / Kathmandu area
    else {
      map.setView([27.7, 85.3], 8);
    }
  }, [startCoords, endCoords, map]);

  return null;
}

export default function PlanTripMap({ startCoords, endCoords, startingDistrict, endingDistrict }) {
  // Validate coordinates to prevent crash if any is invalid or empty
  const isStartValid = startCoords && Array.isArray(startCoords) && startCoords.length === 2 && !isNaN(startCoords[0]) && !isNaN(startCoords[1]);
  const isEndValid = endCoords && Array.isArray(endCoords) && endCoords.length === 2 && !isNaN(endCoords[0]) && !isNaN(endCoords[1]);

  return (
    <div className="plantrip-map-side" style={{ width: "100%", height: "100%" }}>
      <MapContainer
        center={[27.7, 85.3]}
        zoom={8}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", borderRadius: "16px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {isStartValid && (
          <Marker position={startCoords} icon={getCustomIcon("#1B9B8A", "Start")}>
            <Popup>
              <strong>Starting District:</strong> {startingDistrict}
            </Popup>
          </Marker>
        )}

        {isEndValid && (
          <Marker position={endCoords} icon={getCustomIcon("#9B1B30", "End")}>
            <Popup>
              <strong>Ending District:</strong> {endingDistrict}
            </Popup>
          </Marker>
        )}

        {isStartValid && isEndValid && (
          <Polyline
            positions={[startCoords, endCoords]}
            color="#D4973C"
            weight={4}
            opacity={0.8}
          />
        )}

        <MapController
          startCoords={isStartValid ? startCoords : null}
          endCoords={isEndValid ? endCoords : null}
        />
      </MapContainer>
    </div>
  );
}
