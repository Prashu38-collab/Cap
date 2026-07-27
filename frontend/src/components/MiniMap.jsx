import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

function MiniMap({ latitude, longitude, locationName }) {

    if (!latitude || !longitude) {
        return (
            <div
                style={{
                    height: "250px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    color: "#64748b",
                    fontWeight: 500,
                }}
            >
                Map not available
            </div>
        );
    }

    return (
        <MapContainer
            center={[latitude, longitude]}
            zoom={15}
            style={{
                height: "250px",
                width: "100%",
            }}
            scrollWheelZoom={false}
        >
            <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={[latitude, longitude]}>
                <Popup>
                    {locationName}
                </Popup>
            </Marker>

        </MapContainer>
    );
}

export default MiniMap;