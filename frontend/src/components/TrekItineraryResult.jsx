import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

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

function MapController({ center, zoom, activeBounds }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || 14);
    else if (activeBounds?.length) map.fitBounds(activeBounds, { padding: [50, 50], maxZoom: 15 });
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
  breakfast: "#f59e0b",
  departure: "#3b82f6",
  travel: "#8b5cf6",
  arrival: "#10b981",
  lunch: "#f59e0b",
  explore: "#06b6d4",
  activity: "#ef4444",
  check_in: "#2563eb",
  dinner: "#f59e0b",
  rest: "#64748b",
  overnight: "#475569",
};

function tlIconSVG(type) {
  const c = COLORS[type] || "#64748b";
  switch (type) {
    case "breakfast":
    case "lunch":
    case "dinner":
      return `<svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    case "departure":
      return `<svg width="10" height="10" viewBox="0 0 10 10"><polyline points="3,3 7,3 7,7" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case "travel":
      return `<svg width="10" height="10" viewBox="0 0 10 10"><polyline points="2,5 7,5 5,2" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case "arrival":
      return `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" fill="none" stroke="${c}" stroke-width="1.2"/><path d="M5 3v4M3 5h4" stroke="${c}" stroke-width="1" stroke-linecap="round"/></svg>`;
    case "explore":
      return `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" fill="none" stroke="${c}" stroke-width="1.2"/><circle cx="5" cy="5" r="1" fill="${c}"/></svg>`;
    case "activity":
      return `<svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,1 9,9 1,9" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
    case "check_in":
      return `<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="3" width="8" height="5" rx="1" fill="none" stroke="${c}" stroke-width="1.2"/><line x1="1" y1="6" x2="9" y2="6" stroke="${c}" stroke-width="1.2"/></svg>`;
    case "rest":
    case "overnight":
      return `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" fill="none" stroke="${c}" stroke-width="1.2"/><line x1="3" y1="5" x2="7" y2="5" stroke="${c}" stroke-width="1"/></svg>`;
    default:
      return `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="1.5" fill="${c}"/></svg>`;
  }
}

export default function TrekItineraryResult({ trekItinerary, hotelSelections, onHotelSelect }) {
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

  const allMarkers = days.map((d) => ({
    id: `day-${d.day_number}`,
    name: d.stop_name,
    lat: parseFloat(d.latitude),
    lon: parseFloat(d.longitude),
    day: d.day_number,
    activity: d.activity,
    travelTime: d.travel_time,
    district: d.district || district || "",
  }));

  const activeBounds = allMarkers.filter((m) => m.day === activeDay).map((m) => [m.lat, m.lon]);
  const polylinePoints = allMarkers.map((m) => [m.lat, m.lon]);

  const handleMarkerClick = (markerId) => {
    document.getElementById(`tl-trek-${markerId.replace("day-", "")}-0`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const selectedHotel = currentDay.overnight
    ? currentDay.nearby_hotels?.find((h) => hotelSelections[currentDay.day_number] === h.hotel_id)
    : null;

  const schedule = currentDay.timeline || [];

  return (
    <div className="ir-layout">
      <div className="ir-left">
        <div className="ir-hdr">
          <div className="ir-hdr-row">
            <div>
              <h1 className="ir-hdr-title">{trek_name}</h1>
              <p className="ir-hdr-route">{district}</p>
              <p className="ir-hdr-sub">{total_days} day{total_days > 1 ? "s" : ""} trek</p>
            </div>
            <button className="ir-save-btn" onClick={() => downloadTrekItinerary(trekItinerary)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save
            </button>
          </div>
        </div>

        <div className="ir-tabs">
          {days.map((d) => (
            <button key={d.day_number} className={`ir-tab ${activeDay === d.day_number ? "on" : ""}`} onClick={() => changeDay(d.day_number)}>
              <span className="ir-tab-n">{d.day_number}</span>
              <span className="ir-tab-l">{d.stop_name?.substring(0, 8) || `Day ${d.day_number}`}</span>
            </button>
          ))}
        </div>

        <div key={activeDay} className={`ir-dc slide-${animDir}`}>
          <div className="ir-summary">
            <div className="ir-sum-item"><span className="ir-sum-val">{currentDay.stop_name}</span><span className="ir-sum-lbl">Stop</span></div>
            <div className="ir-sum-item"><span className="ir-sum-val">{currentDay.travel_time}</span><span className="ir-sum-lbl">Travel</span></div>
            <div className="ir-sum-item"><span className="ir-sum-val">{selectedHotel ? selectedHotel.hotel_name?.split(" ").slice(0, 2).join(" ") : currentDay.overnight ? "Pick below" : "Day hike"}</span><span className="ir-sum-lbl">Overnight</span></div>
            <div className="ir-sum-item"><span className="ir-sum-val">{currentDay.overnight ? "Yes" : "No"}</span><span className="ir-sum-lbl">Stay</span></div>
          </div>

          <div className="ir-tl">
            {schedule.map((item, i) => {
              const color = COLORS[item.type] || "#64748b";
              const icon = tlIconSVG(item.type);

              return (
                <div key={i} id={`tl-trek-${currentDay.day_number}-${i}`} className="ir-tl-row">
                  <div className="ir-tl-time">{item.time}</div>
                  <div className="ir-tl-dot" style={{ background: color }} />
                  <div className="ir-tl-line" />
                  <div className="ir-tl-card">
                    <div className="ir-tl-card-top">
                      <span className="ir-tl-icon" style={{ background: color + "15" }} dangerouslySetInnerHTML={{ __html: icon }} />
                      <span className="ir-tl-label">{item.label}</span>
                    </div>
                    {item.type === "travel" && (
                      <div className="ir-tl-meta">
                        <span>{item.travel_mode} &middot; ~{item.travel_hours}h</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {currentDay.overnight && currentDay.nearby_hotels?.length > 0 && (
            <div className="trek-hotel-section">
              <h3 className="trek-hotel-selection-title">Select Hotel for Tonight</h3>
              <div className="trek-hotel-recommendation-list">
                {currentDay.nearby_hotels.map((hotel) => {
                  const isSel = hotelSelections[currentDay.day_number] === hotel.hotel_id;
                  return (
                    <div key={hotel.hotel_id} className={`trek-hotel-recommendation-card ${isSel ? "selected" : ""}`} onClick={() => onHotelSelect(currentDay.day_number, hotel.hotel_id)} style={{ cursor: "pointer" }}>
                      <div className="trek-hotel-recommendation-info">
                        <h4>{hotel.hotel_name}</h4>
                        <p>NPR {hotel.budget?.toLocaleString()} / night &middot; {hotel.distance_km} km away</p>
                      </div>
                      {isSel && <span className="trek-hotel-select-check">Selected</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentDay.overnight && currentDay.nearby_hotels?.length === 0 && (
            <div className="ir-weather">No hotels found within 5km. Tea houses or camping available.</div>
          )}
        </div>
      </div>

      <div className="ir-right">
        <MapContainer center={activeBounds[0] || [27.7, 85.3]} zoom={12} scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://osm.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {allMarkers.map((m) => {
            const isToday = m.day === activeDay;
            return (
              <Marker key={m.id} position={[m.lat, m.lon]} icon={getTrekIcon(isToday ? "#ef4444" : "rgba(239,68,68,.35)", m.day, isToday)} ref={(el) => { if (el) markerRefs.current[m.id] = el; }} eventHandlers={{ click: () => handleMarkerClick(m.id) }}>
                <Popup>
                  <div style={{ fontFamily: "system-ui, sans-serif", minWidth: 180 }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "#ef4444", fontWeight: 700, marginBottom: 3 }}>Trek Stop</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Day {m.day}: {m.name}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>{m.district}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, color: "#475569" }}>{m.activity}</span>
                      <span style={{ fontSize: 10, background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, color: "#475569" }}>{m.travelTime}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{m.lat.toFixed(4)}, {m.lon.toFixed(4)}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          {polylinePoints.length > 1 && <Polyline positions={polylinePoints} color="#cbd5e1" weight={2} opacity={0.5} dashArray="6 4" />}
          {activeBounds.length > 1 && <Polyline positions={activeBounds} color="#ef4444" weight={3.5} opacity={0.85} />}
          <MapController center={mapCenter} zoom={13} activeBounds={activeBounds} />
        </MapContainer>
      </div>
    </div>
  );
}
