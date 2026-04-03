export const PILOTS = {
  pilot_one: {
    id: 'pilot_one',
    username: 'whoop_ripper',
    initials: 'WR',
    colour: '#d26cff',
    bio: 'Whoop addict. Indoor rips only.',
    stats: { builds: 2, likes: 19, swaps: 0, verified_builds: 0 },
    badges: []
  },
  pilot_two: {
    id: 'pilot_two',
    username: 'cine_bristol',
    initials: 'CB',
    colour: '#ff7ecb',
    bio: 'Cinewhoop cinematographer. Bristol UK.',
    stats: { builds: 2, likes: 42, swaps: 3, verified_builds: 1 },
    badges: ['verified_pilot', 'swapper']
  },
  pilot_three: {
    id: 'pilot_three',
    username: 'noob_fpv',
    initials: 'NF',
    colour: '#60d394',
    bio: 'Just started. Learning the basics.',
    stats: { builds: 2, likes: 28, swaps: 0, verified_builds: 1 },
    badges: ['verified_pilot']
  }
};

export const BUILD_STATUSES = {
  flying: { label: 'Flying', colour: 'var(--ok)' },
  grounded: { label: 'Grounded', colour: 'var(--warn)' },
  for_sale: { label: 'For sale', colour: 'var(--ok)' },
  for_swap: { label: 'For swap', colour: 'var(--warn)' },
  lost: { label: 'Lost', colour: '#ff5050' },
  stripped: { label: 'Stripped', colour: 'var(--muted)' },
  retired: { label: 'Retired', colour: 'var(--muted)' }
};

export const DEMO_BUILDS = [
  {
    id: 'build_1',
    build_name: '65mm 1S whoop',
    model_label: 'BETAFPV Meteor65 (2022)',
    pilot_id: 'pilot_one',
    visibility: 'public',
    lifecycle_status: 'for_sale',
    sale_price_gbp: 45,
    note: 'Upgraded to Air65. Selling the whole kit, batteries included.',
    created_at: '2026-03-28T14:30:00Z',
    likes: 12,
    flight_proof_likes: 0,
    parts: [
      { canonical_name: '65mm whoop frame', part_type: 'frame', quantity: 1, condition: 'used', evidence_state: 'confirmed' },
      { canonical_name: '0802 motor', part_type: 'motor', quantity: 4, condition: 'used', evidence_state: 'confirmed', variant: { kv: 19000 } },
      { canonical_name: '1S whoop AIO', part_type: 'aio', quantity: 1, condition: 'used', evidence_state: 'confirmed', variant: { brand: 'BETAFPV' } },
      { canonical_name: '31mm propeller', part_type: 'propeller', quantity: 4, condition: 'used', evidence_state: 'confirmed' },
      { canonical_name: 'nano analog camera', part_type: 'camera', quantity: 1, condition: 'used', evidence_state: 'inferred' },
      { canonical_name: 'whoop VTX', part_type: 'vtx', quantity: 1, condition: 'used', evidence_state: 'inferred' },
      { canonical_name: 'SPI ELRS receiver', part_type: 'rx', quantity: 1, condition: 'used', evidence_state: 'inferred', variant: { protocol: 'ELRS' } },
      { canonical_name: 'BT2.0 1S battery', part_type: 'battery', quantity: 3, condition: 'used', evidence_state: 'confirmed', variant: { connector: 'BT2.0' } }
    ],
    flight_proof_media: null
  },
  {
    id: 'build_1b',
    build_name: '75mm 1S whoop',
    model_label: 'Happymodel Mobula6',
    pilot_id: 'pilot_one',
    visibility: 'public',
    lifecycle_status: 'lost',
    sale_price_gbp: null,
    note: null,
    rip_note: 'Flew into a tree at the park. Wind took it. Gone.',
    created_at: '2026-03-15T09:00:00Z',
    likes: 7,
    flight_proof_likes: 0,
    parts: [
      { canonical_name: '65mm whoop frame', part_type: 'frame', quantity: 1, condition: 'used', evidence_state: 'confirmed' },
      { canonical_name: '0802 motor', part_type: 'motor', quantity: 4, condition: 'used', evidence_state: 'confirmed' },
      { canonical_name: '1S whoop AIO', part_type: 'aio', quantity: 1, condition: 'used', evidence_state: 'confirmed' },
      { canonical_name: '31mm propeller', part_type: 'propeller', quantity: 4, condition: 'used', evidence_state: 'confirmed' }
    ],
    flight_proof_media: null
  },
  {
    id: 'build_2',
    build_name: '75mm 1S whoop',
    model_label: 'Happymodel Mobula7',
    pilot_id: 'pilot_two',
    visibility: 'public',
    lifecycle_status: 'flying',
    sale_price_gbp: null,
    note: 'Daily driver. Tuned with Betaflight 4.5. Flies like a dream in the garden.',
    created_at: '2026-04-01T18:45:00Z',
    likes: 34,
    flight_proof_likes: 18,
    parts: [
      { canonical_name: '75mm whoop frame', part_type: 'frame', quantity: 1, condition: 'tested_ok', evidence_state: 'confirmed' },
      { canonical_name: '0802 motor', part_type: 'motor', quantity: 4, condition: 'tested_ok', evidence_state: 'confirmed', variant: { kv: 19000 } },
      { canonical_name: '1S whoop AIO', part_type: 'aio', quantity: 1, condition: 'tested_ok', evidence_state: 'confirmed', variant: { brand: 'Happymodel' } },
      { canonical_name: '40mm propeller', part_type: 'propeller', quantity: 4, condition: 'tested_ok', evidence_state: 'confirmed' },
      { canonical_name: 'nano analog camera', part_type: 'camera', quantity: 1, condition: 'tested_ok', evidence_state: 'inferred' },
      { canonical_name: 'whoop VTX', part_type: 'vtx', quantity: 1, condition: 'tested_ok', evidence_state: 'inferred' },
      { canonical_name: 'ELRS receiver', part_type: 'rx', quantity: 1, condition: 'tested_ok', evidence_state: 'inferred', variant: { protocol: 'ELRS' } },
      { canonical_name: 'BT2.0 1S battery', part_type: 'battery', quantity: 4, condition: 'tested_ok', evidence_state: 'confirmed', variant: { connector: 'BT2.0' } }
    ],
    flight_proof_media: {
      yt_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      yt_video_id: 'dQw4w9WgXcQ',
      media_class: 'single_pack_flight',
      duration_seconds: 97,
      duration_validated: true,
      validation_method: 'oembed_api',
      curation_pass: true,
      curation_flags: [],
      flight_environment: 'outdoor',
      source: 'user_supplied',
      review_state: 'trusted_suggestion',
      notes: 'Garden rip, calm day'
    }
  },
  {
    id: 'build_3',
    build_name: '3-inch cinewhoop',
    model_label: 'Custom 3-inch DJI',
    pilot_id: 'pilot_two',
    visibility: 'public',
    lifecycle_status: 'for_swap',
    sale_price_gbp: null,
    note: 'Moving to Walksnail. Will swap for any Walksnail 3-inch setup.',
    created_at: '2026-04-02T11:20:00Z',
    likes: 8,
    flight_proof_likes: 0,
    parts: [
      { canonical_name: '3 inch cinewhoop frame', part_type: 'frame', quantity: 1, condition: 'used', evidence_state: 'confirmed' },
      { canonical_name: '1404 motor', part_type: 'motor', quantity: 4, condition: 'used', evidence_state: 'confirmed' },
      { canonical_name: '20x20 stack', part_type: 'aio', quantity: 1, condition: 'used', evidence_state: 'confirmed' },
      { canonical_name: '3 inch propeller', part_type: 'propeller', quantity: 4, condition: 'used', evidence_state: 'confirmed' },
      { canonical_name: 'DJI O3 Air Unit', part_type: 'vtx', quantity: 1, condition: 'used', evidence_state: 'confirmed', variant: { video: 'DJI' } },
      { canonical_name: 'ELRS receiver', part_type: 'rx', quantity: 1, condition: 'used', evidence_state: 'confirmed', variant: { protocol: 'ELRS' } }
    ],
    flight_proof_media: null
  },
  {
    id: 'build_4',
    build_name: '75mm 1S whoop',
    model_label: 'EMAX Tinyhawk III',
    pilot_id: 'pilot_three',
    visibility: 'public',
    lifecycle_status: 'flying',
    sale_price_gbp: null,
    note: 'My first quad. Still learning but getting the hang of it.',
    created_at: '2026-04-03T08:15:00Z',
    likes: 21,
    flight_proof_likes: 9,
    parts: [
      { canonical_name: '75mm whoop frame', part_type: 'frame', quantity: 1, condition: 'new', evidence_state: 'confirmed' },
      { canonical_name: '0802 motor', part_type: 'motor', quantity: 4, condition: 'new', evidence_state: 'confirmed' },
      { canonical_name: '1S whoop AIO', part_type: 'aio', quantity: 1, condition: 'new', evidence_state: 'confirmed', variant: { brand: 'EMAX' } },
      { canonical_name: '40mm propeller', part_type: 'propeller', quantity: 4, condition: 'new', evidence_state: 'confirmed' },
      { canonical_name: 'nano analog camera', part_type: 'camera', quantity: 1, condition: 'new', evidence_state: 'inferred' },
      { canonical_name: 'whoop VTX', part_type: 'vtx', quantity: 1, condition: 'new', evidence_state: 'inferred' },
      { canonical_name: 'ELRS receiver', part_type: 'rx', quantity: 1, condition: 'new', evidence_state: 'inferred', variant: { protocol: 'ELRS' } },
      { canonical_name: 'PH2.0 1S battery', part_type: 'battery', quantity: 2, condition: 'new', evidence_state: 'confirmed', variant: { connector: 'PH2.0' } }
    ],
    flight_proof_media: {
      yt_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      yt_video_id: 'dQw4w9WgXcQ',
      media_class: 'single_pack_flight',
      duration_seconds: 142,
      duration_validated: true,
      validation_method: 'oembed_api',
      curation_pass: true,
      curation_flags: [],
      flight_environment: 'indoor',
      source: 'user_supplied',
      review_state: 'trusted_suggestion',
      notes: 'First flight, living room loops'
    }
  },
  {
    id: 'build_5',
    build_name: '65mm 1S whoop',
    model_label: 'BETAFPV Air65',
    pilot_id: 'pilot_three',
    visibility: 'public',
    lifecycle_status: 'stripped',
    sale_price_gbp: null,
    note: null,
    rip_note: 'Motors reused in new Meteor65 build.',
    created_at: '2026-03-20T16:00:00Z',
    likes: 7,
    flight_proof_likes: 0,
    parts: [
      { canonical_name: '65mm whoop frame', part_type: 'frame', quantity: 1, condition: 'used', evidence_state: 'confirmed' },
      { canonical_name: '0702 motor', part_type: 'motor', quantity: 4, condition: 'used', evidence_state: 'confirmed' },
      { canonical_name: '1S whoop AIO', part_type: 'aio', quantity: 1, condition: 'used', evidence_state: 'confirmed' }
    ],
    flight_proof_media: null
  }
];

export const CURRENT_PILOT = 'pilot_one';

export const timeAgo = (dateStr) => {
  const now = new Date('2026-04-03T09:00:00Z');
  const then = new Date(dateStr);
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
};
