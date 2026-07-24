import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "../styles/hotelselection.css";

const getCustomIcon = (color, label, hovered = false, selected = false) => {
  const sz = hovered ? 38 : selected ? 34 : 28;
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${sz}px;
        height: ${sz}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${hovered || selected ? '2.5px' : '1.5px'} solid #ffffff;
        box-shadow: 0 4px 12px ${hovered ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)'};
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        <div style="
          transform: rotate(45deg);
          color: #ffffff;
          font-weight: 700;
          font-size: ${sz > 30 ? '11px' : '9px'};
          font-family: system-ui, -apple-system, sans-serif;
        ">
          ${label}
        </div>
      </div>
    `,
    className: "hotel-pin-marker",
    iconSize: [sz, sz + 6],
    iconAnchor: [sz / 2, sz + 6],
    popupAnchor: [0, -(sz + 6)]
  });
};

function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 14);
    } else if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [center, zoom, bounds, map]);
  return null;
}

function StarRating({ score }) {
  const full = Math.round(score || 0);
  return (
    <div className="hs-stars-wrap">
      <span className="hs-stars-icons">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`hs-star ${i < full ? "filled" : "empty"}`}>★</span>
        ))}
      </span>
      <span className="hs-star-score">{(score || 0).toFixed(1)}</span>
    </div>
  );
}

function CompactHotelCard({ hotel, selected, hovered, onSelect, onMouseEnter, onMouseLeave }) {
  return (
    <div
      id={`hotel-card-${hotel.hotel_id}`}
      className={`hs-compact-card ${selected ? "is-selected" : ""} ${hovered ? "is-hovered" : ""}`}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="hs-card-left-info">
        <div className="hs-card-title-row">
          <h4 className="hs-card-hotel-name">{hotel.hotel_name}</h4>
          {hotel.district && <span className="hs-card-district-chip">{hotel.district}</span>}
        </div>
        <div className="hs-card-sub-row">
          <StarRating score={hotel.review_score} />
          {hotel.distance_km != null && (
            <span className="hs-card-distance-badge">📍 {hotel.distance_km} km away</span>
          )}
        </div>
      </div>

      <div className="hs-card-right-action">
        <div className="hs-card-price-tag">
          <span className="hs-price-val">NPR {hotel.budget?.toLocaleString()}</span>
          <span className="hs-price-unit">/ night</span>
        </div>
        <button className={`hs-select-pill ${selected ? "active" : ""}`}>
          {selected ? "Selected ✓" : "Select"}
        </button>
      </div>
    </div>
  );
}

export default function HotelSelection({ hotels = [], corridor = [], onSelect, onHover, loading }) {
  const [selectedId, setSelectedId] = useState(hotels[0]?.hotel_id || null);
  const [hoveredHotelId, setHoveredHotelId] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const markerRefs = useRef({});

  useEffect(() => {
    if (hotels.length > 0 && !selectedId) {
      setSelectedId(hotels[0].hotel_id);
    }
  }, [hotels]);

  const handleConfirm = () => {
    if (!selectedId) return;
    onSelect(selectedId);
  };

  const handleCardClick = (hotel) => {
    setSelectedId(hotel.hotel_id);
    if (hotel.latitude && hotel.longitude) {
      setMapCenter([parseFloat(hotel.latitude), parseFloat(hotel.longitude)]);
      setMapZoom(15);
      setTimeout(() => {
        markerRefs.current[hotel.hotel_id]?.openPopup();
      }, 100);
    }
  };

  const validHotels = hotels.filter((h) => h.latitude && h.longitude);
  const bounds = validHotels.map((h) => [parseFloat(h.latitude), parseFloat(h.longitude)]);

  const districtLabel = corridor?.[0] || "destination";
  const routeText = corridor?.length > 1 ? corridor.join(" → ") : districtLabel;

  // Group hotels by district
  const grouped = {};
  for (const h of hotels) {
    const d = h.district || "Other";
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(h);
  }

  return (
    <div className="hs-main-wrapper">
      {/* Header */}
      <div className="hs-header-section">
        <div className="hs-badge-pill">Hotel Selection</div>
        <h2 className="hs-main-title">Choose Your Sanctuary</h2>
        <p className="hs-main-subtitle">
          Pick where you'll rest in <strong>{routeText}</strong> — select a
          starting hotel and we'll assign others along your route.
        </p>
      </div>

      <div className="hs-hotel-list-container">
        {Object.entries(grouped).map(([district, districtHotels]) => (
          <div key={district} className="hs-district-group">
            <h3 className="hs-district-title">{district}</h3>
            {districtHotels.map((hotel) => (
              <CompactHotelCard
                key={hotel.hotel_id}
                hotel={hotel}
                selected={selectedId === hotel.hotel_id}
                hovered={hoveredHotelId === hotel.hotel_id}
                onSelect={() => handleCardClick(hotel)}
                onMouseEnter={() => { setHoveredHotelId(hotel.hotel_id); onHover?.(hotel.hotel_id); }}
                onMouseLeave={() => { setHoveredHotelId(null); onHover?.(null); }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Immediate Sticky/Fixed Confirm Button right below card list */}
      <div className="hs-action-sticky-footer">
        <button
          className="hs-primary-confirm-btn"
          disabled={!selectedId || loading}
          onClick={handleConfirm}
        >
          {loading ? (
            <span className="hs-btn-loading-state">
              <span className="hs-spinner-icon" />
              Generating Itinerary...
            </span>
          ) : (
            <span>Generate Itinerary →</span>
          )}
        </button>
      </div>
    </div>
  );
}

// Export Map separately for SplitLayout
export function HotelSelectionMap({ hotels = [], selectedId, hoveredId, onSelectMarker }) {
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const markerRefs = useRef({});

  const validHotels = hotels.filter((h) => h.latitude && h.longitude);
  const bounds = validHotels.map((h) => [parseFloat(h.latitude), parseFloat(h.longitude)]);

  useEffect(() => {
    if (hoveredId) {
      const hotel = validHotels.find((h) => h.hotel_id === hoveredId);
      if (hotel) {
        setMapCenter([parseFloat(hotel.latitude), parseFloat(hotel.longitude)]);
        setMapZoom(15);
        setTimeout(() => { markerRefs.current[hoveredId]?.openPopup(); }, 50);
      }
    }
  }, [hoveredId]);

  return (
    <MapContainer
      center={bounds.length > 0 ? bounds[0] : [27.7, 85.3]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validHotels.map((hotel) => {
        const isHovered = hoveredId === hotel.hotel_id;
        const isSelected = selectedId === hotel.hotel_id;
        const pinColor = isHovered ? "#e11d48" : isSelected ? "#0284c7" : "#059669";

        return (
          <Marker
            key={hotel.hotel_id}
            position={[parseFloat(hotel.latitude), parseFloat(hotel.longitude)]}
            icon={getCustomIcon(pinColor, "H", isHovered, isSelected)}
            ref={(el) => { if (el) markerRefs.current[hotel.hotel_id] = el; }}
            eventHandlers={{
              click: () => {
                if (onSelectMarker) onSelectMarker(hotel);
                setMapCenter([parseFloat(hotel.latitude), parseFloat(hotel.longitude)]);
                setMapZoom(15);
                setTimeout(() => markerRefs.current[hotel.hotel_id]?.openPopup(), 100);
              },
            }}
          >
            <Popup>
              <div className="ir-map-popup">
                <div className="ir-popup-cat" style={{ color: "#059669" }}>Hotel</div>
                <div className="ir-popup-title">{hotel.hotel_name}</div>
                <div className="ir-popup-district">{hotel.district}</div>
                <div className="ir-popup-duration" style={{ color: "#0284c7", fontWeight: 700 }}>
                  NPR {hotel.budget?.toLocaleString()} / night
                </div>
                {hotel.review_score > 0 && (
                  <div className="ir-popup-travel">★ {hotel.review_score.toFixed(1)} Rating</div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
      <MapController center={mapCenter} zoom={mapZoom} bounds={bounds} />
    </MapContainer>
  );
}
