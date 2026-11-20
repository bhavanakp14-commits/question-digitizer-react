# Question Paper Digitizer - React Frontend

React (Vite) frontend. Upload an image or PDF (any size), draw a box with Cropper.js,
click a button, and the result fills the chosen field of the question form.

## Run it
```
npm install
npm run dev          # opens http://localhost:5173
```
No backend yet?  Open  http://localhost:5173/?mock=1  (fake answers, nothing is sent).

The backend (FastAPI) is expected on http://localhost:8000. `vite.config.js` forwards
`/api` and `/static` there, so the code just uses `/api/...`.

## Folder map
```
src/
  main.jsx                 starts React
  App.jsx                  PARENT: owns all form data + talks to the backend
  config.js                routes, field list, mock switch      <- backend team edits routes here
  api.js                   every fetch() call                   <- backend/database team look here
  styles.css               all styling (colours at the top)
  components/
    CropPanel.jsx          LEFT: upload image/PDF, Cropper.js, the 4 buttons
    QuestionForm.jsx       RIGHT: the form
    FieldRow.jsx           one field (text box + image box), used 6 times
```
Data flow: `CropPanel` button -> `App.handleExtract` -> `api.js` -> backend -> `App` fills
the field -> `QuestionForm` shows it.

## Contract for the BACKEND team
All extraction routes: `POST`, JSON body `{ "image": "data:image/png;base64,..." }`

| Route | Reply |
|---|---|
| `POST /api/extract/text` | `{ "text": "..." }` (pytesseract) |
| `POST /api/extract/math` | `{ "latex": "..." }` (pix2tex) |
| `POST /api/extract/handwriting` | `{ "text": "..." }` (TrOCR small) |
| `POST /api/extract/diagram` | `{ "image_url": "/static/diagrams/x.jpg" }` |

Errors: normal HTTP error with `{ "detail": "message" }` (FastAPI HTTPException does this).
PDFs are drawn in the browser, so the backend only ever receives image crops.

## Contract for the DATABASE team
`POST /api/questions` receives:
```json
{
  "question_type": "MCQ", "subject": "Physics", "chapter": "Fluids",
  "question": { "text": "...", "image": "" },
  "options": [ { "text": "...", "image": "" }, { }, { }, { } ],
  "answers": [1, 3],
  "solution": { "text": "...", "image": "" }
}
```
Reply: any 200 JSON, e.g. `{ "message": "Question created" }`.

## Production build (served by FastAPI)
`npm run build` makes the `dist/` folder. In FastAPI mount it **after** your API routes:
`app.mount("/", StaticFiles(directory="dist", html=True), name="frontend")`
