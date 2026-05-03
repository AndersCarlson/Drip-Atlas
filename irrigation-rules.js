/**
 * Drip Atlas — Irrigation Design Rules
 *
 * Single source of truth for all design constraints, specs, and defaults.
 * Referenced by the designer, zone builder, and materials calculator.
 *
 * Industry basis: ASABE S436, Rain Bird & Hunter installation manuals,
 * CWSS (California Water-Smart Scheduling) guidelines.
 */

const IRRIGATION_RULES = {

  // ─────────────────────────────────────────
  // HEAD & EMITTER SPECS
  // ─────────────────────────────────────────

  heads: {
    rotor: {
      label:       'Rotor',
      description: 'Rotating stream head for lawns and large turf areas. Slower precipitation rate than spray.',
      gpmFull:     2.0,          // GPM at 360° arc, full radius
      radiusFt:    { min: 8,  max: 30, default: 15 },
      arcDeg:      { min: 45, max: 360, default: 180 },
      pressurePsi: { min: 25, max: 65, optimal: 45 },
      precipIn_hr: 0.4,          // inches/hr (lower than spray — by design, prevents runoff)
      spacingRule: 'head_to_head', // radius === spacing between heads
      suitableFor: ['lawn', 'turf', 'large_bed'],
      notSuitableFor: ['narrow_strip', 'slope_gt_15pct'],
    },

    spray: {
      label:       'Spray Head',
      description: 'Fixed-arc head for smaller areas, strips, and shaped beds.',
      gpmFull:     1.5,
      radiusFt:    { min: 5,  max: 18, default: 10 },
      arcDeg:      { min: 45, max: 360, default: 180 },
      pressurePsi: { min: 20, max: 55, optimal: 30 },
      precipIn_hr: 1.5,          // higher than rotor — short run times needed
      spacingRule: 'head_to_head',
      suitableFor: ['lawn', 'flower_bed', 'shrub_bed', 'narrow_strip'],
      notSuitableFor: ['slope_gt_20pct'],  // runoff risk at high precip rate
    },

    drip_emitter: {
      label:       'Drip Emitter',
      description: 'Point-source emitter for trees, shrubs, and garden beds. Low flow, high efficiency.',
      gphOptions:  [0.5, 1.0, 2.0, 4.0],    // gallons per HOUR (not minute)
      gphDefault:  1.0,
      pressurePsi: { min: 15, max: 45, optimal: 25 },
      spacingFt:   { min: 12, max: 18, default: 18 }, // emitter spacing along tube
      densityPer100sqft: 4.4,                // emitters per 100 sq ft of bed area
      suitableFor: ['shrub_bed', 'garden_bed', 'tree_ring', 'container'],
      notSuitableFor: ['lawn', 'turf'],
    },

    bubbler: {
      label:       'Bubbler',
      description: 'Flood-fills a basin around trees or large shrubs. Very low pressure.',
      gpmFull:     0.25,
      radiusFt:    { min: 1, max: 3, default: 2 },
      pressurePsi: { min: 10, max: 30, optimal: 15 },
      suitableFor: ['tree_ring', 'large_shrub'],
    },
  },

  // ─────────────────────────────────────────
  // GPM FORMULA
  // ─────────────────────────────────────────

  // Actual GPM for a partial-arc head = gpmFull × (arcDeg / 360)
  calcHeadGpm(type, arcDeg) {
    const spec = this.heads[type];
    if (!spec || !spec.gpmFull) return 0;
    return Math.round(spec.gpmFull * (arcDeg / 360) * 10) / 10;
  },

  // ─────────────────────────────────────────
  // PIPE SIZING
  // ─────────────────────────────────────────

  pipe: {
    // Velocity limit: 5 ft/s prevents water hammer and noise
    maxVelocityFps: 5,

    // Lookup: max GPM → pipe nominal size and internal diameter
    // Based on Schedule 40 PVC at ≤5 ft/s
    sizeByGpm: [
      { maxGpm:  4, size: '½"',   idIn: 0.622 },
      { maxGpm:  8, size: '¾"',   idIn: 0.824 },
      { maxGpm: 13, size: '1"',   idIn: 1.049 },
      { maxGpm: 22, size: '1¼"',  idIn: 1.380 },
      { maxGpm: 35, size: '1½"',  idIn: 1.610 },
      { maxGpm: 55, size: '2"',   idIn: 2.067 },
    ],

    // Hazen-Williams friction loss in ft-head per 100 ft of pipe, C=150 (new PVC)
    // Multiply result by (runLengthFt / 100) to get total head loss in ft.
    // Note: 1 PSI ≈ 2.31 ft water head — caller converts if needed.
    frictionLossPer100ft(gpm, idIn) {
      if (!gpm || !idIn) return 0;
      return 0.2083 * Math.pow(100 / 150, 1.852) * Math.pow(gpm, 1.852) / Math.pow(idIn, 4.87);
    },

    // Maximum recommended lateral run before pressure drop becomes problematic
    maxLateralRunFt: 200,

    // Price per foot by material (retail estimate)
    pricePerFt: {
      pvc:  0.45,
      poly: 0.32,
      pex:  0.68,
    },

    // Lateral is sized at 55% of zone peak GPM — accounts for demand diversity
    lateralSizingFactor: 0.55,
  },

  getPipeSpec(gpm) {
    const row = this.pipe.sizeByGpm.find(r => gpm <= r.maxGpm);
    return row || this.pipe.sizeByGpm[this.pipe.sizeByGpm.length - 1];
  },

  // ─────────────────────────────────────────
  // ZONE RULES
  // ─────────────────────────────────────────

  zones: {
    // Never exceed 75% of supply GPM on any single zone — leaves headroom for friction loss
    maxZoneGpmFactor: 0.75,

    // Hard cap: single-zone GPM above this risks pressure collapse
    maxZoneGpmAbsolute: 15,

    // Do NOT mix head types in a single zone — precipitation rates differ
    // (rotor: ~0.4 in/hr vs spray: ~1.5 in/hr = over/under watering)
    mixHeadTypes: false,

    // Do NOT mix drip and spray/rotor on same zone — pressure requirements conflict
    mixDripWithOverhead: false,

    // Group heads by plant type: lawns need different run times than shrubs
    groupByPlantType: true,

    // Recommended head count limits per zone (for wiring & flow manageability)
    maxHeads: {
      rotor: 6,
      spray: 8,
      drip_emitter: 20,
      bubbler: 8,
    },

    // Zone naming conventions
    defaultNames: {
      lawn:    'Lawn Zone',
      garden:  'Garden Bed',
      shrubs:  'Shrub Zone',
      drip:    'Drip Zone',
      mixed:   'Mixed Zone',
    },
  },

  // ─────────────────────────────────────────
  // PRESSURE & SUPPLY
  // ─────────────────────────────────────────

  pressure: {
    // Typical residential tap supply
    typicalPsi:   { min: 40, max: 80, default: 60 },
    typicalGpm:   { min: 4,  max: 20, default: 10 },

    // PSI → GPM rough estimate for hose-tap systems
    psiToGpmFactor: 0.17,

    // Warning thresholds
    lowPressureWarnPsi: 30,    // heads won't pop up or rotate reliably below this
    highPressureWarnPsi: 80,   // risk of misting, mist drift, and head damage above this

    // Minimum operating pressure at the head (after line losses)
    minAtHeadPsi: {
      rotor:        25,
      spray:        20,
      drip_emitter: 15,
      bubbler:      10,
    },

    // Pressure regulator recommended above this supply PSI for drip zones
    dripRegulatorThresholdPsi: 45,
  },

  // ─────────────────────────────────────────
  // COVERAGE RULES
  // ─────────────────────────────────────────

  coverage: {
    // Head-to-head spacing: the throw radius must equal the spacing between heads.
    // This achieves ~100% overlap, compensating for wind and distribution non-uniformity.
    // Going wider (e.g. 1.25× radius) causes dry spots; going tighter wastes water.
    spacingFactor: 1.0,  // spacing = radius × spacingFactor

    // Triangular spacing is 15% more efficient than square spacing
    // but requires more planning; square is acceptable for DIY
    preferredPattern: 'square',  // 'square' | 'triangular'

    // Minimum overlap with boundary: heads must cover at least this far past the edge
    boundaryOverlapFt: 2,

    // Head placement: keep this distance from hardscapes to avoid overspray
    minDistFromHardscapeFt: 6,

    // Minimum distance from structures (foundation, walls)
    minDistFromStructureFt: 3,
  },

  // ─────────────────────────────────────────
  // WATERING SCHEDULE
  // ─────────────────────────────────────────

  schedule: {
    // Precipitation rate (in/hr) drives run time.
    // Target application depth per session (inches):
    targetDepthIn: {
      lawn:   0.5,   // 2–3× per week in summer
      garden: 0.75,
      shrubs: 1.0,   // deeper, less frequent
      drip:   1.0,
    },

    // Run time formula: runMinutes = (targetDepthIn / precipRateIn_hr) × 60
    calcRunTime(targetDepthIn, precipRateIn_hr) {
      if (!precipRateIn_hr) return 0;
      return Math.round((targetDepthIn / precipRateIn_hr) * 60);
    },

    // Frequency recommendations (sessions per week, summer peak)
    frequencyPerWeek: {
      lawn:   3,
      garden: 3,
      shrubs: 2,
      drip:   2,
    },

    // Seasonal multiplier (relative to summer = 1.0)
    seasonalFactor: {
      spring: 0.6,
      summer: 1.0,
      fall:   0.5,
      winter: 0.2,
    },

    // Cycle-and-soak: for slopes or clay soils, split run time to avoid runoff
    cycleAndSoak: {
      slopeThresholdPct: 8,   // apply cycle-and-soak above this slope
      maxCycleMinutes:   10,  // run no more than this before soaking
      soakMinutes:       30,  // wait this long before next cycle
    },
  },

  // ─────────────────────────────────────────
  // INSTALLATION STANDARDS
  // ─────────────────────────────────────────

  installation: {
    // Pipe burial depth (inches below grade)
    burialDepthIn: {
      // No-frost climates (USDA zones 9–13)
      noFrost:   6,
      // Frost climates: below frost line, minimum 12"
      frostLine: 12,
    },

    // Valve manifold requirements
    manifold: {
      // Each zone needs a dedicated solenoid valve
      valvePerZone: true,
      // Master valve on mainline recommended when >4 zones
      masterValveThresholdZones: 4,
      // Backflow preventer required by code in most jurisdictions
      backflowPreventerRequired: true,
      // Wire gauge for valve wiring
      wireGauge: '18 AWG',
      wirePricePerFt: 0.18,
    },

    // Controller wiring
    controller: {
      // 1 zone terminal per solenoid valve + 1 common
      terminalsNeeded(zoneCount) { return zoneCount + 1; },
      // Recommend smart/WiFi controller above this zone count
      smartControllerThreshold: 4,
    },

    // Fittings: allow ~15% of pipe run length in fittings equivalent length
    fittingAllowancePct: 0.15,
  },

  // ─────────────────────────────────────────
  // DESIGN VALIDATION
  // Returns an array of warning strings for a given zone config.
  // ─────────────────────────────────────────

  validateZone(zone, supplyGpm) {
    const warnings = [];
    const { heads = [], totalGpm = 0, type } = zone;

    if (totalGpm > supplyGpm * this.zones.maxZoneGpmFactor) {
      warnings.push(`Zone GPM (${totalGpm}) exceeds ${Math.round(this.zones.maxZoneGpmFactor * 100)}% of your supply — reduce head count or radius.`);
    }

    if (totalGpm > this.zones.maxZoneGpmAbsolute) {
      warnings.push(`Zone GPM (${totalGpm}) is too high. Maximum recommended is ${this.zones.maxZoneGpmAbsolute} GPM per zone.`);
    }

    const headTypes = [...new Set(heads.map(h => h.type))];
    if (!this.zones.mixHeadTypes && headTypes.length > 1) {
      const hasDrip = headTypes.includes('drip_emitter');
      const hasOverhead = headTypes.some(t => t !== 'drip_emitter');
      if (hasDrip && hasOverhead) {
        warnings.push('Mix of drip emitters and spray/rotor heads detected. Split these into separate zones.');
      } else {
        warnings.push('Mix of rotor and spray heads detected. They have different precipitation rates — split into separate zones.');
      }
    }

    const maxCount = this.zones.maxHeads[heads[0]?.type];
    if (maxCount && heads.length > maxCount) {
      warnings.push(`Zone has ${heads.length} heads. Recommended maximum for ${heads[0].type} is ${maxCount}.`);
    }

    return warnings;
  },

};
