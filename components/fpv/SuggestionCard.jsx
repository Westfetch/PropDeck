import React, { useState } from "react";

function SuggestionCard({ suggestion, onConfirm, onReject, onSelectAlternative, onManualChange }) {
  const [manualValue, setManualValue] = useState("");
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="mb-2">
        <h3 className="text-lg font-semibold">
          {suggestion.suggested_part} {suggestion.confidence ? `(${suggestion.confidence})` : ""}
        </h3>
        <p className="text-sm opacity-70">{suggestion.part_type} · qty {suggestion.quantity || 1}</p>
      </div>
      {suggestion.warning ? <div className="mb-3 rounded-xl border p-2 text-sm">{suggestion.warning}</div> : null}
      {suggestion.evidence?.length ? (
        <ul className="mb-3 list-disc pl-5 text-sm">
          {suggestion.evidence.map((item, idx) => <li key={idx}>{item}</li>)}
        </ul>
      ) : null}
      {suggestion.alternatives?.length ? (
        <div className="mb-3">
          <div className="mb-1 text-sm font-medium">Alternatives</div>
          <div className="flex flex-wrap gap-2">
            {suggestion.alternatives.map((alt, idx) => (
              <button key={idx} className="rounded-xl border px-3 py-1 text-sm" onClick={() => onSelectAlternative(alt.part)}>
                {alt.part}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mb-3 flex gap-2">
        <input className="w-full rounded-xl border px-3 py-2 text-sm" value={manualValue} onChange={(e) => setManualValue(e.target.value)} placeholder="Manual change: canonical part name" />
        <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => manualValue.trim() && onManualChange(manualValue.trim())}>Apply</button>
      </div>
      <div className="flex gap-2">
        <button className="rounded-xl border px-3 py-2" onClick={onConfirm}>Confirm</button>
        <button className="rounded-xl border px-3 py-2" onClick={onReject}>Reject</button>
      </div>
    </div>
  );
}

export default SuggestionCard;
