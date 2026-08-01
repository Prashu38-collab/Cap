from app.logic.weather.weather_adapter import (
    check_weather_advisory,
    generate_weather_aware_places,
)
import pytest
from unittest.mock import MagicMock, patch

from app.logic.weather.weather_adapter import check_weather_advisory


@patch("app.logic.weather.weather_adapter.WeatherService")
def test_check_weather_advisory_favourable(mock_service):

    service = mock_service.return_value

    service.is_within_forecast_window.return_value = True

    forecast = MagicMock()
    forecast.weather_code = 1
    forecast.precipitation_sum = 0
    forecast.rain_sum = 0
    forecast.snowfall_sum = 0
    forecast.wind_speed_max = 10

    forecast.to_dict.return_value = {
        "district": "Kathmandu",
        "weather_code": 1,
    }

    service.get_forecasts_for_districts.return_value = {
        "Kathmandu": forecast
    }

    db = MagicMock()

    result = check_weather_advisory(
        db,
        ["Kathmandu"],
        "2026-08-05",
    )

    assert result["status"] == "favourable"
    assert result["weather_checked"] is True
    assert result["advisory"] is None

import pytest
from unittest.mock import MagicMock, patch

from app.logic.weather.weather_adapter import check_weather_advisory


@patch("app.logic.weather.weather_adapter._count_indoor_places")
@patch("app.logic.weather.weather_adapter.WeatherService")
def test_check_weather_advisory_unfavourable(
    mock_service,
    mock_count,
):

    service = mock_service.return_value

    service.is_within_forecast_window.return_value = True

    forecast = MagicMock()
    forecast.weather_code = 63
    forecast.precipitation_sum = 15
    forecast.rain_sum = 15
    forecast.snowfall_sum = 0
    forecast.wind_speed_max = 15

    forecast.to_dict.return_value = {
        "district": "Kathmandu",
        "weather_code": 63,
    }

    service.get_forecasts_for_districts.return_value = {
        "Kathmandu": forecast
    }

    mock_count.return_value = 5

    db = MagicMock()

    result = check_weather_advisory(
        db,
        ["Kathmandu"],
        "2026-08-05",
    )

    assert result["status"] == "unfavourable"
    assert result["condition"] == "Moderate Rain"
    assert result["indoor_alternatives_available"] is True
    assert result["district_indoor_info"][0]["indoor_available"] is True

from app.logic.weather.weather_adapter import generate_weather_aware_places


def test_generate_weather_aware_places():

    ranked_places = [
        {
            "place_name": "National Museum",
            "district": "Kathmandu",
            "indoor_outdoor": "Indoor",
            "is_trek": False,
        },
        {
            "place_name": "Garden of Dreams",
            "district": "Kathmandu",
            "indoor_outdoor": "Outdoor",
            "is_trek": False,
        },
        {
            "place_name": "Nagarkot View Tower",
            "district": "Bhaktapur",
            "indoor_outdoor": "Outdoor",
            "is_trek": False,
        },
    ]

    result = generate_weather_aware_places(
        MagicMock(),
        ranked_places,
    )

    assert len(result["adapted_places"]) == 1
    assert result["adapted_places"][0]["place_name"] == "National Museum"

    assert len(result["removals"]) == 1
    assert result["removals"][0]["district"] == "Bhaktapur"