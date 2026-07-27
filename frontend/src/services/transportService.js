import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export async function getTransport(preferenceId) {

    try {

        const response = await axios.get(
            `${API_BASE_URL}/transport/${preferenceId}`
        );

        return response.data;

    } catch (error) {

        console.error("Transport API Error:", error);

        throw error;
    }

}