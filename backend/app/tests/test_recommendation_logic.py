import pytest 
from unittest.mock import MagicMock 
from app.logic.recommendation_logic import RecommendationService

@pytest.fixture
def service():
    return RecommendationService()




# Fake Database
def make_db(pref, rows):
    db = MagicMock()

    # First execute() call: fetch user preference
    pref_result = MagicMock()
    pref_result.fetchone.return_value = pref

    # Second execute() call: fetch places
    places_result = MagicMock()
    places_result.fetchall.return_value = rows

    # execute() is called twice
    db.execute.side_effect = [pref_result, places_result]

    return db







class MockPref:
    def __init__(
        self,
        preferred_categories="",
        budget_level="",
        mobility="",
        starting_district="",
        ending_district="",
    ):
        self.preferred_categories = preferred_categories
        self.budget_level = budget_level
        self.mobility = mobility
        self.starting_district = starting_district
        self.ending_district = ending_district

class MockRow:
    def __init__(
        self,
        place_id=1,
        place_name="Test Place",
        district="Pokhara",
        latitude=27.7,
        longitude=85.3,
        category="Religious",
        mobility="Hard",
        budget_level="high",
        entry_fee="paid",
        duration_value=2,
        duration_unit="hours",
        is_trek=False,
        indoor_outdoor="Outdoor",
        weather_sensitivity="No",
        opening_time=None,
        closing_time=None,
        elevation_meters=1300,
    ):
        self.place_id = place_id
        self.place_name = place_name
        self.district = district
        self.latitude = latitude
        self.longitude = longitude
        self.category = category
        self.mobility = mobility
        self.budget_level = budget_level
        self.entry_fee = entry_fee
        self.raw_duration_value = duration_value
        self.raw_duration_unit = duration_unit
        self.is_trek = is_trek
        self.indoor_outdoor = indoor_outdoor
        self.weather_sensitivity = weather_sensitivity
        self.opening_time = opening_time
        self.closing_time = closing_time
        self.elevation_meters = elevation_meters
        


def test_fetches_user_preferences(service):
    pref = MockPref()
    row = MockRow()

    db = make_db(pref, [row])

    service.get_ranked_places(db, 1)

    assert db.execute.call_count == 2

def test_category_not_match(service):

    pref = MockPref(preferred_categories="Religious")

    row = MockRow(category="Adventure")

    db = make_db(pref, [row])

    result = service.get_ranked_places(db, 1)

    assert result[0]["similarity_score"] == 0.05

def test_budget_match(service):

    pref = MockPref(budget_level="low")

    row = MockRow(budget_level="low")

    db = make_db(pref, [row])

    result = service.get_ranked_places(db, 1)

    assert result[0]["similarity_score"] == 0.20
def test_budget_not_match(service):

    pref = MockPref(budget_level="low")

    row = MockRow(budget_level="high")

    db = make_db(pref, [row])

    result = service.get_ranked_places(db, 1)

    assert result[0]["similarity_score"] == 0.0

def test_no_category_preference(service):

    pref = MockPref(preferred_categories=None)

    row = MockRow(category="Religious")

    db = make_db(pref, [row])

    result = service.get_ranked_places(db, 1)

    assert result[0]["similarity_score"] == 0.0

def test_empty_preferences(service):

    pref = MockPref()

    row = MockRow(entry_fee="free")

    db = make_db(pref, [row])

    result = service.get_ranked_places(db, 1)

    assert result[0]["similarity_score"] == 0.10

def test_case_insensitive_category(service):

    pref = MockPref(preferred_categories="ReLiGiOuS")

    row = MockRow(category="religious")

    db = make_db(pref, [row])

    result = service.get_ranked_places(db, 1)

    assert result[0]["similarity_score"] == 0.40

def test_full_score(service):

    pref = MockPref(
        preferred_categories="Religious",
        budget_level="low",
        mobility="Easy",
        starting_district="Kathmandu"
    )

    row = MockRow(
        category="Religious",
        district="Kathmandu",
        budget_level="low",
        mobility="Easy",
        entry_fee="free"
    )

    db = make_db(pref, [row])

    result = service.get_ranked_places(db, 1)

    assert result[0]["similarity_score"] == 1.0

def test_category_match(service):

    pref = MockPref(preferred_categories="Religious")

    row = MockRow(category="Religious")

    db = make_db(pref, [row])

    result = service.get_ranked_places(db, 1)

    assert result[0]["similarity_score"] == 0.40

def test_none_values(service):

    pref = MockPref()

    row = MockRow(
        category=None,
        mobility=None,
        budget_level=None,
        entry_fee=None,
        district=None
    )

    db = make_db(pref,[row])

    result = service.get_ranked_places(db,1)

    assert len(result)==1

def test_sorted_by_score(service):

    pref = MockPref(
        preferred_categories="Religious"
    )

    rows = [
        MockRow(place_id=1, category="Adventure"),
        MockRow(place_id=2, category="Religious")
    ]

    db = make_db(pref,rows)

    result = service.get_ranked_places(db,1)

    assert result[0]["similarity_score"] >= result[1]["similarity_score"]
    assert result[0]["category"] == "Religious"