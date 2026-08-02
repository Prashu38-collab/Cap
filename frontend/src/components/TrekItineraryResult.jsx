import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import SplitLayout from "./SplitLayout";
import "../styles/itineraryresult.css";

const getTrekIcon = (color, label, isActive = true) => {
  const size = isActive ? 28 : 20;
  const fontSize = isActive ? 10 : 8;
  return L.divIcon({
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"><div style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:${fontSize}px">${label}</div></div>`,
    className: "place-pin",
    iconSize: [size, size + 5],
    iconAnchor: [size / 2, size + 5],
    popupAnchor: [0, -(size + 5)],
  });
};

const hotelIcon = L.divIcon({
  html: `<div style="background:#2563eb;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"><div style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:10px">H</div></div>`,
  className: "place-pin",
  iconSize: [28, 33],
  iconAnchor: [14, 33],
  popupAnchor: [0, -33],
});

function MapController({ center, zoom, activeBounds }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || 14);
    else if (activeBounds?.length) {
      const boundsArr = [...activeBounds];
      map.fitBounds(boundsArr, { padding: [50, 50], maxZoom: 15 });
    }
  }, [center, zoom, activeBounds, map]);
  return null;
}

function downloadTrekItinerary(trekItinerary) {
  const data = { trek_name: trekItinerary.trek_name, district: trekItinerary.district, total_days: trekItinerary.total_days, days: trekItinerary.days };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trek-${trekItinerary.trek_name?.replace(/\s+/g, "-").toLowerCase() || "trek"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const COLORS = {
  breakfast: "#f59e0b", departure: "#3b82f6", travel: "#8b5cf6", arrival: "#10b981",
  lunch: "#f59e0b", explore: "#06b6d4", activity: "#ef4444", check_in: "#2563eb",
  dinner: "#f59e0b", rest: "#64748b", overnight: "#475569",
};

function EventIconSVG({ type }) {
  const c = COLORS[type] || "#64748b";
  if (type === "breakfast" || type === "lunch" || type === "dinner") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      </svg>
    );
  }
  if (type === "travel") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="14" rx="2"/><path d="M7 21l2-4"/><path d="M17 21l-2-4"/>
      </svg>
    );
  }
  if (type === "departure" || type === "arrival") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function getTabLabel(day) {
  if (day.is_travel_day) return "Travel";
  if (day.is_return_day) return "Return";
  if (day.is_trek_day) return `Trek ${day.day_number - 1}`;
  return (day.stop_name || "").substring(0, 8) || `Day ${day.day_number}`;
}

//Main Component 
export default function TrekItineraryResult({ trekItinerary, hotelSelections, onHotelSelect, onBack, onReset }) {
  const [activeDay, setActiveDay] = useState(1);
  const [animDir, setAnimDir] = useState("next");
  const [mapCenter, setMapCenter] = useState(null);
  const markerRefs = useRef({});

  if (!trekItinerary?.days) return null;
  const { trek_name, district, total_days, days } = trekItinerary;
  const currentDay = days.find((d) => d.day_number === activeDay) || days[0];
  if (!currentDay) return null;

  const changeDay = (day) => {
    setMapCenter(null);
    setAnimDir(day > activeDay ? "next" : "prev");
    setActiveDay(day);
  };

  const handleMarkerClick = (markerId) => {
    document.getElementById(`tl-trek-${markerId.replace("day-", "")}-0`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const selectedHotel = currentDay.overnight
    ? currentDay.nearby_hotels?.find((h) => hotelSelections[currentDay.day_number] === h.hotel_id)
    : null;

  const schedule = currentDay.timeline || [];

  const leftPanel = (
    <div className="ir-main-container">
      {/* Header */}
      <div className="ir-header-card sl-card">
        <div className="ir-header-top-row">
          <div>
            <h2 className="ir-header-title">{trek_name}</h2>
            <div className="ir-header-corridor">{district}</div>
            <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>{total_days} day{total_days > 1 ? "s" : ""} trek</p>
          </div>
          <button className="ir-save-btn" onClick={() => downloadTrekItinerary(trekItinerary)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save
          </button>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="ir-tabs-row sl-card" style={{ padding: "12px 16px" }}>
        {days.map((d) => (
          <button key={d.day_number} className={`ir-day-tab ${activeDay === d.day_number ? "is-active" : ""}`} onClick={() => changeDay(d.day_number)}>
            <span className="ir-day-tab-num">{d.day_number}</span>
            <span className="ir-day-tab-lbl">{getTabLabel(d)}</span>
          </button>
        ))}
      </div>

      {/* Day Content with Animation */}
      <div key={activeDay} className={`ir-day-content slide-${animDir}`}>
        {/* Day Header */}
        <div className="ir-day-header-card">
          <div className="ir-day-header-row">
            <div className="ir-day-header-left">
              <span className="ir-day-number-badge">{currentDay.day_number}</span>
              <div>
                <h3 className="ir-day-title">{currentDay.stop_name}</h3>
                <span className="ir-day-hotel">{currentDay.travel_time || ""}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="ir-stats-bar" style={{ marginTop: 12 }}>
          <div className="ir-stat-item">
            <span className="ir-stat-val">{currentDay.stop_name}</span>
            <span className="ir-stat-lbl">{currentDay.is_travel_day ? "Destination" : "Stop"}</span>
          </div>
          <div className="ir-stat-item">
            <span className="ir-stat-val">{currentDay.travel_time || "—"}</span>
            <span className="ir-stat-lbl">Travel</span>
          </div>
          <div className="ir-stat-item">
            <span className="ir-stat-val" style={{ fontSize: 11 }}>
              {selectedHotel ? selectedHotel.hotel_name?.split(" ").slice(0, 2).join(" ") : currentDay.overnight ? "Pick below" : currentDay.is_travel_day ? "At destination" : "Day hike"}
            </span>
            <span className="ir-stat-lbl">Overnight</span>
          </div>
          <div className="ir-stat-item">
            <span className="ir-stat-val">{currentDay.overnight ? "Yes" : "No"}</span>
            <span className="ir-stat-lbl">Stay</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="ir-timeline-container">
          {schedule.map((item, i) => {
            const color = COLORS[item.type] || "#64748b";
            return (
              <div key={i} id={`tl-trek-${currentDay.day_number}-${i}`} className="ir-tl-item">
                <div className="ir-tl-node">
                  <EventIconSVG type={item.type} />
                </div>
                <div className="ir-tl-card">
                  <div className="ir-tl-card-header">
                    <span className="ir-tl-time-badge">{item.time}</span>
                    <span className="ir-meta-chip" style={{ background: color + "15", color }}>{item.type}</span>
                  </div>
                  <h4 className="ir-tl-title">{item.label}</h4>
                  {item.type === "travel" && item.travel_hours && (
                    <div className="ir-tl-meta-row">
                      <span className="ir-meta-chip">{item.travel_mode} · ~{item.travel_hours}h</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hotel Selection */}
        {currentDay.overnight && currentDay.nearby_hotels?.length > 0 && (
          <div className="trek-hotel-section">
            <h3 className="trek-hotel-selection-title">Select Hotel for Tonight</h3>
            <div className="trek-hotel-recommendation-list">
              {currentDay.nearby_hotels.map((hotel) => {
                const isSel = hotelSelections[currentDay.day_number] === hotel.hotel_id;
                return (
                  <div key={hotel.hotel_id} className={`trek-hotel-recommendation-card ${isSel ? "selected" : ""}`} 
                  onClick={() => onHotelSelect(currentDay.day_number, hotel.hotel_id)}>
                    <div className="trek-hotel-recommendation-info">
                      <h4>{hotel.hotel_name}</h4>
                      <p>NPR {hotel.budget?.toLocaleString()} / night · {hotel.distance_km} km away</p>
                    </div>
                    {isSel && <span className="trek-hotel-select-check">Selected</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentDay.overnight && currentDay.nearby_hotels?.length === 0 && (
          <div className="ir-empty"><p>No hotels found within 5km. Tea houses or camping available.</p></div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="sl-bottom-actions">
        {onBack && (
          <button className="sl-btn sl-btn-secondary" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
            Choose Different Trek
          </button>
        )}
        {onReset && (
          <button className="sl-btn sl-btn-primary" onClick={onReset}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Plan Another Trip
          </button>
        )}
      </div>
    </div>
  );

  return (
    <SplitLayout
      leftContent={leftPanel}
      rightContent={
        <TrekItineraryMap
          days={days}
          activeDay={activeDay}
          selectedHotel={selectedHotel}
          mapCenter={mapCenter}
          markerRefs={markerRefs}
          onMarkerClick={handleMarkerClick}
        />
      }
    />
  );
}

//Trek Map (right panel) 
function TrekItineraryMap({ days, activeDay, selectedHotel, mapCenter, markerRefs, onMarkerClick }) {
  const allMarkers = days.map((d) => ({
    id: `day-${d.day_number}`, name: d.stop_name, lat: parseFloat(d.latitude),
    lon: parseFloat(d.longitude), day: d.day_number, activity: d.activity,
    travelTime: d.travel_time, district: d.district || "",
    isTravelDay: d.is_travel_day, isReturnDay: d.is_return_day,
  }));

  const activeBounds = allMarkers.filter((m) => m.day === activeDay).map((m) => [m.lat, m.lon]);
  const polylinePoints = allMarkers.map((m) => [m.lat, m.lon]);
  const currentDay = days.find((d) => d.day_number === activeDay) || days[0];
  const hotelLinePoints = [];
  const activeMarker = allMarkers.find((m) => m.day === activeDay);
  if (activeMarker && selectedHotel && selectedHotel.latitude && selectedHotel.longitude) {
    hotelLinePoints.push([activeMarker.lat, activeMarker.lon]);
    hotelLinePoints.push([parseFloat(selectedHotel.latitude), parseFloat(selectedHotel.longitude)]);
  }

  return (
    <MapContainer center={mapCenter || (activeBounds[0] || [27.7, 85.3])} zoom={12} scrollWheelZoom style={{ width: "100%", height: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://osm.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {allMarkers.map((m) => {
        const isToday = m.day === activeDay;
        return (
          <Marker key={m.id} position={[m.lat, m.lon]} icon={getTrekIcon(
            isToday ? (m.isTravelDay ? "#3b82f6" : m.isReturnDay ? "#f97316" : "#ef4444") : (m.isTravelDay ? "rgba(59,130,246,.35)" : m.isReturnDay ? "rgba(249,115,22,.35)" : "rgba(239,68,68,.35)"),
            m.isTravelDay ? "T" : m.isReturnDay ? "R" : m.day, isToday
          )}
            ref={(el) => { if (el) markerRefs.current[m.id] = el; }}
            eventHandlers={{ click: () => onMarkerClick && onMarkerClick(m.id) }}
          >
            <Popup>
              <div className="ir-map-popup">
                <div className="ir-popup-cat" style={{ color: m.isTravelDay ? "#3b82f6" : m.isReturnDay ? "#f97316" : "#ef4444" }}>
                  {m.isTravelDay ? "Travel Day" : m.isReturnDay ? "Return Day" : "Trek Stop"}
                </div>
                <div className="ir-popup-title">Day {m.day}: {m.name}</div>
                <div className="ir-popup-district">{m.district}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
                  <span className="ir-meta-chip">{m.activity}</span>
                  {m.travelTime && <span className="ir-meta-chip">{m.travelTime}</span>}
                </div>
                <div className="ir-popup-coords">{m.lat.toFixed(4)}, {m.lon.toFixed(4)}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
      {selectedHotel && selectedHotel.latitude && selectedHotel.longitude && (
        <Marker position={[parseFloat(selectedHotel.latitude), parseFloat(selectedHotel.longitude)]} icon={hotelIcon}>
          <Popup>
            <div className="ir-map-popup">
              <div className="ir-popup-cat" style={{ color: "#2563eb" }}>Hotel</div>
              <div className="ir-popup-title">{selectedHotel.hotel_name}</div>
              <div className="ir-popup-district">{selectedHotel.district}</div>
              <div className="ir-popup-duration" style={{ color: "#2563eb", fontWeight: 600 }}>{selectedHotel.distance_km} km from stop</div>
              <div className="ir-popup-coords">{parseFloat(selectedHotel.latitude).toFixed(4)}, {parseFloat(selectedHotel.longitude).toFixed(4)}</div>
            </div>
          </Popup>
        </Marker>
      )}
      {polylinePoints.length > 1 && <Polyline positions={polylinePoints} color="#cbd5e1" weight={2} opacity={0.5} dashArray="6 4" />}
      {activeBounds.length > 1 && <Polyline positions={activeBounds} color="#ef4444" weight={3.5} opacity={0.85} />}
      {hotelLinePoints.length > 1 && <Polyline positions={hotelLinePoints} color="#2563eb" weight={3} opacity={0.85} dashArray="8 4" />}
      <MapController activeBounds={selectedHotel && hotelLinePoints.length > 1 ? [...activeBounds, [parseFloat(selectedHotel.latitude), parseFloat(selectedHotel.longitude)]] : activeBounds} />
    </MapContainer>
  );
}
