import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

const categoryConfig = {
  adventure: { color: "#ef4444", bg: "#450a0a", icon: "⛰️" },
  nature: { color: "#22c55e", bg: "#052e16", icon: "🌿" },
  cultural: { color: "#8b5cf6", bg: "#2e1065", icon: "🏛️" },
  religious: { color: "#f59e0b", bg: "#451a03", icon: "🛕" },
};

function getDistrictImage(district) {
  const map = {
    kathmandu: "/images/kathmandu.png",
    lalitpur: "/images/lalitpur.jpg",
    bhaktapur: "/images/bhaktapur.png",
    chitwan: "/images/chitwan.jpg",
    dolakha: "/images/dolakha.jpg",
    kavrepalanchowk: "/images/kavre.png",
    nuwakot: "/images/nuwakot.jpg",
    rasuwa: "/images/rasuwa.jpg",
    sindhuli: "/images/sindhuli.jpg",
    sindhupalchowk: "/images/sindhupalchowk.jpg",
  };
  return map[(district || "").toLowerCase().replace(/\s/g, "")] || "/images/lake.jpg";
}

const getTrekIcon = (color, label, isActive = true) => {
  const size = isActive ? 34 : 24;
  const fontSize = isActive ? 12 : 9;
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #fff;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
      ">
        <div style="
          transform: rotate(45deg);
          color: #fff;
          font-weight: bold;
          font-size: ${fontSize}px;
          font-family: sans-serif;
        ">${label}</div>
      </div>
    `,
    className: "place-pin",
    iconSize: [size, size + 6],
    iconAnchor: [size / 2, size + 6],
    popupAnchor: [0, -(size + 6)],
  });
};

function MapController({ center, zoom, activeBounds }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 14);
    } else if (activeBounds && activeBounds.length > 0) {
      map.fitBounds(activeBounds, { padding: [50, 50] });
    }
  }, [center, zoom, activeBounds, map]);
  return null;
}

export default function TrekItineraryResult({ trekItinerary, hotelSelections, onHotelSelect }) {
  const [activeDay, setActiveDay] = useState(1);
  const [animDir, setAnimDir] = useState("next");

  const [highlightedId, setHighlightedId] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const markerRefs = useRef({});

  if (!trekItinerary || !trekItinerary.days) return null;

  const { trek_name, district, total_days, days } = trekItinerary;
  const currentDay = days.find((d) => d.day_number === activeDay) || days[0];
  if (!currentDay) return null;

  const changeDay = (day) => {
    setMapCenter(null);
    setHighlightedId(null);
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
  }));

  const activeDayMarker = allMarkers.find((m) => m.day === activeDay);
  const activeBounds = allMarkers
    .filter((m) => m.day === activeDay)
    .map((m) => [m.lat, m.lon]);

  const polylinePoints = allMarkers.map((m) => [m.lat, m.lon]);

  const handleDayCardClick = (dayNum) => {
    const marker = allMarkers.find((m) => m.day === dayNum);
    if (marker) {
      setHighlightedId(`day-${dayNum}`);
      setMapCenter([marker.lat, marker.lon]);
      setMapZoom(14);
      setTimeout(() => {
        const ref = markerRefs.current[`day-${dayNum}`];
        if (ref) ref.openPopup();
      }, 100);
    }
  };

  const handleMarkerClick = (markerId) => {
    setHighlightedId(markerId);
    const el = document.getElementById(`trek-day-card-${markerId.replace("day-", "")}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className="itinerary-split-layout">
      {/* LEFT COLUMN: Trek Timeline */}
      <div className="itinerary-timeline-side">
        <div className="ir-header">
          <div className="ir-header-bg" />
          <div className="ir-header-content">
            <h1 className="ir-title">
              <span className="ir-title-icon">⛰️</span>
              {trek_name}
            </h1>
            <p className="ir-corridor">{district}</p>
            <p className="ir-subtitle">
              {total_days} {total_days === 1 ? "day" : "days"} trek
            </p>
          </div>
        </div>

        {/* DAY TABS */}
        <div className="ir-day-tabs">
          {days.map((d) => (
            <button
              key={d.day_number}
              className={`ir-day-tab ${activeDay === d.day_number ? "active" : ""}`}
              onClick={() => changeDay(d.day_number)}
              style={{ "--tab-color": `hsl(${(d.day_number * 35 + 10) % 360}, 70%, 50%)` }}
            >
              <span className="ir-day-num">{d.day_number}</span>
              <span className="ir-day-label">
                {d.stop_name?.substring(0, 8) || `Day ${d.day_number}`}
              </span>
            </button>
          ))}
        </div>

        {/* DAY CONTENT */}
        <div key={activeDay} className={`ir-day-content slide-${animDir}`}>
          {/* DISTRICT HERO */}
          <div
            className="ir-district-hero"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${getDistrictImage(district)})`,
            }}
          >
            <div className="ir-district-info">
              <h2>{currentDay.stop_name}</h2>
              <div className="ir-district-stats">
                <span>🥾 {currentDay.travel_time}</span>
              </div>
            </div>
          </div>

          {/* DAY TITLE */}
          <div className="itinerary-day-title-wrap">
            <h2>Day {currentDay.day_number}: {currentDay.stop_name}</h2>
            <div className="itinerary-day-stats">
              <span>🥾 {currentDay.travel_time}</span>
              {currentDay.overnight && <span>🏨 Overnight stay</span>}
            </div>
          </div>

          {/* ACTIVITY TIMELINE CARD */}
          <div className="ir-timeline">
            <div
              id={`trek-day-card-${currentDay.day_number}`}
              className={`ir-timeline-item ${highlightedId === `day-${currentDay.day_number}` ? "highlighted-card" : ""}`}
              onClick={() => handleDayCardClick(currentDay.day_number)}
              style={{ cursor: "pointer" }}
            >
              <div className="ir-timeline-node" style={{ "--node-color": "#ef4444" }}>
                <span>🥾</span>
              </div>
              <div className="ir-timeline-card" style={{ borderColor: "#ef4444" }}>
                <div className="ir-place-body">
                  <h4>{currentDay.activity}</h4>
                  <div className="ir-place-meta">
                    <span className="ir-meta-chip" style={{ background: "#ef444422", color: "#ef4444" }}>
                      🥾 {currentDay.travel_time}
                    </span>
                    {currentDay.overnight && (
                      <span className="ir-meta-chip" style={{ background: "#f59e0b22", color: "#f59e0b" }}>
                        🏨 Overnight
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!currentDay.overnight && (
              <div className="timeline-travel-connector">
                <span style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
                  Day hike — return to previous stop for overnight stay.
                </span>
              </div>
            )}
          </div>

          {/* HOTEL SELECTION */}
          {currentDay.overnight && currentDay.nearby_hotels && currentDay.nearby_hotels.length > 0 && (
            <div className="trek-hotel-section">
              <h3 className="trek-hotel-selection-title">
                🏨 Select Hotel for Tonight
              </h3>
              <div className="trek-hotel-recommendation-list">
                {currentDay.nearby_hotels.map((hotel) => {
                  const isSel = hotelSelections[currentDay.day_number] === hotel.hotel_id;
                  return (
                    <div
                      key={hotel.hotel_id}
                      id={`trek-hotel-${hotel.hotel_id}`}
                      className={`trek-hotel-recommendation-card ${isSel ? "selected" : ""}`}
                      onClick={() => onHotelSelect(currentDay.day_number, hotel.hotel_id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="trek-hotel-recommendation-info">
                        <h4>{hotel.hotel_name}</h4>
                        <p>NPR {hotel.budget?.toLocaleString()} / night · {hotel.distance_km} km away</p>
                      </div>
                      {isSel && <span className="trek-hotel-select-check">✓ Selected</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentDay.overnight && currentDay.nearby_hotels && currentDay.nearby_hotels.length === 0 && (
            <div className="ir-empty">
              <span className="ir-empty-icon">🏕️</span>
              <p>No hotels found within 5km. Tea houses or camping available.</p>
            </div>
          )}

          {/* STATS ROW */}
          <div className="ir-stats-row">
            <div className="ir-stat">
              <span className="ir-stat-icon">📍</span>
              <span className="ir-stat-val">{currentDay.stop_name}</span>
              <span className="ir-stat-lbl">Stop</span>
            </div>
            <div className="ir-stat">
              <span className="ir-stat-icon">🥾</span>
              <span className="ir-stat-val">{currentDay.travel_time}</span>
              <span className="ir-stat-lbl">Travel</span>
            </div>
            <div className="ir-stat">
              <span className="ir-stat-icon">🏨</span>
              <span className="ir-stat-val">
                {currentDay.overnight
                  ? (currentDay.nearby_hotels?.find((h) => hotelSelections[currentDay.day_number] === h.hotel_id)?.hotel_name?.substring(0, 10) || "Pick below")
                  : "Day hike"}
              </span>
              <span className="ir-stat-lbl">Overnight</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Leaflet Map */}
      <div className="itinerary-map-side">
        <MapContainer
          center={activeBounds.length > 0 ? activeBounds[0] : [27.7, 85.3]}
          zoom={12}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {allMarkers.map((m) => {
            const isToday = m.day === activeDay;
            const pinColor = isToday ? "#ef4444" : "rgba(239, 68, 68, 0.35)";

            return (
              <Marker
                key={m.id}
                position={[m.lat, m.lon]}
                icon={getTrekIcon(pinColor, m.day, isToday)}
                ref={(el) => {
                  if (el) markerRefs.current[m.id] = el;
                }}
                eventHandlers={{
                  click: () => handleMarkerClick(m.id),
                }}
              >
                <Popup>
                  <div style={{ color: "#000", fontFamily: "sans-serif", padding: "5px" }}>
                    <strong style={{ fontSize: "14px" }}>Day {m.day}: {m.name}</strong><br />
                    <span style={{ fontSize: "12px", color: "#555" }}>{m.activity}</span><br />
                    <span style={{ fontSize: "11px", color: "#888" }}>🥾 {m.travelTime}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {polylinePoints.length > 1 && (
            <Polyline
              positions={polylinePoints}
              color="#ef4444"
              weight={3}
              opacity={0.7}
              dashArray="8 6"
            />
          )}

          {activeDayMarker && (
            <Polyline
              positions={[polylinePoints[activeDayMarker.day - 1], polylinePoints[activeDayMarker.day - 1]]}
              color="transparent"
              weight={0}
            />
          )}

          <MapController
            center={mapCenter}
            zoom={mapZoom}
            activeBounds={activeBounds}
          />
        </MapContainer>
      </div>
    </div>
  );
}
