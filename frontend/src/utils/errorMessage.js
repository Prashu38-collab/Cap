export function getErrorMessage(error, fallback = "Request failed") {
  if (!error?.response?.data) return error?.message || fallback;

  const data = error.response.data;

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    const first = data.detail[0];
    if (first && first.msg) {
      return first.msg.replace(/^Value error,\s*/i, "");
    }
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (typeof data.detail === "object" && data.detail !== null) {
    const first = Object.values(data.detail)[0];
    if (typeof first === "string") return first;
  }

  return fallback;
}
