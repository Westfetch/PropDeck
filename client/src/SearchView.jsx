import React, { useState, useCallback } from 'react';
import { search } from '../../lib/fpv/search-engine.js';

const SearchView = ({ onAddToGarage }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    setResults(search(query));
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleAddToGarage = () => {
    if (!results) return;

    if (results.product_match && results.fan_out) {
      onAddToGarage({
        build_name: results.fan_out.find(p => p.part_type === 'frame')
          ? results.fan_out[0]?.canonical_name?.includes('65mm') ? '65mm 1S whoop'
            : results.fan_out[0]?.canonical_name?.includes('75mm') ? '75mm 1S whoop'
            : '65mm 1S whoop'
          : '65mm 1S whoop',
        model_label: `${results.product_match.brand} ${results.product_match.model}${results.product_match.year ? ` (${results.product_match.year})` : ''}`,
        parts: results.fan_out.map(p => ({
          canonical_name: p.canonical_name,
          part_type: p.part_type,
          quantity: p.quantity,
          condition: 'unknown',
          evidence_state: 'inferred'
        }))
      });
    }
  };

  return (
    <div className="search-view">
      <div className="search-header">
        <h1 className="search-title">Search</h1>
        <p className="search-subtitle">Type a product name, part, or spec. The brain does the rest.</p>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Meteor65 2022, 0802 motor, BT2.0 battery..."
        />
        <button className="btn btn-primary" onClick={handleSearch}>Search</button>
      </div>

      <div className="search-suggestions">
        {['Meteor65', 'Mobula7', 'Cetus X', '0802 motor', 'ELRS receiver', '3 inch cinewhoop'].map(s => (
          <button
            key={s}
            className="search-suggestion"
            onClick={() => { setQuery(s); setResults(search(s)); }}
          >
            {s}
          </button>
        ))}
      </div>

      {results && (
        <div className="search-results">

          {/* Product match */}
          {results.product_match && (
            <div className="search-result-card search-product-card">
              <div className="search-result-header">
                <h2 className="search-result-title">
                  {results.product_match.brand} {results.product_match.model}
                  {results.product_match.year && ` (${results.product_match.year})`}
                </h2>
                <span className="search-result-type">
                  {results.product_match.build_type}
                  {results.product_match.is_rtf_kit && ' kit'}
                </span>
              </div>

              {results.product_match.beginner_note && (
                <p className="search-note">{results.product_match.beginner_note}</p>
              )}

              {results.product_match.variant_notes && (
                <div className="search-variant-notes">
                  {results.product_match.variant_notes.camera_note && (
                    <span className="search-variant-tag">{results.product_match.variant_notes.camera_note}</span>
                  )}
                  {results.product_match.variant_notes.connector && (
                    <span className="search-variant-tag">{results.product_match.variant_notes.connector}</span>
                  )}
                </div>
              )}

              {results.product_match.upgrade_path && (
                <p className="search-upgrade">Upgrade path: {results.product_match.upgrade_path}</p>
              )}
            </div>
          )}

          {/* Parts fan-out */}
          {results.fan_out && (
            <div className="search-result-card">
              <h3 className="search-section-label">Parts breakdown</h3>
              <table className="search-parts-table">
                <tbody>
                  {results.fan_out.map((part, i) => (
                    <tr key={i} className="search-part-row">
                      <td className="search-part-type">{part.part_type}</td>
                      <td className="search-part-name">
                        {part.canonical_name}
                        {part.quantity > 1 && ` x${part.quantity}`}
                      </td>
                      <td className="search-part-evidence">{part.evidence_weight}</td>
                      <td className="search-part-price">
                        {part.price ? `£${(part.price * (part.quantity || 1)).toFixed(0)}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="search-total-row">
                <span>Estimated new value</span>
                <span className="search-total-price">£{results.estimated_value.toFixed(0)}</span>
              </div>

              {onAddToGarage && (
                <button className="btn btn-primary search-add-btn" onClick={handleAddToGarage}>
                  Add to garage
                </button>
              )}
            </div>
          )}

          {/* Kit includes */}
          {results.product_match?.kit_includes && (
            <div className="search-result-card">
              <h3 className="search-section-label">Kit also includes</h3>
              <div className="search-kit-items">
                {results.product_match.kit_includes.map((item, i) => (
                  <div key={i} className="search-kit-item">
                    <span className="search-kit-name">{item.canonical_name}</span>
                    {item.note && <span className="search-kit-note">{item.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canonical match (single part) */}
          {results.canonical_match && !results.fan_out && (
            <div className="search-result-card">
              <div className="search-result-header">
                <h2 className="search-result-title">{results.canonical_match.part}</h2>
                <span className="search-result-type">{results.canonical_match.part_type}</span>
              </div>

              {results.canonical_match.warning && (
                <p className="search-note">{results.canonical_match.warning}</p>
              )}

              <div className="search-specs">
                {Object.entries(results.canonical_match.specs).map(([key, val]) => (
                  <span key={key} className="search-spec-tag">{key}: {val}</span>
                ))}
              </div>

              {results.canonical_match.compatibility_tags?.length > 0 && (
                <div className="search-compat">
                  <span className="search-compat-label">Compatible with:</span>
                  {results.canonical_match.compatibility_tags.map(tag => (
                    <span key={tag} className="search-compat-tag">{tag}</span>
                  ))}
                </div>
              )}

              {results.canonical_match.price && (
                <div className="search-price">Est. value: £{results.canonical_match.price}</div>
              )}

              {results.canonical_match.alternatives?.length > 0 && (
                <div className="search-alternatives">
                  <span className="search-alt-label">Similar:</span>
                  {results.canonical_match.alternatives.map((alt, i) => (
                    <button
                      key={i}
                      className="search-suggestion"
                      onClick={() => { setQuery(alt.part); setResults(search(alt.part)); }}
                    >
                      {alt.part}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Extracted signals (debug/transparency) */}
          {Object.keys(results.signals).length > 0 && (
            <div className="search-result-card search-signals">
              <h3 className="search-section-label">Extracted signals</h3>
              <div className="search-signal-tags">
                {Object.entries(results.signals).map(([key, val]) => (
                  val && <span key={key} className="search-signal-tag">{key}: {val}</span>
                ))}
              </div>
            </div>
          )}

          {/* Expert tips removed — brain knowledge is internal, not user-facing advice */}

          {/* Fuzzy match note */}
          {results.product_match?.fuzzy && (
            <div className="search-fuzzy-note">
              Closest match for "{results.query}". Try the full name for more detail.
            </div>
          )}

          {/* Suggestions when no exact match */}
          {results.suggestions?.length > 0 && (
            <div className="search-result-card">
              <h3 className="search-section-label">Try these</h3>
              <div className="search-suggestions-inline">
                {results.suggestions.map(s => (
                  <button
                    key={s}
                    className="search-suggestion"
                    onClick={() => { setQuery(s); setResults(search(s)); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results at all */}
          {!results.product_match && !results.canonical_match && !results.suggestions?.length && (
            <div className="search-empty">
              <p>No match found for "{results.query}".</p>
              <p className="muted">Try a product name (Meteor65), part type (0802 motor), or spec (BT2.0).</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchView;
