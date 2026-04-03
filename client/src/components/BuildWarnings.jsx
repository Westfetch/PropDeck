import React, { useState } from 'react';

const SEVERITY_STYLES = {
  hard_constraint: { className: 'warning-hard', label: 'Issue' },
  strong_recommendation: { className: 'warning-strong', label: 'Warning' },
  soft_guidance: { className: 'warning-soft', label: 'Tip' },
  info: { className: 'warning-info', label: 'Info' }
};

const BuildWarnings = ({ warnings, tips }) => {
  const [showTips, setShowTips] = useState(false);

  if (!warnings?.length && !tips?.length) return null;

  return (
    <div className="build-warnings">
      {warnings.map((w) => {
        const style = SEVERITY_STYLES[w.severity] || SEVERITY_STYLES.info;
        return (
          <div key={w.rule_id} className={`warning-item ${style.className}`}>
            <span className="warning-label">{style.label}</span>
            <span className="warning-message">{w.message}</span>
          </div>
        );
      })}

      {tips.length > 0 && !warnings.length && (
        <button
          className="tips-toggle"
          onClick={() => setShowTips(!showTips)}
        >
          {showTips ? 'Hide tips' : `${tips.length} tip${tips.length > 1 ? 's' : ''} available`}
        </button>
      )}

      {tips.length > 0 && (warnings.length > 0 || showTips) && (
        <div className="tips-list">
          {tips.map((t) => (
            <div key={t.rule_id} className="warning-item warning-info">
              <span className="warning-label">Tip</span>
              <span className="warning-message">{t.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuildWarnings;
