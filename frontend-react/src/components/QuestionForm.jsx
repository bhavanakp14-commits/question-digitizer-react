// =====================================================================
//  QuestionForm.jsx  -  the RIGHT side of the screen (the form)
//  It only SHOWS the data and reports clicks. The data itself lives in App.jsx.
// =====================================================================
import FieldRow from "./FieldRow";
import { FIELDS } from "../config";

export default function QuestionForm({
  fields, meta, answers, target,
  onSelect, onTextChange, onClear, onRemoveImage,
  onMetaChange, onToggleAnswer, onCreate, onReset
}) {

  // makes one <FieldRow> for the field with the given config
  function renderRow(config) {
    return (
      <FieldRow
        key={config.name}
        config={config}
        field={fields[config.name]}
        isActive={target === config.name}
        onSelect={onSelect}
        onTextChange={onTextChange}
        onClear={onClear}
        onRemoveImage={onRemoveImage}
      />
    );
  }

  // FIELDS = [question, option1, option2, option3, option4, solution]
  const questionAndOptions = FIELDS.slice(0, 5);
  const solutionConfig     = FIELDS[5];

  return (
    <div className="right-panel">
      <form onSubmit={function (e) { e.preventDefault(); }}>

        {/* top card: type / subject / chapter */}
        <div className="card">
          <h3>New Question</h3>
          <div className="form-top">
            <div>
              <label className="small-label" htmlFor="question-type">Question Type *</label>
              <select id="question-type" value={meta.questionType}
                      onChange={function (e) { onMetaChange("questionType", e.target.value); }}>
                <option value="MCQ">MCQ Question</option>
                <option value="MULTI">Multiple correct</option>
                <option value="NUMERICAL">Numerical</option>
                <option value="MATCH">Match the following</option>
                <option value="ASSERTION">Assertion and reason</option>
              </select>
            </div>
            <div>
              <label className="small-label" htmlFor="subject">Subject *</label>
              <select id="subject" value={meta.subject}
                      onChange={function (e) { onMetaChange("subject", e.target.value); }}>
                <option>Physics</option>
                <option>Chemistry</option>
                <option>Maths</option>
                <option>Biology</option>
              </select>
            </div>
            <div>
              <label className="small-label" htmlFor="chapter">Chapter</label>
              <input type="text" id="chapter" placeholder="e.g. Fluids" value={meta.chapter}
                     onChange={function (e) { onMetaChange("chapter", e.target.value); }} />
            </div>
          </div>
        </div>

        {/* big card: question, options, answers, solution */}
        <div className="card">

          {questionAndOptions.map(renderRow)}

          {/* correct answer(s) */}
          <label className="small-label">Answer(s) *</label>
          <div className="answers">
            {[1, 2, 3, 4].map(function (number) {
              return (
                <label key={number}>
                  <input
                    type="checkbox"
                    name="answer"
                    value={number}
                    checked={answers.includes(number)}
                    onChange={function () { onToggleAnswer(number); }}
                  />{" "}
                  Option {number}
                </label>
              );
            })}
          </div>

          {renderRow(solutionConfig)}

          <div className="button-row">
            <button type="button" id="btn-create" className="btn-blue" onClick={onCreate}>Create Question</button>
            <button type="button" id="btn-reset-form" onClick={onReset}>Reset Form</button>
          </div>
        </div>

      </form>
    </div>
  );
}
