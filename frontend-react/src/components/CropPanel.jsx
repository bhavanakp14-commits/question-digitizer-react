// =====================================================================
//  CropPanel.jsx  -  the LEFT side of the screen
//    1. upload an image OR a PDF (no size limit)
//    2. draw a box with Cropper.js
//    3. click one of the 4 buttons -> the cropped part is handed to App.jsx
//
//  Props (things App.jsx gives to this component):
//    targetLabel      text like "Option 2" (shows where the result will go)
//    autoNext         true/false  ("move to next field" checkbox)
//    onAutoNextChange function to call when the checkbox changes
//    onExtract        function(mode, base64)  -> App sends it to the backend
//    showMessage      function(text, type)    -> shows the pop-up message
// =====================================================================
import { useState, useRef, useEffect } from "react";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";

// PDF.js draws PDF pages in the browser. The worker file is bundled by Vite
// (the "?url" ending gives us the file's address), so no internet is needed.
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;


export default function CropPanel({ targetLabel, autoNext, onAutoNextChange, onExtract, showMessage }) {

  // ---------- STATE (values that change what is shown on screen) ----------
  const [imageSrc, setImageSrc]     = useState(null);   // picture shown in the cropper
  const [imageKey, setImageKey]     = useState(0);      // changes for every new picture
  const [totalPages, setTotalPages] = useState(0);      // 0 = no PDF is open
  const [pageNumber, setPageNumber] = useState(1);      // current PDF page
  const [pageInput, setPageInput]   = useState("1");    // text in the page-number box
  const [moveMode, setMoveMode]     = useState(false);  // false = draw box, true = drag picture
  const [busy, setBusy]             = useState(false);  // waiting for the backend
  const [pdfBusy, setPdfBusy]       = useState(false);  // drawing a PDF page
  const [status, setStatus]         = useState("");     // grey line under the buttons
  const [cropPreview, setCropPreview] = useState(null); // last crop that was sent
  const [dragOver, setDragOver]     = useState(false);  // file is being dragged over the box

  // ---------- REFS (things we need to remember but that do NOT redraw the screen) ----------
  const imgRef       = useRef(null);   // the <img> element
  const cropperRef   = useRef(null);   // the Cropper.js object
  const fileInputRef = useRef(null);   // the hidden <input type="file">
  const pdfDocRef    = useRef(null);   // the opened PDF


  // ================================================================
  //  A. START / STOP CROPPER.JS whenever a new picture is shown
  // ================================================================
  useEffect(function () {
    if (!imageSrc || !imgRef.current) return;

    const cropper = new Cropper(imgRef.current, {
      viewMode: 1,          // box cannot go outside the image
      dragMode: "crop",     // dragging draws a new box
      autoCrop: false,      // no box until the user draws one
      background: false,
      responsive: true,
      zoomOnWheel: true     // mouse wheel zooms
    });
    cropperRef.current = cropper;

    // cleanup: runs before the next picture is shown (or when the page closes)
    return function () {
      cropper.destroy();
      cropperRef.current = null;
    };
  }, [imageKey]);


  // ================================================================
  //  B. LOADING FILES  (no size check anywhere - any size is accepted)
  // ================================================================

  // give a new picture (a "data:" address) to the cropper
  function showImage(src) {
    setImageSrc(src);
    setImageKey(function (k) { return k + 1; });  // new key = new <img> = new Cropper
    setMoveMode(false);
    setCropPreview(null);
  }

  // decides: is it a PDF or an image?
  function handleFile(file) {
    const isPdf = (file.type === "application/pdf") || file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      loadPdf(file);
    } else if (file.type.startsWith("image/")) {
      loadImageFile(file);
    } else {
      showMessage("Please choose an image (JPG / PNG) or a PDF file.", "error");
    }
  }

  // ---------- image files ----------
  function loadImageFile(file) {
    pdfDocRef.current = null;   // leave PDF mode
    setTotalPages(0);

    // FileReader makes a "data:" address that <img> can always show
    // (blob: addresses are blocked in some preview windows).
    setStatus("Loading image...");
    const reader = new FileReader();
    reader.onload = function (e) {
      showImage(e.target.result);
      setStatus("");
    };
    reader.onerror = function () {
      setStatus("");
      showMessage("Could not read the image file.", "error");
    };
    reader.readAsDataURL(file);
  }

  // ---------- PDF files ----------
  async function loadPdf(file) {
    setStatus("Opening PDF...");
    try {
      // give the bytes of the file to PDF.js
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      await showPdfPage(1);
    } catch (error) {
      pdfDocRef.current = null;
      setTotalPages(0);
      showMessage("Could not open PDF: " + error.message, "error");
    } finally {
      setStatus("");
    }
  }

  // draws one PDF page on a canvas and shows it as a PNG picture
  async function showPdfPage(number) {
    const pdf = pdfDocRef.current;
    if (!pdf || number < 1 || number > pdf.numPages) return;

    setPdfBusy(true);
    setStatus("Rendering page " + number + "...");
    try {
      const page = await pdf.getPage(number);

      // 300 DPI as the project plan asks (PDF units are 72 per inch).
      // The only "limit" is the browser's own maximum canvas size:
      // a gigantic page is drawn a little smaller so it still works.
      let scale = 300 / 72;
      let viewport = page.getViewport({ scale: scale });
      while (viewport.width > 16000 || viewport.height > 16000 ||
             viewport.width * viewport.height > 100000000) {
        scale = scale * 0.9;
        viewport = page.getViewport({ scale: scale });
      }

      const canvas = document.createElement("canvas");
      canvas.width  = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({
        canvasContext: canvas.getContext("2d"),
        canvas: canvas,
        viewport: viewport
      }).promise;

      showImage(canvas.toDataURL("image/png"));   // PNG = lossless
      setPageNumber(number);
      setPageInput(String(number));
    } catch (error) {
      showMessage("Could not draw page " + number + ": " + error.message, "error");
      setPageInput(String(pageNumber));           // put the old number back
    } finally {
      setPdfBusy(false);
      setStatus("");
    }
  }

  // page number typed in the box (Enter key or clicking away)
  function goToTypedPage() {
    const wanted = parseInt(pageInput, 10);
    if (pdfBusy || isNaN(wanted) || wanted < 1 || wanted > totalPages) {
      setPageInput(String(pageNumber));           // invalid -> old number back
      return;
    }
    if (wanted !== pageNumber) showPdfPage(wanted);
  }


  // ================================================================
  //  C. DRAG & DROP + FILE INPUT
  // ================================================================
  function onFileChosen(e) {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
    e.target.value = "";          // lets the user choose the same file again later
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  }


  // ================================================================
  //  D. THE CROP + THE 4 BUTTONS
  // ================================================================

  // returns "data:image/png;base64,..." or null if no box is drawn
  function getCropAsBase64() {
    const cropper = cropperRef.current;
    if (!cropper) {
      showMessage("Upload an image first.", "error");
      return null;
    }

    const box = cropper.getData();               // {x, y, width, height}
    if (!box.width || !box.height || box.width < 5 || box.height < 5) {
      showMessage("Draw a box on the image first.", "error");
      return null;
    }

    const canvas = cropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high"
    });
    if (!canvas) {
      showMessage("Could not read the cropped area.", "error");
      return null;
    }

    const base64 = canvas.toDataURL("image/png");  // PNG = no quality loss
    setCropPreview(base64);                        // show what we are sending
    return base64;
  }

  // mode = "text" | "math" | "handwriting" | "diagram"
  async function handleExtractClick(mode) {
    if (busy) return;

    const base64 = getCropAsBase64();
    if (base64 === null) return;                   // message already shown

    setBusy(true);
    setStatus("Processing... handwriting and math can take several seconds on a CPU.");
    try {
      await onExtract(mode, base64);               // App.jsx talks to the backend
    } finally {
      setBusy(false);                              // always re-enable the buttons
      setStatus("");
    }
  }

  // toolbar helpers (the "?." means: only do it if the cropper exists)
  function toggleMoveMode() {
    const newMode = !moveMode;
    setMoveMode(newMode);
    cropperRef.current?.setDragMode(newMode ? "move" : "crop");
  }


  // ================================================================
  //  E. WHAT IS SHOWN ON SCREEN
  // ================================================================
  return (
    <div className="left-panel">

      {/* Step 1: upload */}
      <div className="card">
        <h3>1. Upload question paper (image or PDF)</h3>

        <div
          id="drop-zone"
          className={dragOver ? "drag-over" : ""}
          onClick={function () { fileInputRef.current.click(); }}
          onDragOver={function (e) { e.preventDefault(); setDragOver(true); }}
          onDragLeave={function () { setDragOver(false); }}
          onDrop={onDrop}
        >
          Click here or drag &amp; drop a file (JPG / PNG / PDF) - any size
        </div>

        {/* hidden real file input; there is NO size limit */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,application/pdf,.pdf"
          style={{ display: "none" }}
          onChange={onFileChosen}
        />
      </div>

      {/* Step 2: draw a box */}
      <div className="card">
        <h3>2. Draw a box around the part you want</h3>

        {imageSrc && (
          <div className="toolbar">
            <div className="button-row">
              <button type="button" className="btn-small" onClick={function () { cropperRef.current?.zoom(0.2); }}>Zoom +</button>
              <button type="button" className="btn-small" onClick={function () { cropperRef.current?.zoom(-0.2); }}>Zoom -</button>
              <button type="button" className="btn-small" onClick={function () { cropperRef.current?.rotate(90); }}>Rotate</button>
              <button type="button" className="btn-small" onClick={toggleMoveMode}>{moveMode ? "Mode: Move" : "Mode: Crop"}</button>
              <button type="button" className="btn-small" onClick={function () { cropperRef.current?.clear(); }}>Clear box</button>
              <button type="button" className="btn-small" onClick={function () { cropperRef.current?.reset(); }}>Reset</button>
            </div>
          </div>
        )}

        {/* page buttons: only when a PDF is open */}
        {totalPages > 0 && (
          <div className="page-nav" id="page-nav">
            <button type="button" className="btn-small" id="btn-prev-page"
                    disabled={pdfBusy || pageNumber <= 1}
                    onClick={function () { showPdfPage(pageNumber - 1); }}>
              &laquo; Prev
            </button>
            <span>
              Page{" "}
              <input
                type="number" id="page-input" min="1" max={totalPages}
                value={pageInput}
                onChange={function (e) { setPageInput(e.target.value); }}
                onBlur={goToTypedPage}
                onKeyDown={function (e) { if (e.key === "Enter") goToTypedPage(); }}
              />{" "}
              of <span id="page-total">{totalPages}</span>
            </span>
            <button type="button" className="btn-small" id="btn-next-page"
                    disabled={pdfBusy || pageNumber >= totalPages}
                    onClick={function () { showPdfPage(pageNumber + 1); }}>
              Next &raquo;
            </button>
          </div>
        )}

        {imageSrc ? (
          <div id="image-area">
            {/* key = a new <img> for every new picture (Cropper.js needs this) */}
            <img
              key={imageKey}
              ref={imgRef}
              id="paper-image"
              src={imageSrc}
              alt="Question paper"
              onError={function () { showMessage("The picture could not be displayed.", "error"); }}
            />
          </div>
        ) : (
          <p className="hint">No image yet. Upload one above.</p>
        )}
      </div>

      {/* Step 3: what is inside the box?  (stays visible at the bottom) */}
      <div className="card sticky-actions">
        <h3>3. What is inside the box?</h3>
        <p className="hint">
          Result will be sent to: <span id="target-label">{targetLabel}</span>
          {" "}(click a field on the right to change)
        </p>

        <div className="button-row">
          <button type="button" className="btn-blue"  id="btn-text"    disabled={busy} onClick={function () { handleExtractClick("text"); }}>Extract Text</button>
          <button type="button" className="btn-blue"  id="btn-math"    disabled={busy} onClick={function () { handleExtractClick("math"); }}>Extract Math</button>
          <button type="button" className="btn-blue"  id="btn-hand"    disabled={busy} onClick={function () { handleExtractClick("handwriting"); }}>Extract Handwriting</button>
          <button type="button" className="btn-green" id="btn-diagram" disabled={busy} onClick={function () { handleExtractClick("diagram"); }}>Save as Diagram</button>
        </div>

        <p className="hint">
          <label>
            <input
              type="checkbox"
              checked={autoNext}
              onChange={function (e) { onAutoNextChange(e.target.checked); }}
            />{" "}
            After filling, move to the next field automatically
          </label>
        </p>
        <p className="hint" id="status-line">{status}</p>

        {cropPreview && (
          <div>
            <p className="hint">Last crop that was sent:</p>
            <img id="crop-preview" src={cropPreview} alt="Cropped part" />
          </div>
        )}
      </div>
    </div>
  );
}
