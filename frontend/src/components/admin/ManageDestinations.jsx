import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

function ManageDestinations() {

const API_URL = "http://localhost:8000/api/admin/destinations";

const navigate = useNavigate();
const [destinations,setDestinations] = useState([]);
const [showAdd,setShowAdd] = useState(false);
const [showView,setShowView] = useState(false);
const [showEdit,setShowEdit] = useState(false);
const [selectedDestination,setSelectedDestination]=useState(null);
const [notice,setNotice]=useState(null);
const noticeTimerRef=useRef(null);
const [search,setSearch]=useState("");
const [currentPage,setCurrentPage]=useState(1);
const destinationPerPage=10;

const [newDestination,setNewDestination]=useState({
    place_name:"",
    District:"",
    Latitude:"",
    Longitude:"",
    Category:"",
    Indoor_Outdoor:"",
    Mobility:"",
    Weather_Sensitivity:"",
    Budget_level:"",
    Entry_Fee:"",
    province:3,
    estimated_duration_value:"",
    estimated_duration_unit:"",
    is_trek:false,
    elevation_meters:"",
    opening_time:"",
    closing_time:""
});

useEffect(()=>{
    fetchDestinations();
    // const interval=setInterval(()=>{
    // fetchDestinations();
    // },5000);
    // return()=>clearInterval(interval);
},[]);

// Fetch Data
const fetchDestinations=async()=>{
    try{
        const response=await axios.get(API_URL);
        setDestinations(response.data);
    }
    catch(error){
        console.log(error);
    }
};

// Filter
const filteredDestinations=destinations.filter(destination=>
    destination.place_name.toLowerCase().includes(search.toLowerCase())
    ||
    destination.District.toLowerCase().includes(search.toLowerCase())
    ||
    destination.Category.toLowerCase().includes(search.toLowerCase())
);

// Pagination
const indexOfLast=currentPage*destinationPerPage;
const indexOfFirst=indexOfLast-destinationPerPage;
const currentDestinations=filteredDestinations.slice(
    indexOfFirst,
    indexOfLast
);
const totalPages=Math.ceil(filteredDestinations.length/destinationPerPage);

// Toast
function showNotice(type,message){
    if(noticeTimerRef.current)
    clearTimeout(noticeTimerRef.current);
    setNotice({
        type, message
    });
    noticeTimerRef.current=setTimeout(()=>{
        setNotice(null);
    },5000);
}

// Input Change
const handleInputChange=(e)=>{
    const{name,value,type,checked}=e.target;
    setNewDestination({
        ...newDestination,
        [name]:
        type==="checkbox"
        ?
        checked
        :
        value
    });
};

// View
const handleView=(destination)=>{
    setSelectedDestination(destination);
    setShowView(true);
};

// Add
const handleAdd=async()=>{
    if (
        !newDestination.place_name.trim() ||
        !newDestination.District.trim() ||
        !newDestination.Category.trim()
    ){
        Swal.fire({
            icon:"warning",
            title:"Missing Fields",
            text:"Place Name, District and Category are required."
        });
        return;
    }

    try{
        const response=await axios.post( API_URL, newDestination );
        Swal.fire({
            icon:"success",
            title:"Success",
            text:response.data.message,
            timer:1500,
            showConfirmButton:false
        });
        fetchDestinations();
        setShowAdd(false);
    }

    catch(error){
        console.log(error);
    }
};

// Edit
const handleEdit=async()=>{
    try{
        const response = await axios.put( `${API_URL}/${selectedDestination.place_id}`, selectedDestination );
        Swal.fire({
            icon:"success",
            title:"Updated",
            text:response.data.message,
            timer:1500,
            showConfirmButton:false
        });
        fetchDestinations();
        setShowEdit(false);
    }

    catch(error){
        console.log(error);
    }
};

// Delete
const handleDelete=async(id)=>{
    const result=await Swal.fire({
        title:"Delete Destination?",
        text:"This destination will be permanently removed.",
        icon:"warning",
        showCancelButton:true,
        confirmButtonColor:"#d33",
        cancelButtonColor:"#6c757d",
        confirmButtonText:"Delete"
    });

    if(!result.isConfirmed)
    return;
    try{
        const response=await axios.delete(`${API_URL}/${id}`);

        await Swal.fire({
            icon:"success",
            title:"Deleted!",
            text:response.data.message,
            timer:1500,
            showConfirmButton:false
        });
        fetchDestinations();
    }

    catch(error){
        console.log(error);
    }
};

return (
  <>
    <div className="back-header">
        <button className="back-btn" title="Go Back to Dashboard" onClick={() => navigate("/admin")}>
        <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h1>Manage Destinations</h1>
    </div>

        <div className="table-header">
            <button className="button-actions" onClick={() => setShowAdd(true)} >
                Add Destination
            </button>

            <div className="search-container">
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input type="text" className="search-box" placeholder="Search place name, district, or category..." value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                }}
                />
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Place Name</th>
                    <th>District</th>
                    <th>Category</th>
                    <th>Mobility</th>
                    <th>Budget</th>
                    <th>Actions</th>
                </tr>
            </thead>

            <tbody>
                {currentDestinations.length===0?
                <tr>
                    <td colSpan="6" className="empty-table" >
                        No destinations found.
                    </td>
                </tr>
                :
                currentDestinations.map((destination)=>(
                <tr key={destination.place_id}>
                    <td>{destination.place_name}</td>
                    <td>{destination.District}</td>
                    <td>{destination.Category}</td>
                    <td>{destination.Mobility}</td>
                    <td>{destination.Budget_level}</td>
                    <td className="crud">
                        {/* View */}
                        <button className="view-btn" title="View" onClick={()=>handleView(destination)}>
                            <i className="fa-solid fa-eye"></i>
                        </button>

                        {/* Edit */}
                        <button className="editing-btn" title="Edit" onClick={()=>{
                            setSelectedDestination(destination);
                            setShowEdit(true);
                            }} >
                            <i className="fa-solid fa-pen"></i>
                        </button>

                        {/* Delete */}
                        <button className="delete-btn" title="Delete" onClick={()=>handleDelete(destination.place_id)}>
                            <i className="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
                ))
                }
            </tbody>
        </table>

        {/* Pagination */}
        <div className="pagination">
            <button disabled={currentPage===1} onClick={()=>setCurrentPage(currentPage-1)} >
                Previous
            </button>
            <span>
                Page {currentPage} of {totalPages}
            </span>
            <button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(currentPage+1)} >
                Next
            </button>
        </div>

            {/* Add Modal */}
            {showAdd && (
            <div className="destination-form-container">
            <div className="destination-form">
                <h2>Add Destination</h2>

                <div className="form-grid">
                {/* Left Column */}
                <div className="form-column">
                    <label>Place Name <span className="required">*</span></label>
                    <input type="text" name="place_name" value={newDestination.place_name} onChange={handleInputChange} />

                    <label>District <span className="required">*</span></label>
                    <input type="text" name="District" value={newDestination.District} onChange={handleInputChange} />

                    <label>Category <span className="required">*</span></label>
                    <select name="Category" value={newDestination.Category} onChange={handleInputChange}>
                        <option value="">Select Category</option>
                        <option value="adventure">Adventure</option>
                        <option value="nature">Nature</option>
                        <option value="cultural">Cultural</option>
                        <option value="religious">Religious</option>
                    </select>

                    <label>Indoor / Outdoor <span className="required">*</span></label>
                    <select name="Indoor_Outdoor" value={newDestination.Indoor_Outdoor} onChange={handleInputChange}>
                        <option value="">Select</option>
                        <option value="Indoor">Indoor</option>
                        <option value="Outdoor">Outdoor</option>
                        <option value="Both">Both</option>
                    </select>

                    <label>Mobility <span className="required">*</span></label>
                    <select name="Mobility" value={newDestination.Mobility} onChange={handleInputChange}>
                    <option value="">Select</option>
                    <option value="Easy">Easy</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Difficult">Difficult</option>
                    </select>

                    <label>Weather Sensitivity <span className="required">*</span></label>
                    <select name="Weather_Sensitivity" value={newDestination.Weather_Sensitivity} onChange={handleInputChange}>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>

                    <label>Budget Level <span className="required">*</span></label>
                    <select name="Budget_level" value={newDestination.Budget_level} onChange={handleInputChange}>
                    <option value="">Select</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    </select>

                    <label>Opening Time <span className="required">*</span></label>
                    <input type="time" name="opening_time" value={newDestination.opening_time} onChange={handleInputChange} />
                </div>

                {/* Right Column */}
                <div className="form-column">

                    <label>Entry Fee <span className="required">*</span></label>
                    <select name="Entry_Fee" value={newDestination.Entry_Fee} onChange={handleInputChange}>
                        <option value="">Select</option>
                        <option value="Free">Free</option>
                        <option value="Paid">Paid</option>
                    </select>

                    <label>Province <span className="required">*</span></label>
                    <input type="number" name="province" min="1" max="7" value={newDestination.province} onChange={handleInputChange} />

                    <label>Latitude <span className="required">*</span></label>
                    <input type="number" step="any" name="Latitude" value={newDestination.Latitude} onChange={handleInputChange} />

                    <label>Longitude <span className="required">*</span></label>
                    <input type="number" step="any" name="Longitude" value={newDestination.Longitude} onChange={handleInputChange} />

                    <label>Duration <span className="required">*</span></label>
                    <div className="duration-row">
                    <input type="number" name="estimated_duration_value" value={newDestination.estimated_duration_value} onChange={handleInputChange} />
                    <select name="estimated_duration_unit" value={newDestination.estimated_duration_unit} onChange={handleInputChange}>
                        <option value="">Unit</option>
                        <option value="Minutes">Minutes</option>
                        <option value="Hours">Hours</option>
                        <option value="Days">Days</option>
                    </select>
                    </div>

                    <label className="checkbox-label">
                    <input type="checkbox" name="is_trek" checked={newDestination.is_trek} onChange={handleInputChange} />
                        Is Trek? <span className="required">*</span>
                    </label>

                    <label>Elevation (meters) <span className="required">*</span></label>
                    <input type="number" name="elevation_meters" value={newDestination.elevation_meters} onChange={handleInputChange} />

                    <label>Closing Time <span className="required">*</span></label>
                    <input type="time" name="closing_time" value={newDestination.closing_time} onChange={handleInputChange} />
                </div>
                </div>

                <div className="modal-buttons">
                {/* Save */}
                <button className="save-btn" onClick={handleAdd}>Save</button>
                {/* Cancel */}
                <button className="cancel-btn" onClick={() => setShowAdd(false)}>Cancel</button>
                </div>
            </div>
            </div>
    )}

    {/* View Modal */}
    {showView && selectedDestination && (
        <div className="message-modal">

            <div className="message-box">

                <h2>Destination Details</h2>

                <div className="message-info">
                    <p><strong>Place:</strong> {selectedDestination.place_name}</p>
                    <p><strong>District:</strong> {selectedDestination.District}</p>
                    <p><strong>Category:</strong> {selectedDestination.Category}</p>
                    <p><strong>Indoor / Outdoor:</strong> {selectedDestination.Indoor_Outdoor}</p>
                    <p><strong>Mobility:</strong> {selectedDestination.Mobility}</p>
                    <p><strong>Weather Sensitivity:</strong> {selectedDestination.Weather_Sensitivity}</p>
                    <p><strong>Budget Level:</strong> {selectedDestination.Budget_level}</p>
                    <p><strong>Entry Fee:</strong> {selectedDestination.Entry_Fee}</p>
                    <p><strong>Province:</strong> {selectedDestination.province}</p>
                    <p><strong>Latitude:</strong> {selectedDestination.Latitude}</p>
                    <p><strong>Longitude:</strong> {selectedDestination.Longitude}</p>
                    <p><strong>Duration:</strong> {selectedDestination.estimated_duration_value} {selectedDestination.estimated_duration_unit}</p>
                    <p><strong>Is Trek?:</strong> {selectedDestination.is_trek ? "Yes" : "No"}</p>
                    <p><strong>Elevation:</strong> {selectedDestination.elevation_meters}</p>
                    <p><strong>Opening Time:</strong> {selectedDestination.opening_time}</p>
                    <p><strong>Closing Time:</strong> {selectedDestination.closing_time}</p>
                </div>

                <div className="modal-buttons">
                    <button className="cancel-btn" onClick={()=>setShowView(false)} >
                        Close
                    </button>
                </div>

            </div>

        </div>

    )}
    
    {/* Edit Modal - Popup */}
    {showEdit && selectedDestination && (
    <div className="destination-form-container">
        <div className="destination-form">
        <h2>Edit Destination</h2>

      <div className="form-grid">
        {/* Left Column */}
        <div className="form-column">
          <label>Place Name </label>
          <input type="text" value={selectedDestination.place_name} onChange={(e) => setSelectedDestination({ ...selectedDestination, place_name: e.target.value })} />

          <label>District </label>
          <input type="text" value={selectedDestination.District} onChange={(e) => setSelectedDestination({ ...selectedDestination, District: e.target.value })} />

          <label>Category </label>
        <select value={selectedDestination.Category} onChange={(e) => setSelectedDestination({ ...selectedDestination, Category: e.target.value })}>
            <option value="">Select Category</option>
            <option value="adventure">Adventure</option>
            <option value="nature">Nature</option>
            <option value="cultural">Cultural</option>
            <option value="religious">Religious</option>
        </select>

          <label>Indoor / Outdoor</label>
            <select value={selectedDestination.Indoor_Outdoor || ""} onChange={(e) => setSelectedDestination({ ...selectedDestination, Indoor_Outdoor: e.target.value })}>
                <option value="">Select</option>
                <option value="Indoor">Indoor</option>
                <option value="Outdoor">Outdoor</option>
                <option value="Both">Both</option>
            </select>

          <label>Mobility </label>
          <select value={selectedDestination.Mobility} onChange={(e) => setSelectedDestination({ ...selectedDestination, Mobility: e.target.value })}>
            <option value="">Select</option>
            <option value="Easy">Easy</option>
            <option value="Moderate">Moderate</option>
            <option value="Difficult">Difficult</option>
          </select>

          <label>Weather Sensitivity</label>
            <select value={selectedDestination.Weather_Sensitivity || ""} onChange={(e) => setSelectedDestination({ ...selectedDestination, Weather_Sensitivity: e.target.value })}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </select>

          <label>Budget Level <span className="required">*</span></label>
          <select value={selectedDestination.Budget_level} onChange={(e) => setSelectedDestination({ ...selectedDestination, Budget_level: e.target.value })}>
            <option value="">Select</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <label>Opening Time</label>
          <input type="time" value={selectedDestination.opening_time || ""} onChange={(e) => setSelectedDestination({ ...selectedDestination, opening_time: e.target.value })} />
          
        </div>

        {/* Right Column */}
        <div className="form-column">
          <label>Entry Fee</label>
            <select value={selectedDestination.Entry_Fee || ""} onChange={(e) => setSelectedDestination({ ...selectedDestination, Entry_Fee: e.target.value })}>
                <option value="">Select</option>
                <option value="Free">Free</option>
                <option value="Paid">Paid</option>
            </select>

          <label>Province</label>
          <input type="number" min="1" max="7" value={selectedDestination.province} onChange={(e) => setSelectedDestination({ ...selectedDestination, province: e.target.value })} />

          <label>Latitude</label>
          <input type="number" step="any" value={selectedDestination.Latitude || ""} onChange={(e) => setSelectedDestination({ ...selectedDestination, Latitude: e.target.value })} />

          <label>Longitude</label>
          <input type="number" step="any" value={selectedDestination.Longitude || ""} onChange={(e) => setSelectedDestination({ ...selectedDestination, Longitude: e.target.value })} />

          <label>Duration </label>
          <div className="duration-row">
            <input type="number" value={selectedDestination.estimated_duration_value || ""} onChange={(e) => setSelectedDestination({ ...selectedDestination, estimated_duration_value: e.target.value })} />
            <select value={selectedDestination.estimated_duration_unit || ""} onChange={(e) => setSelectedDestination({ ...selectedDestination, estimated_duration_unit: e.target.value })}>
              <option value="">Unit</option>
              <option value="Minutes">Minutes</option>
              <option value="Hours">Hours</option>
              <option value="Days">Days</option>
            </select>
          </div>

          <label className="checkbox-label">
            <input type="checkbox" checked={selectedDestination.is_trek || false} onChange={(e) => setSelectedDestination({ ...selectedDestination, is_trek: e.target.checked })} />
            Is Trek?
          </label>

          <label>Elevation (meters)</label>
          <input type="number" value={selectedDestination.elevation_meters || ""} onChange={(e) => setSelectedDestination({ ...selectedDestination, elevation_meters: e.target.value })} />

          <label>Closing Time</label>
          <input type="time" value={selectedDestination.closing_time || ""} onChange={(e) => setSelectedDestination({ ...selectedDestination, closing_time: e.target.value })} />
        </div>
      </div>

      <div className="modal-buttons">
        {/* Save */}
        <button className="save-btn" onClick={handleEdit}>Update</button>
        {/* Cancel */}
        <button className="cancel-btn" onClick={() => setShowEdit(false)}>Cancel</button>
      </div>
    </div>
  </div>
)}

  </>
)

}

export default ManageDestinations;