import React, { useState, useRef } from 'react';

const PART_TYPE_ORDER = ['frame', 'motor', 'aio', 'camera', 'vtx', 'rx', 'propeller', 'battery', 'goggles', 'radio', 'charger', 'antenna'];

const PART_TYPE_LABELS = {
  frame: 'Frame', motor: 'Motors', aio: 'AIO', camera: 'Camera',
  vtx: 'VTX', rx: 'RX', propeller: 'Props', battery: 'Battery',
  goggles: 'Goggles', radio: 'Radio', charger: 'Charger', antenna: 'Antenna'
};

const CONDITION_LABELS = {
  new: 'New', tested_ok: 'Tested', used: 'Used',
  unknown: '?', faulty: 'Faulty', for_parts: 'Parts'
};

const PartRow = ({ part, value, onPartPhotoUpload, canEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef(null);
  const label = PART_TYPE_LABELS[part.part_type] || part.part_type;
  const qty = (part.quantity || 1) > 1 ? ` x${part.quantity}` : '';
  const condLabel = CONDITION_LABELS[part.condition] || '';
  const isMissing = part._missing;

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onPartPhotoUpload && part.id) onPartPhotoUpload(part.id, file);
    e.target.value = '';
  };

  return (
    <>
      <tr
        className={`part-row ${isMissing ? 'part-row-missing' : ''} ${expanded ? 'part-row-expanded' : ''}`}
        onClick={() => !isMissing && setExpanded(!expanded)}
      >
        <td className="part-col-type">
          {part.photo_url ? (
            <img src={part.photo_url} alt={label} className="part-thumb" />
          ) : (
            label
          )}
        </td>
        <td className="part-col-name">
          {part.variant?.product_name || part.canonical_name}{qty}
          {part.variant?.product_name && (
            <span className="part-canonical-hint">{part.canonical_name}</span>
          )}
        </td>
        <td className={`part-col-condition condition-${part.condition || 'unknown'}`}>
          {isMissing ? 'Missing' : condLabel}
        </td>
        <td className="part-col-value">
          {isMissing ? '' : value > 0 ? `£${value.toFixed(0)}` : ''}
        </td>
        <td className="part-col-chevron">
          {!isMissing && <span className={`chevron ${expanded ? 'chevron-open' : ''}`}>›</span>}
        </td>
      </tr>
      {expanded && !isMissing && (
        <tr className="part-detail-row">
          <td colSpan="5">
            <div className="part-detail">
              {part.photo_url && (
                <img src={part.photo_url} alt={part.canonical_name} className="part-detail-photo" />
              )}
              {canEdit && (
                <button className="part-photo-btn" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                  {part.photo_url ? 'Change photo' : 'Add photo'}
                </button>
              )}
              {part.evidence_state && (
                <span className="detail-tag">{part.evidence_state === 'confirmed' ? 'Confirmed by you' : part.evidence_state === 'inferred' ? 'Detected from model' : part.evidence_state}</span>
              )}
              {part.variant?.brand && (
                <span className="detail-tag">Brand: {part.variant.brand}</span>
              )}
              {part.variant?.kv && (
                <span className="detail-tag">KV: {part.variant.kv}</span>
              )}
              {part.variant?.protocol && (
                <span className="detail-tag">Protocol: {part.variant.protocol}</span>
              )}
              {part.variant?.connector && (
                <span className="detail-tag">Connector: {part.variant.connector}</span>
              )}
              {part.variant?.video && (
                <span className="detail-tag">Video: {part.variant.video}</span>
              )}
              {part.notes && (
                <span className="detail-note">{part.notes}</span>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="photo-file-input" onChange={handlePhotoChange} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const BuildPartsGrid = ({ parts, missingParts, estimateValue, onPartPhotoUpload, canEdit }) => {
  const allRows = [];

  const grouped = {};
  for (const part of parts) {
    const type = part.part_type || 'unknown';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(part);
  }

  const missingByType = {};
  for (const m of (missingParts || [])) {
    if (!grouped[m.part_type]) {
      missingByType[m.part_type] = m;
    }
  }

  const allTypes = new Set([...Object.keys(grouped), ...Object.keys(missingByType)]);
  const sortedTypes = PART_TYPE_ORDER.filter(t => allTypes.has(t));

  for (const type of sortedTypes) {
    if (grouped[type]) {
      for (const part of grouped[type]) {
        const value = estimateValue ? estimateValue(part) : 0;
        allRows.push({ part, value, key: `${type}-${part.canonical_name}` });
      }
    }
    if (missingByType[type]) {
      const m = missingByType[type];
      allRows.push({
        part: {
          canonical_name: m.candidates[0] || type,
          part_type: m.part_type,
          quantity: m.shortfall,
          condition: null,
          _missing: true
        },
        value: 0,
        key: `missing-${type}`
      });
    }
  }

  return (
    <table className="parts-table" aria-label="Build parts">
      <thead className="sr-only">
        <tr>
          <th>Type</th>
          <th>Part</th>
          <th>Condition</th>
          <th>Value</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {allRows.map(({ part, value, key }) => (
          <PartRow key={key} part={part} value={value} onPartPhotoUpload={onPartPhotoUpload} canEdit={canEdit} />
        ))}
      </tbody>
    </table>
  );
};

export default BuildPartsGrid;
