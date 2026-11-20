// =====================================================================
//  api.js  -  every call to the backend lives in this file
//  (the React components never call fetch() directly)
// =====================================================================
import { API, USE_MOCK } from "./config";

// Sends ONE cropped image (Base64 PNG) to ONE extraction route
// and returns the JSON the backend answers with.
//   url    = one of the routes in API (text / math / handwriting / diagram)
//   base64 = "data:image/png;base64,...."
export async function sendToBackend(url, base64) {

  // ---- fake mode, so the frontend can be tested alone ----
  if (USE_MOCK) {
    await new Promise(function (resolve) { setTimeout(resolve, 700); });
    if (url === API.text)        return { text: "Sample printed text from the crop" };
    if (url === API.math)        return { latex: "\\frac{a L}{2 g}" };
    if (url === API.handwriting) return { text: "Sample handwritten note" };
    if (url === API.diagram)     return { image_url: base64 };   // shows the crop itself
  }

  // ---- real request ----
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 })
  });

  return await readJsonOrThrow(response);
}

// Sends the finished question to the database team's route.
export async function saveQuestion(data) {
  if (USE_MOCK) {
    return { message: "mock" };
  }

  const response = await fetch(API.saveQuestion, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return await readJsonOrThrow(response);
}

// Reads the reply. If the server sent an error (like 500) we throw an Error
// whose message is the "detail" text that FastAPI sends.
async function readJsonOrThrow(response) {
  let data = {};
  try { data = await response.json(); } catch (err) { /* reply was not JSON */ }

  if (!response.ok) {
    // FastAPI sends { "detail": "..." } (a list for validation errors 422)
    if (data.detail) {
      throw new Error(typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail));
    }
    // 500 with no detail = the backend is not running (the Vite dev server
    // answers 500 when it cannot reach port 8000) or it crashed.
    if (response.status >= 500) {
      throw new Error("Server error " + response.status +
        " - is the backend running on port 8000? Check its terminal.");
    }
    throw new Error("Server error " + response.status);
  }
  return data;
}

// Backend may send "static/diagrams/a.jpg" - the browser needs "/static/diagrams/a.jpg"
export function fixImageUrl(url) {
  if (url.startsWith("/") || url.startsWith("http") || url.startsWith("data:")) {
    return url;
  }
  return "/" + url;
}
