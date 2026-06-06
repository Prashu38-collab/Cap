// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

function MapSection() {
  return (
    <section className="map-section">

      <h1>Map Visualization</h1>

      <div className="map-container">

        <h3>Explore Destinations <br></br>of Nepal</h3>

        <img src="/images/Nepal-Map.jpg" alt="Nepal Map" />

        <div className="marker kathmandu">
          <span className="label">Kathmandu</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker lalitpur">
          <span className="label">Lalitpur</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker bhaktapur">
          <span className="label">Bhaktapur</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker kavrepalanchok">
          <span className="label">Kavrepalanchok</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker sindhupalchok">
          <span className="label">Sindhupalchok</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker dolakha">
          <span className="label">Dolakha</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker ramechhap">
          <span className="label">Ramechhap</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker sindhuli">
          <span className="label">Sindhuli</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker makwanpur">
          <span className="label">Makwanpur</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker chitwan">
          <span className="label">Chitwan</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker nuwakot">
          <span className="label">Nuwakot</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker dhading">
          <span className="label">Dhading</span>
          <span className="pin">📍</span>
        </div>
        <div className="marker rasuwa">
          <span className="label">Rasuwa</span>
          <span className="pin">📍</span>
        </div>
        
      </div>

      {/* <MapContainer
        center={[27.7172, 85.3240]}
        zoom={12}
        scrollWheelZoom={true}
        className="map-container"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[27.7172, 85.3240]}>
          <Popup>
            Kathmandu, Nepal
          </Popup>
        </Marker>

      </MapContainer> */}

    </section>
  );
}

export default MapSection;