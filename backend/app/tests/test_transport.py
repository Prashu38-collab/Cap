from conftest import client


# ==========================================
# TRANSPORT SUCCESS TEST
# ==========================================

def test_transport_success():

    # Use an existing preference_id from your database
    preference_id = 54

    response = client.get(
        f"/transport/{preference_id}"
    )

    print(response.json())

    assert response.status_code == 200

    data = response.json()

    assert "preference_id" in data
    assert "starting_district" in data
    assert "destination_district" in data
    assert "outbound_transport" in data
    assert "return_transport" in data



# ==========================================
# INVALID PREFERENCE TEST
# ==========================================

def test_transport_invalid_preference():

    response = client.get(
        "/transport/999999"
    )

    print(response.json())

    assert response.status_code == 404

    assert response.json()["detail"] == "Preference not found."



# ==========================================
# RESPONSE STRUCTURE TEST
# ==========================================

def test_transport_response_structure():

    preference_id = 54

    response = client.get(
        f"/transport/{preference_id}"
    )

    assert response.status_code == 200

    data = response.json()

    assert isinstance(
        data["outbound_transport"],
        list
    )

    assert isinstance(
        data["return_transport"],
        list
    )



# ==========================================
# NO ITINERARY CASE
# ==========================================

def test_transport_no_itinerary():

    # Use a preference_id that exists
    # but has no generated itinerary

    preference_id = 999

    response = client.get(
        f"/transport/{preference_id}"
    )

    assert response.status_code in [404, 200]