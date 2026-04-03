import React from 'react';

const STATUS_CONFIG = {
  confirmed_complete: { label: 'Complete', className: 'badge-complete' },
  complete_except_consumables: { label: 'Complete (needs batteries)', className: 'badge-consumables' },
  possibly_complete: { label: 'Likely complete', className: 'badge-possible' },
  observed_incomplete: { label: 'Incomplete', className: 'badge-incomplete' }
};

const BuildStatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.observed_incomplete;
  return (
    <span className={`build-status-badge ${config.className}`}>
      {config.label}
    </span>
  );
};

export default BuildStatusBadge;
