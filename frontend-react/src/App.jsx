// =====================================================================
//  App.jsx  -  the PARENT component. It owns ALL the data of the page:
//
//     fields    text + image of Question, Option 1-4, Solution
//     meta      question type, subject, chapter
//     answers   which options are correct, e.g. [1, 3]
//     target    which field receives the next crop
//
//  It passes the data DOWN to the two halves of the screen:
//     <CropPanel />     left side  (upload, crop, 4 buttons)
//     <QuestionForm />  right side (the form)
//
//  HOW A RESULT TRAVELS:
//     CropPanel (button click) -> App.handleExtract -> api.js -> backend
//     -> App puts the answer into `fields` -> QuestionForm shows it
// =====================================================================
import { useState, useEffect } from "react";
import CropPanel from "./components/CropPanel";
import QuestionForm from "./components/QuestionForm";
import { API, USE_MOCK, FIELDS, FIELD_ORDER } from "./config";
import { sendToBackend, saveQuestion, fixImageUrl } from "./api";


// an empty set of fields: { question: {text:"", image:""}, option1: {...}, ... }
function makeEmptyFields() {
  const empty = {};
  FIELD_ORDER.forEach(function (name) {
    empty[name] = { text: "", image: "" };
  });
  return empty;
}


export default function App() {

  // ---------- STATE ----------
  const [fields, setFields]   = useState(makeEmptyFields);
  const [meta, setMeta]       = useState({ questionType: "MCQ", subject: "Physics", chapter: "" });
  const [answers, setAnswers] = useState([]);
  const [target, setTarget]   = useState("question");
  const [autoNext, setAutoNext] = useState(true);
  const [toast, setToast]     = useState(null);        // pop-up message {text, type}


  // ---------- POP-UP MESSAGE ----------
  function showMessage(text, type) {
    setToast({ text: text, type: type });
  }

  // hide the message after 3 seconds
  useEffect(function () {
    if (!toast) return;
    const timer = setTimeout(function () { setToast(null); }, 3000);
    return function () { clearTimeout(timer); };
  }, [toast]);


  // ---------- SMALL HELPERS THAT CHANGE `fields` ----------

  // replace the text of one field
  function setFieldText(name, text) {
    setFields(function (old) {
      return { ...old, [name]: { ...old[name], text: text } };
    });
  }

  // add text AFTER the old text (never deletes what the user typed)
  function appendFieldText(name, newText) {
    setFields(function (old) {
      const oldText = old[name].text;
      const joined = oldText.trim() === "" ? newText : oldText + "\n" + newText;
      return { ...old, [name]: { ...old[name], text: joined } };
    });
  }

  function setFieldImage(name, imageUrl) {
    setFields(function (old) {
      return { ...old, [name]: { ...old[name], image: imageUrl } };
    });
  }

  function clearField(name) {
    setFields(function (old) {
      return { ...old, [name]: { text: "", image: "" } };
    });
  }

  // after a result is put in `from`, select the next field in FIELD_ORDER
  function moveToNextField(from) {
    const index = FIELD_ORDER.indexOf(from);
    if (index < FIELD_ORDER.length - 1) {
      const next = FIELD_ORDER[index + 1];
      // only move if the user did not click some other field meanwhile
      setTarget(function (current) { return current === from ? next : current; });
    }
  }


  // ---------- THE 4 EXTRACTION BUTTONS ----------
  // mode = "text" | "math" | "handwriting" | "diagram"
  async function handleExtract(mode, base64) {
    const where = target;       // remember the field (user may click elsewhere while waiting)

    try {
      const result = await sendToBackend(API[mode], base64);

      if (mode === "text" || mode === "handwriting") {
        if (!result.text || result.text.trim() === "") {
          showMessage("No text was found in this box.", "error");
          return;
        }
        appendFieldText(where, result.text.trim());
      }

      else if (mode === "math") {
        if (!result.latex || result.latex.trim() === "") {
          showMessage("No equation was found in this box.", "error");
          return;
        }
        // Tardigrade keeps maths between $ ... $
        let latex = result.latex.trim();
        if (!latex.startsWith("$")) { latex = "$" + latex + "$"; }
        appendFieldText(where, latex);
      }

      else if (mode === "diagram") {
        if (!result.image_url) {
          showMessage("Backend did not return an image path.", "error");
          return;
        }
        setFieldImage(where, fixImageUrl(result.image_url));
      }

      showMessage("OK", "success");
      if (autoNext) { moveToNextField(where); }

    } catch (error) {
      showMessage("Failed: " + error.message, "error");
    }
  }


  // ---------- CREATE QUESTION / RESET ----------
  function resetForm() {
    setFields(makeEmptyFields());
    setAnswers([]);
    setMeta(function (old) { return { ...old, chapter: "" }; });
    setTarget("question");
  }

  function toggleAnswer(number) {
    setAnswers(function (old) {
      if (old.includes(number)) {
        return old.filter(function (n) { return n !== number; });
      }
      return [...old, number].sort(function (a, b) { return a - b; });
    });
  }

  // a field is "filled" if it has text OR an image
  function isFilled(field) {
    return field.text.trim() !== "" || field.image !== "";
  }

  // collects everything into one object (this is what the database team receives)
  function collectFormData() {
    function part(name) {
      return { text: fields[name].text.trim(), image: fields[name].image };
    }
    return {
      question_type: meta.questionType,
      subject:       meta.subject,
      chapter:       meta.chapter.trim(),
      question:      part("question"),
      options:       [part("option1"), part("option2"), part("option3"), part("option4")],
      answers:       answers,
      solution:      part("solution")
    };
  }

  async function handleCreate() {
    // simple checks (the * fields)
    if (!isFilled(fields.question)) {
      showMessage("Question is empty.", "error");
      return;
    }
    for (let i = 1; i <= 4; i++) {
      if (!isFilled(fields["option" + i])) {
        showMessage("Option " + i + " is empty.", "error");
        return;
      }
    }
    if (answers.length === 0) {
      showMessage("Tick at least one correct answer.", "error");
      return;
    }

    const data = collectFormData();
    console.log("Question data:", data);        // handy for debugging

    try {
      await saveQuestion(data);
      showMessage(USE_MOCK ? "Question created successfully (mock mode)" : "Question created successfully", "success");
      if (!USE_MOCK) { resetForm(); }
    } catch (error) {
      showMessage("Could not save: " + error.message, "error");
    }
  }


  // ---------- WHAT IS SHOWN ON SCREEN ----------
  // text like "Option 2" for the "Result will be sent to" line
  const targetLabel = FIELDS.find(function (f) { return f.name === target; })
                            .label.replace("*", "").trim();

  return (
    <div className="app">

      <div className="topbar">
        <h1>Question Paper Digitizer</h1>
        <span>{USE_MOCK ? "MOCK MODE (no backend used)" : ""}</span>
      </div>

      <div className="split">
        <CropPanel
          targetLabel={targetLabel}
          autoNext={autoNext}
          onAutoNextChange={setAutoNext}
          onExtract={handleExtract}
          showMessage={showMessage}
        />

        <QuestionForm
          fields={fields}
          meta={meta}
          answers={answers}
          target={target}
          onSelect={setTarget}
          onTextChange={setFieldText}
          onClear={clearField}
          onRemoveImage={function (name) { setFieldImage(name, ""); }}
          onMetaChange={function (key, value) { setMeta(function (old) { return { ...old, [key]: value }; }); }}
          onToggleAnswer={toggleAnswer}
          onCreate={handleCreate}
          onReset={resetForm}
        />
      </div>

      {toast && <div id="toast" className={toast.type}>{toast.text}</div>}
    </div>
  );
}
