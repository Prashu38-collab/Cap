import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import SplitLayout from "./SplitLayout";
import { getOSRMRoute, saveItinerary } from "../utils/api";
import "../styles/itineraryresult.css";

const catColors = {
  nature: "#059669",
  religious: "#d97706",
  cultural: "#7c3aed",
  adventure: "#dc2626",
  hotel: "#2563eb",
  transit: "#8b5cf6",
  meal: "#f59e0b",
  activity: "#3b82f6",
};

function getCatColor(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("nature")) return catColors.nature;
  if (c.includes("religious")) return catColors.religious;
  if (c.includes("cultural")) return catColors.cultural;
  if (c.includes("adventure")) return catColors.adventure;
  return "#6b7280";
}

const createMarkerPin = (color, label, active = true) => {
  const sz = active ? 32 : 24;
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: ${sz}px;
        height: ${sz}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${active ? '2.5px' : '1.5px'} solid #ffffff;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
      ">
        <div style="
          transform: rotate(45deg);
          color: #ffffff;
          font-weight: 800;
          font-size: ${active ? '11px' : '9px'};
          font-family: system-ui, -apple-system, sans-serif;
        ">${label}</div>
      </div>
    `,
    className: "custom-map-pin",
    iconSize: [sz, sz + 6],
    iconAnchor: [sz / 2, sz + 6],
    popupAnchor: [0, -(sz + 6)],
  });
};

function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 15);
    } else if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [center, zoom, bounds, map]);
  return null;
}

function EventIcon({ type, category }) {
  if (type === "meal") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/>
        <line x1="10" y1="1" x2="10" y2="4"/>
        <line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    );
  }
  if (type === "transit") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="14" rx="2"/>
        <path d="M7 21l2-4"/><path d="M17 21l-2-4"/>
        <circle cx="7" cy="13" r="1"/><circle cx="17" cy="13" r="1"/>
      </svg>
    );
  }
  if (type === "activity" || type === "hotel") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14"/>
        <path d="M9 21V11h6v10"/>
      </svg>
    );
  }
  const color = getCatColor(category);
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function downloadItineraryJSON(days, corridor, preferenceId) {
  const data = { preferenceId, corridor, itinerary: days };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `itinerary-${preferenceId || "trip"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT — renders via SplitLayout
   ───────────────────────────────────────────── */
export default function ItineraryResult({ itinerary, weatherForecast, preferenceId, corridor, onReset }) {
  const [activeDay, setActiveDay] = useState(1);
  const [highlightedId, setHighlightedId] = useState(null);

  if (!itinerary?.itinerary) return null;
  const days = itinerary.itinerary;
  const currentDay = days.find((d) => d.day === activeDay) || days[0];
  if (!currentDay) return null;

  const sightseeingPlaces = (currentDay.places || []).filter((p) => p.type === "place" || p.latitude);
  const totalDist = currentDay.total_travel_km || (currentDay.places || []).reduce((sum, p) => sum + (p.travel_dist_km || 0), 0) || 0;
  const recommendedTransport = (currentDay.places || []).find((p) => p.transport_mode)?.transport_mode || "Private Car / Local Bus";
  const totalTravelTimeMin = (currentDay.places || []).reduce((sum, p) => sum + (p.duration ? p.duration * 60 : 0), 0) + (totalDist > 0 ? (totalDist / 30) * 60 : 0);
  const travelTimeHrs = (totalTravelTimeMin / 60).toFixed(1);

  const focusPlace = (placeId, lat, lon) => {
    if (!lat || !lon) return;
    setHighlightedId(placeId);
  };

  const focusMarker = (id) => {
    setHighlightedId(id);
    document.getElementById(`tl-item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const weather = weatherForecast?.[activeDay - 1] || null;

  const leftPanel = (
    <div className="ir-main-container">
      {/* Header Card */}
      <div className="ir-header-card">
        <div className="ir-header-top-row">
          <div>
            <h2 className="ir-header-title">Your Journey Itinerary</h2>
            {corridor?.length > 0 && (
              <div className="ir-header-corridor">Route: {corridor.join(" → ")}</div>
            )}
          </div>
        </div>
        <div className="ir-stats-bar">
          <div className="ir-stat-item">
            <span className="ir-stat-val">{totalDist > 0 ? `${totalDist.toFixed(1)} km` : "—"}</span>
            <span className="ir-stat-lbl">Total Distance</span>
          </div>
          <div className="ir-stat-item">
            <span className="ir-stat-val">~{travelTimeHrs} hrs</span>
            <span className="ir-stat-lbl">Est. Duration</span>
          </div>
          <div className="ir-stat-item">
            <span className="ir-stat-val">{sightseeingPlaces.length} Stops</span>
            <span className="ir-stat-lbl">Visits</span>
          </div>
          <div className="ir-stat-item">
            <span className="ir-stat-val" style={{ fontSize: "12px" }}>{recommendedTransport}</span>
            <span className="ir-stat-lbl">Transport</span>
          </div>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="ir-tabs-row">
        {days.map((d) => (
          <button
            key={d.day}
            className={`ir-day-tab ${activeDay === d.day ? "is-active" : ""}`}
            onClick={() => {
              setActiveDay(d.day);
              setHighlightedId(null);
            }}
          >
            <span className="ir-day-tab-num">Day {d.day}</span>
            <span className="ir-day-tab-lbl">{d.day_title || d.district}</span>
          </button>
        ))}
      </div>

      {/* Day Header */}
      <div className="ir-day-header-card">
        <div className="ir-day-header-row">
          <div className="ir-day-header-left">
            <span className="ir-day-number-badge">Day {currentDay.day}</span>
            <div>
              <h3 className="ir-day-title">{currentDay.day_title || currentDay.district}</h3>
              {currentDay.hotel && (
                <span className="ir-day-hotel">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14"/>
                    <path d="M9 21V11h6v10"/>
                  </svg>
                  {currentDay.hotel.hotel_name}
                </span>
              )}
            </div>
          </div>
          {weather && (
            <div className="ir-weather-badge">
              <span className="ir-weather-icon">{weather.icon || "☀️"}</span>
              <span className="ir-weather-temp">{weather.temp || "24°C"}</span>
              <span className="ir-weather-desc">{weather.description || "Clear"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="ir-timeline-container">
        {(currentDay.places || []).map((item, idx) => {
          const isPlace = item.type === "place" || item.latitude;
          const isMeal = item.type === "meal";
          const isTransit = item.type === "transit";
          const itemId = item.place_id || `item-${activeDay}-${idx}`;
          const isHighlighted = highlightedId === itemId;

          return (
            <div key={idx} id={`tl-item-${itemId}`} className={`ir-tl-item ${isHighlighted ? "is-focused" : ""}`}>
              <div className="ir-tl-node">
                <EventIcon type={item.type} category={item.category} />
              </div>
              <div
                className={`ir-tl-card ${isPlace ? "is-clickable" : ""} ${isHighlighted ? "is-highlighted" : ""}`}
                onClick={() => isPlace && focusPlace(itemId, item.latitude, item.longitude)}
              >
                <div className="ir-tl-card-header">
                  <span className="ir-tl-time-badge">{item.start_time || "09:00"}</span>
                  {isPlace && item.category && (
                    <span
                      className="ir-meta-chip"
                      style={{ background: getCatColor(item.category) + "15", color: getCatColor(item.category) }}
                    >
                      {item.category}
                    </span>
                  )}
                  {isTransit && (
                    <span className="ir-meta-chip transit">{item.transport_mode || "Drive"}</span>
                  )}
                </div>

                <h4 className="ir-tl-title">{item.name || item.place_name}</h4>
                {item.description && <p className="ir-tl-desc">{item.description}</p>}

                <div className="ir-tl-meta-row">
                  {item.duration && <span className="ir-meta-chip">{item.duration} hrs</span>}
                  {item.travel_dist_km > 0 && (
                    <span className="ir-meta-chip">{item.travel_dist_km} km</span>
                  )}
                  {item.district && <span className="ir-meta-chip">{item.district}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hotel / Reset Bar */}
      <div className="ir-bottom-actions">
        {currentDay.hotel && (
          <div className="ir-hotel-line">
            <div className="ir-hotel-dot" />
            <span className="ir-hotel-name">{currentDay.hotel.hotel_name}</span>
            <span className="ir-hotel-hint">Tonight's stay</span>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="sl-bottom-actions">
        {onReset && (
          <button className="sl-btn sl-btn-secondary" onClick={onReset}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Plan Another Trip
          </button>
        )}
        <button
          className="sl-btn sl-btn-primary"
          onClick={async () => {
            try {
              await saveItinerary(preferenceId, itinerary);
              alert("Itinerary saved successfully!");
            } catch (err) {
              alert("Failed to save: " + (err.message || "Unknown error"));
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Itinerary
        </button>
      </div>
    </div>
  );

  return (
    <SplitLayout
      leftContent={leftPanel}
      rightContent={
        <ItineraryRightMap
          itinerary={itinerary}
          activeDay={activeDay}
          highlightedId={highlightedId}
          onSelectMarker={focusMarker}
        />
      }
    />
  );
}

/* ─────────────────────────────────────────────
   Google Encoded Polyline decoder
   ───────────────────────────────────────────── */
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/* ─────────────────────────────────────────────
   RIGHT MAP — used by SplitLayout
   Fetches OSRM road route and draws real polyline
   ───────────────────────────────────────────── */
function ItineraryMapInner({ itinerary, activeDay, highlightedId, onSelectMarker }) {
  const [routeGeometry, setRouteGeometry] = useState(null);

  if (!itinerary?.itinerary) return null;
  const days = itinerary.itinerary;
  const currentDay = days.find((d) => d.day === activeDay) || days[0];

  const mapPoints = [];
  if (currentDay?.hotel?.latitude && currentDay?.hotel?.longitude) {
    mapPoints.push({
      id: `hotel-${currentDay.day}`,
      name: currentDay.hotel.hotel_name,
      lat: parseFloat(currentDay.hotel.latitude),
      lon: parseFloat(currentDay.hotel.longitude),
      type: "hotel",
      label: "H",
      district: currentDay.district || "",
    });
  }

  let orderCount = 1;
  (currentDay?.places || []).forEach((p, idx) => {
    if (p.latitude && p.longitude) {
      mapPoints.push({
        id: p.place_id || `place-${currentDay.day}-${idx}`,
        name: p.name || p.place_name,
        lat: parseFloat(p.latitude),
        lon: parseFloat(p.longitude),
        type: "place",
        category: p.category,
        label: `${orderCount++}`,
        district: p.district || currentDay.district || "",
        duration: p.duration ? `${p.duration} hrs` : "",
        order: idx + 1,
      });
    }
  });

  const activeBounds = mapPoints.map((m) => [m.lat, m.lon]);

  // Fetch OSRM route when day or points change
  useEffect(() => {
    if (mapPoints.length < 2) {
      setRouteGeometry(null);
      return;
    }
    const coords = mapPoints.map((m) => [m.lat, m.lon]);
    let cancelled = false;
    getOSRMRoute(coords)
      .then((data) => {
        if (!cancelled && data?.geometry) {
          let decoded;
          if (typeof data.geometry === "string") {
            decoded = decodePolyline(data.geometry);
          } else if (data.geometry?.coordinates) {
            decoded = data.geometry.coordinates.map((c) => [c[1], c[0]]);
          } else {
            decoded = null;
          }
          setRouteGeometry(decoded);
        } else if (!cancelled) {
          setRouteGeometry(null);
        }
      })
      .catch(() => { if (!cancelled) setRouteGeometry(null); });
    return () => { cancelled = true; };
  }, [activeDay, mapPoints.length, JSON.stringify(mapPoints.map((m) => m.id))]);

  return (
    <MapContainer
      center={activeBounds.length > 0 ? activeBounds[0] : [27.7, 85.3]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mapPoints.map((m) => {
        const isHighlighted = highlightedId === m.id;
        const color = m.type === "hotel" ? "#2563eb" : getCatColor(m.category);
        return (
          <Marker
            key={m.id}
            position={[m.lat, m.lon]}
            icon={createMarkerPin(color, m.label, isHighlighted)}
            eventHandlers={{ click: () => onSelectMarker && onSelectMarker(m.id) }}
          >
            <Popup>
              <div className="ir-map-popup">
                <div className="ir-popup-cat" style={{ color }}>
                  {m.type === "hotel" ? "Hotel" : `Stop #${m.order}`}
                </div>
                <div className="ir-popup-title">{m.name}</div>
                <div className="ir-popup-district">{m.district}</div>
                <div className="ir-popup-coords">{m.lat.toFixed(4)}, {m.lon.toFixed(4)}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
      {routeGeometry && routeGeometry.length > 1 ? (
        <Polyline positions={routeGeometry} color="#2563eb" weight={4} opacity={0.9} />
      ) : (
        activeBounds.length > 1 && (
          <Polyline positions={activeBounds} color="#2563eb" weight={3.5} opacity={0.85} dashArray="6, 6" />
        )
      )}
      <MapController bounds={activeBounds} />
    </MapContainer>
  );
}

export function ItineraryRightMap(props) {
  return <ItineraryMapInner {...props} />;
}
