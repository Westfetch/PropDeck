import React, { useState } from 'react';
import partLibrary from '../../../lib/fpv/part-library.json';

const CONFIDENCE_STYLES = {
  high: { className: 'confidence-high', label: 'High' },
  medium: { className: 'confidence-medium', label: 'Med' },
  low: { className: 'confidence-low', label: 'Low' }
};

const canonicalOptions = partLibrary.map(p => p.canonical_name).sort();

const SuggestionRow = ({ suggestion, onConfirm, onCorrect, onReject }) => {
  const [correcting, setCorrecting] = useState(false);
  const [correctedPart, setCorrectedPart] = useState('');
  const conf = CONFIDENCE_STYLES[suggestion.confidence] || CONFIDENCE_STYLES.low;

  return (
    <div className="review-row">
      <div className="review-row-main">
        <div className="review-row-info">
          <span className="review-part-type">{suggestion.part_type}</span>
          <span className="review-part-name">
            {suggestion.variant?.product_name || suggestion.suggested_part}
            {suggestion.variant?.product_name && (
              <span className="review-canonical-hint">{suggestion.suggested_part}</span>
            )}
          </span>
          {suggestion.quantity > 1 && <span className="review-qty">x{suggestion.quantity}</span>}
          <span className={`review-confidence ${conf.className}`}>{conf.label}</span>
        </div>

        {suggestion.warning && (
          <div className="review-warning">{suggestion.warning}</div>
        )}

        {suggestion.substituted && (
          <div className="review-substituted">Mapped to nearest canonical part</div>
        )}

        {correcting ? (
          <div className="review-correct-row">
            <select
              className="review-correct-select"
              value={correctedPart}
              onChange={(e) => setCorrectedPart(e.target.value)}
            >
              <option value="">Select correct part...</option>
              {canonicalOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              className="btn btn-primary review-btn-small"
              disabled={!correctedPart}
              onClick={() => { onCorrect(correctedPart); setCorrecting(false); }}
            >
              Apply
            </button>
            <button
              className="btn btn-ghost review-btn-small"
              onClick={() => setCorrecting(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="review-actions">
            <button className="review-action-btn review-confirm" onClick={onConfirm}>
              Confirm
            </button>
            <button className="review-action-btn review-correct" onClick={() => setCorrecting(true)}>
              Change
            </button>
            <button className="review-action-btn review-reject" onClick={onReject}>
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ReviewQueue = ({ suggestions, onConfirm, onCorrect, onReject, onConfirmAll }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="review-queue">
      <div className="review-header">
        <h3 className="review-title">Review parts</h3>
        <span className="review-count">{suggestions.length} to review</span>
      </div>

      <div className="review-list">
        {suggestions.map(s => (
          <SuggestionRow
            key={s.id}
            suggestion={s}
            onConfirm={() => onConfirm(s.id)}
            onCorrect={(correctedPart) => onCorrect(s.id, correctedPart)}
            onReject={() => onReject(s.id)}
          />
        ))}
      </div>

      <div className="review-bulk-actions">
        <button className="btn btn-primary" onClick={onConfirmAll}>
          Confirm all ({suggestions.length})
        </button>
      </div>
    </div>
  );
};

export default ReviewQueue;
