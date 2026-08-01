import pytest
from unittest.mock import MagicMock, patch
from datetime import date, timedelta

from app.logic.weather.weather_service import (
    WeatherService,
    WeatherForecast,
)


@pytest.fixture
def service():
    return WeatherService()



# Test 1: Date within forecast window


def test_is_within_forecast_window_true(service):
    travel_date = (date.today() + timedelta(days=5)).isoformat()

    assert service.is_within_forecast_window(travel_date) is True



# Test 2: Date outside forecast window


def test_is_within_forecast_window_false(service):
    travel_date = (date.today() + timedelta(days=20)).isoformat()

    assert service.is_within_forecast_window(travel_date) is False


# # ----------------------------------------------------
# # Test 3: Successfully fetch forecast
# # ----------------------------------------------------

@patch("app.logic.weather.weather_service.WeatherService._fetch_forecast_raw")
@patch("app.logic.weather.weather_service.WeatherService._get_coordinates")
def test_get_forecast_success(
    mock_coordinates,
    mock_fetch,
    service,
):
    travel_date = (date.today() + timedelta(days=1)).isoformat()

    mock_coordinates.return_value = (27.7172, 85.3240)

    mock_fetch.return_value = {
        "daily": {
            "time": [travel_date],
            "weather_code": [1],
            "temperature_2m_max": [28],
            "temperature_2m_min": [18],
            "precipitation_sum": [0],
            "rain_sum": [0],
            "snowfall_sum": [0],
            "wind_speed_10m_max": [12],
        }
    }

    forecast = service.get_forecast(
        "Kathmandu",
        travel_date,
    )

    assert isinstance(forecast, WeatherForecast)
    assert forecast.weather_code == 1
    assert forecast.temp_max == 28
    assert forecast.temp_min == 18
    assert forecast.rain_sum == 0



# # Test 4: API failure returns None


@patch("app.logic.weather.weather_service.WeatherService._get_coordinates")
def test_get_forecast_failure(
    mock_coordinates,
    service,
):
    travel_date = (date.today() + timedelta(days=1)).isoformat()

    mock_coordinates.side_effect = Exception("API Error")

    forecast = service.get_forecast(
        "Kathmandu",
        travel_date,
    )

    assert forecast is None

