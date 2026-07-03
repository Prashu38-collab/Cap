import { useState, useEffect } from "react";

const transportIcons = {
  "Walk / Local Taxi": "🚶",
  "Private Car / Local Bus": "🚗",
  "Tourist Bus / Micro": "🚌",
  "Flight / Long-distance Bus": "✈️",
  "Walk (Trek)": "🥾",
};

const categoryConfig = {
  nature: { color: "#22c55e", bg: "#052e16", icon: "🌿", img: "/images/lake.jpg" },
  religious: { color: "#f59e0b", bg: "#451a03", icon: "🛕", img: "/images/changunarayan.jpg" },
  cultural: { color: "#8b5cf6", bg: "#2e1065", icon: "🏛️", img: "/images/bhaktapur.png" },
  adventure: { color: "#ef4444", bg: "#450a0a", icon: "⛰️", img: "/images/trekking.png" },
};

function getCategoryKey(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("nature")) return "nature";
  if (c.includes("religious")) return "religious";
  if (c.includes("cultural")) return "cultural";
  if (c.includes("adventure")) return "adventure";
  return null;
}

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

function AnimatedCounter({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    let start = 0;
    const step = Math.max(1, Math.floor(value / 20));
    const interval = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(start);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [value]);
  return <span>{display}{suffix}</span>;
}

function ItineraryResult({ itinerary, weatherForecast, preferenceId, corridor }) {
  const [activeDay, setActiveDay] = useState(1);
  const [showMap, setShowMap] = useState(false);
  const [mapHtml, setMapHtml] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [animDir, setAnimDir] = useState("next");

  if (!itinerary || !itinerary.itinerary) return null;

  const days = itinerary.itinerary;
  const currentDay = days.find((d) => d.day === activeDay) || days[0];
  const weatherToday = weatherForecast?.find((w) => w.day === activeDay);

  if (!currentDay) return null;

  const changeDay = (day) => {
    setAnimDir(day > activeDay ? "next" : "prev");
    setActiveDay(day);
  };

  const loadMap = async () => {
    if (mapHtml) {
      setShowMap(!showMap);
      return;
    }
    setMapLoading(true);
    try {
      const res = await fetch(`/api/itinerary/map/${preferenceId}`);
      const data = await res.json();
      if (data.html) {
        setMapHtml(data.html);
        setShowMap(true);
      }
    } catch (e) {
      console.error("Map load failed", e);
    } finally {
      setMapLoading(false);
    }
  };

  return (
    <div className="itinerary-result-modern">
      {/* HEADER */}
      <div className="ir-header">
        <div className="ir-header-bg" />
        <div className="ir-header-content">
          <h1 className="ir-title">
            <span className="ir-title-icon">🗺️</span>
            Your Journey
          </h1>
          {corridor && corridor.length > 1 && (
            <p className="ir-corridor">
              {corridor.join("  →  ")}
            </p>
          )}
          <p className="ir-subtitle">
            {days.length} {days.length === 1 ? "day" : "days"} of adventure across Nepal
          </p>
          <span className="ir-badge">Trip #{preferenceId}</span>
        </div>
      </div>

      {/* DAY TABS */}
      <div className="ir-day-tabs">
        {days.map((d, idx) => (
          <button
            key={d.day}
            className={`ir-day-tab ${activeDay === d.day ? "active" : ""}`}
            onClick={() => changeDay(d.day)}
            style={{
              "--tab-color": `hsl(${(idx * 35 + 200) % 360}, 70%, 50%)`,
            }}
          >
            <span className="ir-day-num">{d.day}</span>
            <span className="ir-day-label">
              {d.district?.substring(0, 6) || `Day ${d.day}`}
            </span>
            {d.weather_day_warning && <span className="ir-day-warn">⚠️</span>}
          </button>
        ))}
      </div>

      {/* DAY CONTENT with slide animation */}
      <div key={activeDay} className={`ir-day-content slide-${animDir}`}>
        {/* DISTRICT HERO */}
        <div
          className="ir-district-hero"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${getDistrictImage(currentDay.district)})`,
          }}
        >
          <div className="ir-district-info">
            <h2>{currentDay.district || "Kathmandu"}</h2>
            <div className="ir-district-stats">
              <span>📍 {currentDay.places.filter(p => p.type !== "meal").length} places</span>
              <span>🚗 {currentDay.total_travel_km} km</span>
            </div>
          </div>
        </div>

        {/* WEATHER */}
        {weatherToday?.is_bad_weather && (
          <div className="ir-weather-banner">
            <span className="ir-weather-icon">🌧️</span>
            <span>Bad weather forecast — pack an umbrella!</span>
          </div>
        )}
        {currentDay.weather_day_warning && (
          <div className="ir-weather-banner warning">
            <span className="ir-weather-icon">⚠️</span>
            <span>{currentDay.weather_day_warning}</span>
          </div>
        )}

        {/* HOTEL CARD */}
        <div className="ir-hotel-card">
          <div className="ir-hotel-icon-wrap">
            <span className="ir-hotel-emoji">🏨</span>
          </div>
          <div className="ir-hotel-body">
            <h3>{currentDay.hotel.hotel_name}</h3>
            <span className="ir-hotel-label">Overnight Stay</span>
            {currentDay.hotel.note && <p className="ir-hotel-note">{currentDay.hotel.note}</p>}
          </div>
          <div className="ir-hotel-stars">
            {"★".repeat(4)}{"☆".repeat(1)}
          </div>
        </div>

        {/* TIMELINE */}
        <div className="ir-timeline">
          {currentDay.places.map((place, idx) => {
            const isMeal = place.type === "meal";

            if (isMeal) {
              const mealColors = {
                Breakfast: { bg: "linear-gradient(135deg, #D4973C33, #9B1B3011)", border: "#D4973C", text: "#F5E6C8" },
                Lunch: { bg: "linear-gradient(135deg, #1B9B8A33, #D4973C11)", border: "#1B9B8A", text: "#A8E6CF" },
                Dinner: { bg: "linear-gradient(135deg, #9B1B3033, #1B1A1811)", border: "#9B1B30", text: "#F5C6C6" },
              };
              const mc = mealColors[place.name] || mealColors.Lunch;
              return (
                <div key={idx} className="ir-timeline-item ir-meal-item">
                  <div className="ir-timeline-node" style={{ "--node-color": mc.border }}>
                    <span style={{ background: mc.border, fontSize: 16 }}>{place.icon}</span>
                  </div>
                  <div className="ir-meal-card" style={{ background: mc.bg, borderColor: mc.border }}>
                    <div className="ir-meal-body">
                      <span className="ir-meal-time">{place.start_time}</span>
                      <h4 style={{ color: mc.text }}>{place.icon} {place.name}</h4>
                      {place.cost_estimate && (
                        <span className="ir-meal-cost">~ NPR {place.cost_estimate}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            const catKey = getCategoryKey(place.category);
            const cfg = categoryConfig[catKey] || { color: "#6b7280", bg: "#1f2937", icon: "📍", img: "/images/lake.jpg" };
            return (
              <div key={idx} className="ir-timeline-item">
                <div className="ir-timeline-node" style={{ "--node-color": cfg.color }}>
                  <span>{idx + 1}</span>
                </div>
                <div className="ir-timeline-card" style={{ borderColor: cfg.color }}>
                  <div className="ir-place-img-wrap">
                    <div className="ir-place-img" style={{ backgroundImage: `url(${cfg.img})` }} />
                    <span className="ir-place-cat-badge" style={{ background: cfg.color }}>{cfg.icon} {place.category}</span>
                  </div>
                  <div className="ir-place-body">
                    <h4>{place.name}</h4>
                    <div className="ir-place-meta">
                      <span className="ir-meta-chip" style={{ background: cfg.color + "22", color: cfg.color }}>
                        ⏱ {place.duration}h
                      </span>
                      {place.start_time && (
                        <span className="ir-meta-chip" style={{ background: "#D4973C22", color: "#D4973C" }}>
                          🕐 {place.start_time}
                        </span>
                      )}
                      <span className="ir-meta-chip" style={{ background: "#3b82f622", color: "#3b82f6" }}>
                        {transportIcons[place.transport_mode] || "🚗"} {place.transport_mode}
                      </span>
                      {place.travel_dist_km > 0 && (
                        <span className="ir-meta-chip" style={{ background: "#10b98122", color: "#10b981" }}>
                          📍 {place.travel_dist_km} km
                        </span>
                      )}
                      {place.is_anchor_activity && (
                        <span className="ir-meta-chip anchor" style={{ background: "#8b5cf622", color: "#8b5cf6" }}>
                          ⚓ Full Day
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {currentDay.places.length === 0 && (
            <div className="ir-empty">
              <span className="ir-empty-icon">🏝️</span>
              <p>A well-deserved rest day. Relax and explore at your own pace!</p>
            </div>
          )}
        </div>

          {/* STATS ROW */}
        {(() => {
          const realPlaces = currentDay.places.filter(p => p.type !== "meal");
          const totDur = realPlaces.reduce((s, p) => s + (p.duration || 0), 0);
          return (
          <div className="ir-stats-row">
            <div className="ir-stat">
              <span className="ir-stat-icon">📍</span>
              <span className="ir-stat-val"><AnimatedCounter value={realPlaces.length} /></span>
              <span className="ir-stat-lbl">Places</span>
            </div>
            <div className="ir-stat">
              <span className="ir-stat-icon">🚗</span>
              <span className="ir-stat-val"><AnimatedCounter value={currentDay.total_travel_km} suffix="km" /></span>
              <span className="ir-stat-lbl">Travel</span>
            </div>
            <div className="ir-stat">
              <span className="ir-stat-icon">⏱️</span>
              <span className="ir-stat-val">
                {totDur.toFixed(1)}
                <span className="ir-stat-unit">h</span>
              </span>
              <span className="ir-stat-lbl">Activities</span>
            </div>
            <div className="ir-stat">
              <span className="ir-stat-icon">🏨</span>
              <span className="ir-stat-val">{currentDay.hotel.hotel_name?.substring(0, 6)}</span>
              <span className="ir-stat-lbl">Hotel</span>
            </div>
          </div>
          );
        })()}
      </div>

      {/* MAP SECTION */}
      <div className="ir-map-section">
        <button className="ir-map-toggle" onClick={loadMap}>
          {mapLoading ? (
            <span className="ir-map-loading">⏳ Loading map...</span>
          ) : showMap ? (
            "🗺️ Hide Map"
          ) : (
            "🗺️ View Route Map"
          )}
        </button>
        {showMap && mapHtml && (
          <div className="ir-map-container">
            <iframe
              srcDoc={mapHtml}
              title="Route Map"
              className="ir-map-iframe"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ItineraryResult;
