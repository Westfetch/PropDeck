import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReviewQueue from './ReviewQueue.jsx';
import templates from '../../../lib/fpv/build-templates.json';
import { search } from '../../../lib/fpv/search-engine.js';
import aliasRules from '../../../lib/fpv/fpv-alias-rules.json';

const allProducts = aliasRules.product_patterns.map(p => ({
  label: `${p.brand} ${p.model}`,
  brand: p.brand,
  model: p.model,
  build_type: p.build_type,
  is_rtf_kit: p.is_rtf_kit || false
}));

const AddBuildForm = ({ onAddBuild, onCancel }) => {
  const [step, setStep] = useState('input');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [modelLabel, setModelLabel] = useState('');
  const [condition, setCondition] = useState('used');
  const [ytUrl, setYtUrl] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [liveResults, setLiveResults] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const doLiveSearch = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      setLiveResults(null);
      setShowDropdown(false);
      return;
    }
    const result = search(query);
    const matches = [];

    if (result?.product_match) {
      matches.push({
        type: 'product',
        label: `${result.product_match.brand} ${result.product_match.model}`,
        sub: result.product_match.build_type,
        query: `${result.product_match.brand} ${result.product_match.model}`.replace(result.product_match.brand + ' ', ''),
        fuzzy: result.product_match.fuzzy
      });
    }

    // Add other known products that fuzzy-match the input
    const lower = query.toLowerCase().trim();
    for (const p of allProducts) {
      const already = matches.some(m => m.label === p.label);
      if (already) continue;
      const labelLower = p.label.toLowerCase();
      const modelLower = p.model.toLowerCase();
      if (labelLower.includes(lower) || lower.includes(modelLower) || modelLower.includes(lower)) {
        matches.push({
          type: 'product',
          label: p.label,
          sub: p.build_type + (p.is_rtf_kit ? ' kit' : ''),
          query: p.model,
          fuzzy: true
        });
      }
    }

    if (result?.canonical_match) {
      matches.push({
        type: 'part',
        label: result.canonical_match.part,
        sub: result.canonical_match.part_type,
        query: result.canonical_match.part,
        score: result.canonical_match.score
      });
    }

    setLiveResults(matches.length ? matches : null);
    setShowDropdown(matches.length > 0);
  }, []);

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setProductSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doLiveSearch(val), 150);
  };

  const handleSelectResult = (result) => {
    setProductSearch(result.query);
    setShowDropdown(false);
    setLiveResults(null);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const generateSuggestions = () => {
    let parts = [];
    let label = modelLabel;

    // Try product search first
    if (productSearch.trim()) {
      const result = search(productSearch);
      if (result?.fan_out) {
        parts = result.fan_out.map(p => ({
          suggested_part: p.canonical_name,
          part_type: p.part_type,
          quantity: p.quantity,
          confidence: p.evidence_weight === 'strong' ? 'high' : 'medium',
          substituted: false,
          evidence_state: 'inferred',
          input_source: 'product_match',
          variant: p.variant || null
        }));
        if (result.product_match && !label) {
          label = `${result.product_match.brand} ${result.product_match.model}${result.product_match.year ? ` (${result.product_match.year})` : ''}`;
        }
      }
    }

    // Fall back to template
    if (!parts.length && selectedTemplate) {
      const template = templates.find(t => t.build_name === selectedTemplate);
      if (template) {
        for (const req of template.requires) {
          parts.push({
            suggested_part: req.match[0],
            part_type: req.part_type,
            quantity: req.quantity,
            confidence: 'high',
            substituted: false,
            evidence_state: 'confirmed',
            input_source: 'template'
          });
        }
        for (const hidden of (template.hidden_or_integrated || [])) {
          parts.push({
            suggested_part: hidden.match[0],
            part_type: hidden.part_type,
            quantity: hidden.quantity,
            confidence: 'medium',
            substituted: false,
            evidence_state: 'inferred',
            input_source: 'template'
          });
        }
        for (const cons of (template.consumables || [])) {
          parts.push({
            suggested_part: cons.match[0],
            part_type: cons.part_type,
            quantity: cons.quantity,
            confidence: 'medium',
            substituted: false,
            evidence_state: 'inferred',
            input_source: 'template'
          });
        }
      }
    }

    if (!parts.length) return;

    // Add temp IDs for the review UI
    const withIds = parts.map((p, i) => ({
      ...p,
      id: `temp_${i}`,
      state: 'unconfirmed',
      warning: null,
      alternatives: []
    }));

    setSuggestions(withIds);
    setModelLabel(label || modelLabel);
    setStep('review');
  };

  const handleConfirm = (id) => {
    setSuggestions(prev => prev.map(s =>
      s.id === id ? { ...s, state: 'confirmed' } : s
    ));
  };

  const handleCorrect = (id, correctedPart) => {
    setSuggestions(prev => prev.map(s =>
      s.id === id ? { ...s, state: 'corrected', suggested_part: correctedPart, variant: null } : s
    ));
  };

  const handleReject = (id) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const handleConfirmAll = () => {
    setSuggestions(prev => prev.map(s => ({ ...s, state: 'confirmed' })));
  };

  const handleFinish = () => {
    const confirmed = suggestions.filter(s => s.state === 'confirmed' || s.state === 'corrected');
    if (!confirmed.length) return;

    const buildName = selectedTemplate || confirmed.find(p => p.part_type === 'frame')?.suggested_part || 'Custom build';

    let flightProofMedia = null;
    if (ytUrl.trim()) {
      const match = ytUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
      if (match) {
        flightProofMedia = {
          yt_url: ytUrl.trim(), yt_video_id: match[1], media_class: 'single_pack_flight',
          duration_seconds: null, duration_validated: false, curation_pass: true,
          curation_flags: [], flight_environment: 'unknown', source: 'user_supplied',
          review_state: 'trusted_suggestion', notes: null
        };
      }
    }

    onAddBuild({
      build_name: buildName,
      model_label: modelLabel.trim() || null,
      parts: confirmed.map(s => {
        const { variant_id, ...variantData } = s.variant || {};
        return {
          canonical_name: s.suggested_part,
          part_type: s.part_type,
          quantity: s.quantity || 1,
          condition,
          evidence_state: s.evidence_state || 'confirmed',
          variant: Object.keys(variantData).length ? variantData : {}
        };
      }),
      flight_proof_media: flightProofMedia
    });
  };

  const allReviewed = suggestions.length > 0 && suggestions.every(s => s.state !== 'unconfirmed');
  const unreviewedSuggestions = suggestions.filter(s => s.state === 'unconfirmed');
  const reviewedCount = suggestions.filter(s => s.state === 'confirmed' || s.state === 'corrected').length;

  if (step === 'review') {
    return (
      <div className="add-build-form">
        <h3 className="add-build-title">Review parts</h3>
        {modelLabel && <p className="add-build-model">{modelLabel}</p>}

        {unreviewedSuggestions.length > 0 && (
          <ReviewQueue
            suggestions={unreviewedSuggestions}
            onConfirm={handleConfirm}
            onCorrect={handleCorrect}
            onReject={handleReject}
            onConfirmAll={handleConfirmAll}
          />
        )}

        {allReviewed && reviewedCount > 0 && (
          <div className="review-done">
            <p className="review-done-text">{reviewedCount} part{reviewedCount > 1 ? 's' : ''} confirmed. Ready to add.</p>
            <div className="add-build-actions">
              <button className="btn btn-primary" onClick={handleFinish}>
                Add to garage
              </button>
              <button className="btn btn-ghost" onClick={() => setStep('input')}>
                Back
              </button>
            </div>
          </div>
        )}

        {allReviewed && reviewedCount === 0 && (
          <div className="review-done">
            <p className="review-done-text">All parts rejected. Nothing to add.</p>
            <button className="btn btn-ghost" onClick={() => setStep('input')}>Back</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="add-build-form">
      <h3 className="add-build-title">Add a quad</h3>

      <label className="form-label">
        Product name
        <div className="search-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="form-input"
            placeholder="e.g. Meteor65, Mobula7, Cetus X"
            value={productSearch}
            onChange={handleSearchInput}
            onFocus={() => { if (liveResults?.length) setShowDropdown(true); }}
            autoComplete="off"
          />
          {showDropdown && liveResults && (
            <div className="search-dropdown" ref={dropdownRef}>
              {liveResults.map((r, i) => (
                <button
                  key={i}
                  className={`search-dropdown-item ${r.type === 'product' ? 'search-item-product' : 'search-item-part'}`}
                  onClick={() => handleSelectResult(r)}
                  type="button"
                >
                  <span className="search-item-label">{r.label}</span>
                  <span className="search-item-sub">{r.sub}{r.fuzzy ? ' (fuzzy)' : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="form-hint">Type a product name and the brain will figure out the parts</span>
      </label>

      <label className="form-label">
        Or pick a type
        <select
          className="form-select"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
        >
          <option value="">Select...</option>
          {templates.map(t => (
            <option key={t.build_name} value={t.build_name}>
              {t.build_name}{t.description ? ` — ${t.description}` : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="form-label">
        Name (optional)
        <input
          type="text"
          className="form-input"
          placeholder="e.g. My indoor ripper"
          value={modelLabel}
          onChange={(e) => setModelLabel(e.target.value)}
        />
      </label>

      <label className="form-label">
        Condition
        <select
          className="form-select"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          <option value="new">New</option>
          <option value="tested_ok">Tested OK</option>
          <option value="used">Used</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>

      <label className="form-label">
        Flight proof video (optional)
        <input
          type="text"
          className="form-input"
          placeholder="https://youtube.com/watch?v=..."
          value={ytUrl}
          onChange={(e) => setYtUrl(e.target.value)}
        />
      </label>

      <div className="add-build-actions">
        <button
          className="btn btn-primary"
          onClick={generateSuggestions}
          disabled={!selectedTemplate && !productSearch.trim()}
        >
          Next: review parts
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AddBuildForm;
