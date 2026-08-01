import pytest

from app.logic.weather.weather_rules import (
    is_favourable,
    condition_label,
)



# Test 5: Favourable Weather


def test_is_favourable_clear_weather():

    forecast = {
        "weather_code": 1,
        "precipitation_sum": 0,
        "rain_sum": 0,
        "snowfall_sum": 0,
        "wind_speed_max": 15,
    }

    assert is_favourable(forecast) is True



# Test 6: Unfavourable Weather (Heavy Rain)


def test_is_favourable_heavy_rain():

    forecast = {
        "weather_code": 63,
        "precipitation_sum": 12,
        "rain_sum": 12,
        "snowfall_sum": 0,
        "wind_speed_max": 10,
    }

    assert is_favourable(forecast) is False


# Test 7: Weather Condition Label


def test_condition_label():

    assert condition_label({"weather_code": 0}) == "Clear Sky"

    assert condition_label({"weather_code": 61}) == "Slight Rain"

    assert condition_label({"weather_code": 95}) == "Thunderstorm"

    assert condition_label({"weather_code": 999}) == "Unknown Conditions"