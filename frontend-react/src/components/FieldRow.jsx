// =====================================================================
//  FieldRow.jsx  -  ONE field of the question form
//  (used for Question, Option 1-4 and Solution)
//  = a text box on the left + an image box on the right
//
//  Props:
//    config         { name, label, imageLabel, placeholder }  (from config.js)
//    field          { text, image }   the current values
//    isActive       true if this is the field that receives the next crop
//    onSelect       function(name)           -> make this the target field
//    onTextChange   function(name, newText)  -> user typed something
//    onClear        function(name)           -> empty text and image
//    onRemoveImage  function(name)           -> remove only the image
// =====================================================================

export default function FieldRow({ config, field, isActive, onSelect, onTextChange, onClear, onRemoveImage }) {
  return (
    <div
      className={isActive ? "field-row active" : "field-row"}
      data-field={config.name}
      onClick={function () { onSelect(config.name); }}
      onFocus={function () { onSelect(config.name); }}
    >
      {/* left: label + text box */}
      <div className="field-main">
        <div className="field-title">
          <label>
            <input
              type="radio"
              name="target"
              value={config.name}
              checked={isActive}
              onChange={function () { onSelect(config.name); }}
            />{" "}
            {config.label}
          </label>
          <button type="button" className="btn-small clear-row"
                  onClick={function () { onClear(config.name); }}>
            Clear
          </button>
        </div>

        <textarea
          id={config.name + "-text"}
          value={field.text}
          placeholder={config.placeholder}
          onChange={function (e) { onTextChange(config.name, e.target.value); }}
        />
      </div>

      {/* right: image box */}
      <div className="field-image">
        <label className="small-label">{config.imageLabel}</label>
        <div className="img-box" id={config.name + "-img"}>
          {field.image ? (
            <>
              <img src={field.image} alt={config.imageLabel} />
              <button
                type="button"
                className="remove-img"
                title="Remove image"
                onClick={function (e) { e.stopPropagation(); onRemoveImage(config.name); }}
              >
                x
              </button>
            </>
          ) : (
            "No image"
          )}
        </div>
      </div>
    </div>
  );
}
