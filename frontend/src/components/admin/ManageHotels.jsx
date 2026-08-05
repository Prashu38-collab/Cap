import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../utils/api.js";
import Swal from "sweetalert2";

function ManageHotels() {

  const [hotels, setHotels] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);

  const [newHotel, setNewHotel] = useState({
    hotel_name: "",
    review_score: 0,
    budget: 0,
    latitude: 0,
    longitude: 0,
    district: "",
    destination_id: "",
    elevation_meters: 0
  });

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const res = await api.get("/api/admin/hotels");
      setHotels(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  // Search
  const filteredHotels = hotels.filter((hotel) =>
    hotel.hotel_name.toLowerCase().includes(search.toLowerCase()) ||
    hotel.district.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredHotels.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentHotels = filteredHotels.slice(indexOfFirst, indexOfLast);

  // Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ["review_score", "budget", "latitude", "longitude", "elevation_meters"];
    setNewHotel({
      ...newHotel,
      [name]: numericFields.includes(name) ? Number(value) : value
    });
  };

  // Add Hotel
  const handleAdd = async () => {
    // Validation
    if (!newHotel.hotel_name.trim() || !newHotel.district.trim() || !newHotel.destination_id.trim()) {
      Swal.fire("Error", "Please fill all required fields.", "error");
      return;
    }

    try {
      await api.post("/api/admin/hotels", newHotel);
      Swal.fire("Success", "Hotel added successfully.", "success");
      fetchHotels();
      setShowAdd(false);
      setNewHotel({
        hotel_name: "",
        review_score: 0,
        budget: 0,
        latitude: 0,
        longitude: 0,
        district: "",
        destination_id: "",
        elevation_meters: 0
      });
    } catch (error) {
      console.log(error);
    }
  };

  // Delete Hotel
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Hotel?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/api/admin/hotels/${id}`);
      fetchHotels();
      Swal.fire("Deleted!", "Hotel removed successfully.", "success");
    } catch {
      Swal.fire("Error", "Unable to delete hotel.", "error");
    }
  };

  // Update Hotel
  const handleUpdate = async () => {
    try{
      console.log(selectedHotel);
      await api.put(`/api/admin/hotels/${selectedHotel.hotel_id}`, selectedHotel);
      Swal.fire("Success", "Hotel updated successfully.", "success");
      fetchHotels();
      setShowEdit(false);
    }
    
    catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <div className="back-header">
        <button className="back-btn" title="Go Back to Dashboard" onClick={() => navigate("/admin")}>
        <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h1>Manage Hotels</h1>
      </div>

      <div className="table-header">
        <button className="button-actions" onClick={() => setShowAdd(true)} >
          Add Hotel
        </button>

        <div className="search-container">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input type="text" className="search-box" placeholder="Search hotel or district..." value={search} onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Hotel Name</th>
            <th>District</th>
            <th>Review</th>
            <th>Budget</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentHotels.length === 0 ? (
            <tr>
              <td colSpan="5" className="empty-table">
                No hotels found.
              </td>
            </tr>
          ) : (
            currentHotels.map((hotel) => (
              <tr key={hotel.hotel_id}>

                <td>{hotel.hotel_name}</td>
                <td>{hotel.district}</td>
                <td>{hotel.review_score}</td>
                <td>Rs. {hotel.budget}</td>

                <td className="crud">
                  <button className="view-btn" title="View Details" onClick={() => { 
                      setSelectedHotel(hotel);
                      setShowView(true);
                    }} >
                    <i className="fa-solid fa-eye"></i>
                  </button>

                  <button className="editing-btn" title="Edit Hotel" onClick={() => {
                      setSelectedHotel({...hotel});
                      setShowEdit(true);
                    }} >
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>

                  <button className="delete-btn" title="Delete" onClick={() => handleDelete(hotel.hotel_id)} >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <i className="fa-solid fa-chevron-left"></i> Previous
        </button>
        <span>
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      {/* View Modal */}
      {showView && selectedHotel && (
        <div className="message-modal">

          <div className="message-box">

            <h2>Hotel Details</h2>

            <div className="message-info">
              <p><strong>Hotel Name:</strong> {selectedHotel.hotel_name}</p>
              <p><strong>District:</strong> {selectedHotel.district}</p>
              <p><strong>Destination ID:</strong> {selectedHotel.destination_id}</p>
              <p><strong>Review Score:</strong>{selectedHotel.review_score}</p>
              <p><strong>Budget:</strong> Rs. {selectedHotel.budget}</p>
              <p><strong>Latitude:</strong> {selectedHotel.latitude}</p>
              <p><strong>Longitude:</strong> {selectedHotel.longitude}</p>
              <p><strong>Elevation:</strong> {selectedHotel.elevation_meters} m</p>
            </div>

            <div className="modal-buttons">
              <button className="cancel-btn" onClick={()=>setShowView(false)} >
                Close
              </button>
            </div>

          </div>

        </div>

      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="destination-form-container">
          <div className="destination-form">
            <h2>Add Hotel</h2>

            <div className="form-grid">
              {/* Left Column */}
              <div className="form-column">

              <div>
                <label>Hotel Name <span className="required">*</span></label>
                <input type="text" name="hotel_name" value={newHotel.hotel_name} onChange={handleInputChange} />
              </div>

              <div>
                <label>District <span className="required">*</span></label>
                <input type="text" name="district" value={newHotel.district} onChange={handleInputChange} />
              </div>

              <div>
                <label>Destination ID <span className="required">*</span></label>
                <input type="text" name="destination_id" placeholder="Example: D1" value={newHotel.destination_id} onChange={handleInputChange} />
              </div>

              <div>
                <label>Review Score <span className="required">*</span></label>
                <input type="number"step="0.1" min="0" max="5" name="review_score" placeholder="0.0 - 5.0" value={newHotel.review_score || ""} onChange={handleInputChange} />
              </div>
              </div>

              {/* Right Column */}
              <div className="form-column">

              <div>
                <label>Budget (Rs.) <span className="required">*</span></label>
                <input type="number" name="budget" value={newHotel.budget || ""} onChange={handleInputChange} />
              </div>

              <div>
                <label>Latitude <span className="required">*</span></label>
                <input type="number" name="latitude" value={newHotel.latitude || ""} onChange={handleInputChange} />
              </div>

              <div>
                <label>Longitude <span className="required">*</span></label>
                <input type="number" name="longitude" value={newHotel.longitude || ""} onChange={handleInputChange} />
              </div>

              <div>
                <label>Elevation (meters) <span className="required">*</span></label>
                <input type="number" name="elevation_meters" value={newHotel.elevation_meters || ""} onChange={handleInputChange} />
              </div>
              </div>
              </div>

            <div className="modal-buttons">
              {/* Save */}
              <button className="save-btn" onClick={handleAdd}>
                Save
              </button>
              {/* Cancel */}
              <button className="cancel-btn" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && selectedHotel && (
        <div className="destination-form-container">
          <div className="destination-form">
            <h2>Edit Hotel</h2>

            <div className="form-grid">
            {/* Left Column */}
            <div className="form-column">

            <div>
              <label>Hotel Name </label>
              <input type="text" value={selectedHotel.hotel_name} onChange={(e) => setSelectedHotel({ ...selectedHotel, hotel_name: e.target.value })} />
            </div>

            <div>
              <label>District </label>
              <input type="text" value={selectedHotel.district} onChange={(e) => setSelectedHotel({ ...selectedHotel, district: e.target.value })} />
            </div>

            <div>
              <label>Destination ID </label>
              <input type="text" value={selectedHotel.destination_id} onChange={(e) => setSelectedHotel({ ...selectedHotel, destination_id: e.target.value })} />
            </div>

            <div>
              <label>Review Score </label>
              <input type="number" step="0.1" min="0" max="5" value={selectedHotel.review_score} onChange={(e) => setSelectedHotel({ ...selectedHotel, review_score: Number(e.target.value) })} />
            </div>
            </div>

            {/* Right Column */}
            <div className="form-column">
            <div>
              <label>Budget (Rs.) </label>
              <input type="number" step="0.01" value={selectedHotel.budget} onChange={(e) => setSelectedHotel({ ...selectedHotel, budget: Number(e.target.value) })} />
            </div>

            <div>
              <label>Latitude </label>
              <input type="number" step="any" value={selectedHotel.latitude} onChange={(e) => setSelectedHotel({ ...selectedHotel, latitude: Number(e.target.value) })} />
            </div>

            <div>
              <label>Longitude </label>
              <input type="number" step="any" value={selectedHotel.longitude} onChange={(e) => setSelectedHotel({ ...selectedHotel, longitude: Number(e.target.value) })} />
            </div>

            <div>
              <label>Elevation (meters) </label>
              <input type="number" value={selectedHotel.elevation_meters} onChange={(e) => setSelectedHotel({ ...selectedHotel, elevation_meters: Number(e.target.value) })} />
            </div>
            </div>
            </div>

            <div className="modal-buttons">
              <button className="save-btn" onClick={handleUpdate}>
                Update
              </button>
              <button className="cancel-btn" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

export default ManageHotels;