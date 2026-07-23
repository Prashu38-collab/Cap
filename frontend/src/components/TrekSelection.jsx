import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import SplitLayout from "./SplitLayout";

const trekImages = [
  "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&h=400&fit=crop",
];

const categoryColors = {
  adventure: { color: "#ef4444", bg: "#450a0a", icon: "A" },
  nature: { color: "#22c55e", bg: "#052e16", icon: "N" },
  cultural: { color: "#8b5cf6", bg: "#2e1065", icon: "C" },
  religious: { color: "#f59e0b", bg: "#451a03", icon: "R" },
};

function getCategoryCfg(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("adventure")) return categoryColors.adventure;
  if (c.includes("nature")) return categoryColors.nature;
  if (c.includes("cultural")) return categoryColors.cultural;
  if (c.includes("religious")) return categoryColors.religious;
  return { color: "#6b7280", bg: "#1f2937", icon: "P" };
}

const getTrekIcon = (color, label, isActive = false) => {
  const size = isActive ? 36 : 30;
  const fontSize = isActive ? 12 : 10;
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

function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13);
    } else if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [center, zoom, bounds, map]);
  return null;
}

function TrekMap({ treks, hoveredId, selectedId, onHover, onSelect, mapCenter, mapZoom }) {
  const validTreks = treks.filter((t) => t.latitude && t.longitude);
  const bounds = validTreks.map((t) => [t.latitude, t.longitude]);

  return (
    <MapContainer
      center={bounds.length > 0 ? bounds[0] : [27.7, 85.3]}
      zoom={11}
      scrollWheelZoom={true}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validTreks.map((trek) => {
        const isHovered = hoveredId === trek.place_id;
        const isSelected = selectedId === trek.place_id;
        const cfg = getCategoryCfg(trek.category);
        const pinColor = isSelected ? cfg.color : isHovered ? "#3b82f6" : "#64748b";

        return (
          <Marker
            key={trek.place_id}
            position={[trek.latitude, trek.longitude]}
            icon={getTrekIcon(pinColor, cfg.icon, isHovered || isSelected)}
            eventHandlers={{
              click: () => onSelect && onSelect(trek),
              mouseover: () => onHover && onHover(trek.place_id),
              mouseout: () => onHover && onHover(null),
            }}
          >
            <Popup>
              <div style={{ color: "#000", fontFamily: "sans-serif", padding: "5px" }}>
                <strong style={{ fontSize: "14px" }}>{trek.place_name}</strong><br />
                <span style={{ fontSize: "12px", color: "#555" }}>
                  {trek.category || "Adventure"} · {trek.district}
                </span><br />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#ef4444" }}>
                  Click card to select
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}
      <MapController center={mapCenter} zoom={mapZoom} bounds={bounds} />
    </MapContainer>
  );
}

export default function TrekSelection({ treks, onSelect, loading, recommendedTrekId, onBack }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(recommendedTrekId || null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(11);

  useEffect(() => {
    if (recommendedTrekId) {
      setSelectedId(recommendedTrekId);
      const trek = treks.find((t) => t.place_id === recommendedTrekId);
      if (trek?.latitude && trek?.longitude) {
        setMapCenter([trek.latitude, trek.longitude]);
        setMapZoom(14);
      }
    }
  }, [recommendedTrekId, treks]);

  const validTreks = treks.filter((t) => t.latitude && t.longitude);

  const handleCardClick = (trek) => {
    setSelectedId(trek.place_id);
    if (trek.latitude && trek.longitude) {
      setMapCenter([trek.latitude, trek.longitude]);
      setMapZoom(14);
    }
  };

  const handleMarkerClick = (trek) => {
    setSelectedId(trek.place_id);
    document.getElementById(`trek-card-${trek.place_id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const handleGenerate = () => {
    const trek = treks.find((t) => t.place_id === selectedId);
    if (trek) onSelect(trek);
  };

  const leftPanel = (
    <div>
      {validTreks.length === 0 && (
        <div className="ir-empty">
          <p>No treks available in this district.</p>
        </div>
      )}
      <div className="trek-selection-grid">
        {validTreks.map((trek, idx) => {
          const cfg = getCategoryCfg(trek.category);
          const isSelected = selectedId === trek.place_id;
          const imgUrl = `${trekImages[idx % trekImages.length]}`;

          return (
            <div
              key={trek.place_id}
              id={`trek-card-${trek.place_id}`}
              className={`trek-detail-card ${isSelected ? "selected" : ""}`}
              onClick={() => handleCardClick(trek)}
              onMouseEnter={() => setHoveredId(trek.place_id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: "pointer", position: "relative" }}
            >
              <div className="trek-card-img-wrap">
                <img src={imgUrl} alt={trek.place_name} loading="lazy" />
                <div className="hs-card-overlay" />
                <span className={`trek-difficulty-badge ${(trek.mobility || "difficult").toLowerCase()}`}>
                  {trek.mobility || "Difficult"}
                </span>
                {trek.place_id === recommendedTrekId && (
                  <span style={{ position: "absolute", top: 12, right: 12, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#fff", background: "#10b981", boxShadow: "0 2px 4px rgba(0,0,0,0.15)", zIndex: 2 }}>
                    Recommended
                  </span>
                )}
              </div>
              <div className="trek-card-body">
                <h3>{trek.place_name}</h3>
                <div className="trek-card-meta-row">
                  <span style={{ color: cfg.color, fontWeight: 700 }}>{cfg.icon}</span>
                  <span>{trek.category || "Adventure"}</span>
                  <span style={{ color: "#64748b" }}>{trek.district}</span>
                </div>
                <button className="view-trek-btn">
                  {isSelected ? "Selected" : "View Trek Itinerary"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sl-bottom-actions">
        {onBack && (
          <button className="sl-btn sl-btn-secondary" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
            Back to Form
          </button>
        )}
        <button
          className="sl-btn sl-btn-primary"
          disabled={!selectedId || loading}
          onClick={handleGenerate}
        >
          {loading ? "Generating..." : selectedId ? "Generate Trek Itinerary" : "Select a Trek"}
        </button>
      </div>
    </div>
  );

  return (
    <SplitLayout
      leftContent={leftPanel}
      rightContent={
        <TrekMap
          treks={treks}
          hoveredId={hoveredId}
          selectedId={selectedId}
          onHover={setHoveredId}
          onSelect={handleMarkerClick}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
        />
      }
    />
  );
}
