// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

function MapSection() {
  return (
    <section className="map-section">

      <h1>Map Visualization</h1>

      <div className="map-container">

        <h3>Explore Selected Destinations of <br></br>Bagmati Province of Nepal</h3>

        <div className="map-inner">

          <img src="/images/Nepal-Map.png" alt="Nepal Map" />

          <div className="marker kathmandu">
            <span className="label label-left">Kathmandu</span>
            <span className="pin">📍</span>
            <div className="district-popup">
              <img src="/images/mykathmandu.jpg" alt="Kathmandu" />
              <p>Basantapur Durbar Square, Kathmandu</p>
            </div>
          </div>

          <div className="marker lalitpur">
            <span className="label label-right">Lalitpur</span>
            <span className="pin">📍</span>
            <div className="district-popup">
              <img src="/images/lalitpur.jpg" alt="Lalitpur" />
              <p>Patan Durbar Square, Lalitpur</p>
            </div>
          </div>

          <div className="marker bhaktapur">
            <span className="label label-left">Bhaktapur</span>
            <span className="pin">📍</span>
            <div className="district-popup">
              <img src="/images/mybhaktapur.jpg" alt="Bhaktapur" />
              <p>Bhaktapur Durbar Square, Khwopa</p>
            </div>
          </div>

          <div className="marker kavrepalanchok">
            <span className="label label-right">Kavrepalanchok</span>
            <span className="pin">📍</span>
            <div className="district-popup">
              <img src="/images/kavre.png" alt="Kavrepalanchowk" />
              <p>Kali Temple, Kavre Bhanjyang</p>
            </div>
          </div>

          <div className="marker sindhupalchok">
            <span className="label label-top">Sindhupalchok</span>
            <span className="pin">📍</span>
            <div className="district-popup">
              <img src="/images/sindhupalchowk.jpg" alt="Sindhupalchowk" />
              <p>Panch Pokhari, Sindhupalchowk</p>
            </div>
          </div>

          <div className="marker dolakha">
            <span className="label label-top">Dolakha</span>
            <span className="pin">📍</span>
            <div className="district-popup">
              <img src="/images/dolakha.jpg" alt="Dolakha" />
              <p>Kalinchowk, Dolakha</p>
            </div>
          </div>

          <div className="marker sindhuli">
            <span className="label label-top">Sindhuli</span>
            <span className="pin">📍</span>
            <div className="district-popup">
              <img src="/images/sindhuli.jpg" alt="Sindhuli" />
              <p>BP Highway, Sindhuli</p>
            </div>
          </div>

          <div className="marker chitwan">
            <span className="label label-top">Chitwan</span>
            <span className="pin">📍</span>
            <div className="district-popup">
              <img src="/images/chitwan.jpg" alt="Chitwan National Park" />
              <p>Chitwan National Park</p>
            </div>
          </div>

          <div className="marker nuwakot">
            <span className="label label-top">Nuwakot</span>
            <span className="pin">📍</span>
            <div className="district-popup">
              <img src="/images/nuwakot.jpg" alt="Nuwakot Durbar" />
              <p>Nuwakot Durbar</p>
            </div>
          </div>

          <div className="marker rasuwa">
            <span className="label label-top">Rasuwa</span>
            <span className="pin">📍</span>
            <div className="district-popup">
              <img src="/images/rasuwa.jpg" alt="Rasuwa" />
              <p>Gosaikunda Lake, Rasuwa</p>
            </div>
          </div>

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