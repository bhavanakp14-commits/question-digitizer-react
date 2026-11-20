// =====================================================================
//  config.js  -  all settings in ONE place
//  (backend team: if your route names are different, change them here)
// =====================================================================

// Backend routes (see README.md for what each one must return)
export const API = {
  text:         "/api/extract/text",
  math:         "/api/extract/math",
  handwriting:  "/api/extract/handwriting",
  diagram:      "/api/extract/diagram",
  saveQuestion: "/api/questions"
};

// Open the page as  http://localhost:5173/?mock=1  to use FAKE answers
// (so the frontend can be tested without any backend running).
export const USE_MOCK = window.location.search.includes("mock=1");

// The fields of the form that can receive a cropped result.
// The ORDER here is the order used by "move to next field automatically".
export const FIELDS = [
  { name: "question", label: "Question *", imageLabel: "Question Image", placeholder: "Question text appears here" },
  { name: "option1",  label: "Option 1 *", imageLabel: "Option 1 Image", placeholder: "" },
  { name: "option2",  label: "Option 2 *", imageLabel: "Option 2 Image", placeholder: "" },
  { name: "option3",  label: "Option 3 *", imageLabel: "Option 3 Image", placeholder: "" },
  { name: "option4",  label: "Option 4 *", imageLabel: "Option 4 Image", placeholder: "" },
  { name: "solution", label: "Solution",   imageLabel: "Solution Image", placeholder: "Solution text appears here" }
];

export const FIELD_ORDER = FIELDS.map(function (f) { return f.name; });
