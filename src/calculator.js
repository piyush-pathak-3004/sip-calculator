/**
 * Step-Up SIP & Lumpsum Calculation Engine
 * 
 * BACKWARD COMPATIBILITY CONTRACT:
 * - All function signatures must remain additive (new optional parameters only).
 * - Existing output object keys (schedule row properties) must never be renamed or deleted.
 * - Legacy parameter aliases ('sip', 'rate', 'step_up', 'lump_sum') must be maintained indefinitely.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // CommonJS / Node environment
    module.exports = factory();
  } else {
    // Browser global
    root.SipCalculator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  /**
   * Default configuration values
   */
  var DEFAULTS = {
    lumpsum: 100000,
    monthlySip: 10000,
    stepUpType: 'percent', // 'percent' or 'value'
    stepUpValue: 10,
    compoundStepUp: true,
    returnRate: 12.0,
    years: 15,
    currency: 'INR'
  };

  /**
   * Safely normalizes input options with backward compatibility for legacy aliases
   * @param {Object} opts - User configuration options
   * @returns {Object} Normalized options
   */
  function normalizeOptions(opts) {
    opts = opts || {};

    // Backward-compatible parameter aliasing
    var rawLumpsum = opts.lumpsum !== undefined ? opts.lumpsum : (opts.lump_sum !== undefined ? opts.lump_sum : DEFAULTS.lumpsum);
    var rawMonthlySip = opts.monthlySip !== undefined ? opts.monthlySip : (opts.sip !== undefined ? opts.sip : DEFAULTS.monthlySip);
    var rawStepUpType = opts.stepUpType !== undefined ? opts.stepUpType : (opts.step_up_type !== undefined ? opts.step_up_type : DEFAULTS.stepUpType);
    var rawStepUpValue = opts.stepUpValue !== undefined ? opts.stepUpValue : (opts.step_up !== undefined ? opts.step_up : DEFAULTS.stepUpValue);
    var rawCompound = opts.compoundStepUp !== undefined ? opts.compoundStepUp : (opts.compound !== undefined ? opts.compound : DEFAULTS.compoundStepUp);
    var rawReturnRate = opts.returnRate !== undefined ? opts.returnRate : (opts.rate !== undefined ? opts.rate : DEFAULTS.returnRate);
    var rawYears = opts.years !== undefined ? opts.years : (opts.tenure !== undefined ? opts.tenure : DEFAULTS.years);

    var lumpsum = Math.max(0, parseFloat(rawLumpsum) || 0);
    var monthlySip = Math.max(0, parseFloat(rawMonthlySip) || 0);
    var stepUpType = rawStepUpType === 'value' ? 'value' : 'percent';
    var stepUpValue = Math.max(0, parseFloat(rawStepUpValue) || 0);
    var compoundStepUp = Boolean(rawCompound);
    var returnRate = Math.max(0, parseFloat(rawReturnRate) || 0);
    var years = Math.max(1, Math.min(50, parseInt(rawYears, 10) || DEFAULTS.years));
    var currency = opts.currency || DEFAULTS.currency;

    return {
      lumpsum: lumpsum,
      monthlySip: monthlySip,
      stepUpType: stepUpType,
      stepUpValue: stepUpValue,
      compoundStepUp: compoundStepUp,
      returnRate: returnRate,
      years: years,
      currency: currency
    };
  }

  /**
   * Calculate complete year-by-year schedule and summary metrics
   * @param {Object} options - Calculator parameters
   * @returns {Object} Comprehensive calculation result
   */
  function calculate(options) {
    var config = normalizeOptions(options);
    var r_monthly = (config.returnRate / 100) / 12;
    var years = config.years;
    var schedule = [];

    var current_balance = config.lumpsum;
    var total_invested = config.lumpsum;

    for (var y = 1; y <= years; y++) {
      var sip_this_year = config.monthlySip;

      if (y > 1) {
        if (config.stepUpType === 'percent') {
          if (config.compoundStepUp) {
            sip_this_year = schedule[y - 2].monthly_sip * (1 + config.stepUpValue / 100);
          } else {
            sip_this_year = config.monthlySip * (1 + (y - 1) * (config.stepUpValue / 100));
          }
        } else {
          // Fixed value increment
          if (config.compoundStepUp) {
            sip_this_year = schedule[y - 2].monthly_sip + config.stepUpValue;
          } else {
            sip_this_year = config.monthlySip + (y - 1) * config.stepUpValue;
          }
        }
      }

      var start_year_balance = current_balance;
      var yearly_sip_invested = sip_this_year * 12;

      // Month-by-month compounding (installment deposited at start of each month)
      for (var m = 0; m < 12; m++) {
        current_balance = (current_balance + sip_this_year) * (1 + r_monthly);
      }

      total_invested += yearly_sip_invested;
      var year_returns = current_balance - start_year_balance - yearly_sip_invested;
      var total_gains = current_balance - total_invested;

      // Note: All keys below are part of the public backward-compatible contract
      schedule.push({
        year: y,
        monthly_sip: sip_this_year,
        yearly_sip: yearly_sip_invested,
        cumulative_invested: total_invested,
        year_returns: Math.max(0, year_returns),
        year_end_corpus: current_balance,
        total_gains: Math.max(0, total_gains)
      });
    }

    // Benchmark comparison: Flat SIP without step-up
    var flat_balance = config.lumpsum;
    var flat_invested = config.lumpsum + (config.monthlySip * 12 * years);
    for (var m_flat = 0; m_flat < years * 12; m_flat++) {
      flat_balance = (flat_balance + config.monthlySip) * (1 + r_monthly);
    }

    var finalRow = schedule[schedule.length - 1];
    var summary = {
      totalCorpus: finalRow.year_end_corpus,
      totalInvested: finalRow.cumulative_invested,
      totalGains: finalRow.total_gains,
      lumpsumInvested: config.lumpsum,
      sipInvested: finalRow.cumulative_invested - config.lumpsum,
      finalMonthlySip: finalRow.monthly_sip,
      initialMonthlySip: config.monthlySip,
      multiplier: finalRow.year_end_corpus / (finalRow.cumulative_invested || 1),
      extraWealthOverFlat: finalRow.year_end_corpus - flat_balance,
      flatCorpus: flat_balance,
      flatInvested: flat_invested
    };

    return {
      config: config,
      schedule: schedule,
      summary: summary,
      flatCorpus: flat_balance,
      flatInvested: flat_invested
    };
  }

  /**
   * Generates CSV format for the schedule
   * @param {Array} schedule 
   * @returns {string} CSV string
   */
  function exportScheduleToCsv(schedule) {
    var headers = [
      'Year',
      'Monthly_SIP',
      'Yearly_SIP_Contribution',
      'Cumulative_Invested',
      'Yearly_Returns',
      'Total_Gains',
      'Year_End_Corpus'
    ];
    var rows = [headers.join(',')];

    schedule.forEach(function (r) {
      rows.push([
        r.year,
        r.monthly_sip.toFixed(2),
        r.yearly_sip.toFixed(2),
        r.cumulative_invested.toFixed(2),
        r.year_returns.toFixed(2),
        r.total_gains.toFixed(2),
        r.year_end_corpus.toFixed(2)
      ].join(','));
    });

    return rows.join('\n');
  }

  return {
    DEFAULTS: DEFAULTS,
    normalizeOptions: normalizeOptions,
    calculate: calculate,
    exportScheduleToCsv: exportScheduleToCsv
  };
}));
