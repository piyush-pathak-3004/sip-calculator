/**
 * Step-Up SIP, SIP + Wait (Coast FIRE), & Inflation-Adjusted SWP Calculation Engine
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
    waitYears: 0, // Additive parameter for SIP + Wait (Coast FIRE)
    currency: 'INR'
  };

  /**
   * Default configuration values for Inflation-Adjusted SWP
   */
  var SWP_DEFAULTS = {
    currentMonthlyExpense: 50000,
    inflationRate: 6.0,
    yearsUntilSwp: 20,
    accumulatedCorpus: 30000000, // 3 Crores default
    swpReturnRate: 8.5,
    swpDurationYears: 30
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
    var rawWaitYears = opts.waitYears !== undefined ? opts.waitYears : (opts.wait_years !== undefined ? opts.wait_years : DEFAULTS.waitYears);

    var lumpsum = Math.max(0, parseFloat(rawLumpsum) || 0);
    var monthlySip = Math.max(0, parseFloat(rawMonthlySip) || 0);
    var stepUpType = rawStepUpType === 'value' ? 'value' : 'percent';
    var stepUpValue = Math.max(0, parseFloat(rawStepUpValue) || 0);
    var compoundStepUp = Boolean(rawCompound);
    var returnRate = Math.max(0, parseFloat(rawReturnRate) || 0);
    var years = Math.max(1, Math.min(50, parseInt(rawYears, 10) || DEFAULTS.years));
    var waitYears = Math.max(0, Math.min(50, parseInt(rawWaitYears, 10) || 0));
    var currency = opts.currency || DEFAULTS.currency;

    return {
      lumpsum: lumpsum,
      monthlySip: monthlySip,
      stepUpType: stepUpType,
      stepUpValue: stepUpValue,
      compoundStepUp: compoundStepUp,
      returnRate: returnRate,
      years: years,
      waitYears: waitYears,
      currency: currency
    };
  }

  /**
   * Calculate complete year-by-year schedule and summary metrics
   * Supports optional waitYears (e.g. 10-Year SIP + 10-Year Wait without SIP)
   * @param {Object} options - Calculator parameters
   * @returns {Object} Comprehensive calculation result
   */
  function calculate(options) {
    var config = normalizeOptions(options);
    var r_monthly = (config.returnRate / 100) / 12;
    var sipYears = config.years;
    var waitYears = config.waitYears;
    var totalYears = sipYears + waitYears;
    var schedule = [];

    var current_balance = config.lumpsum;
    var total_invested = config.lumpsum;
    var last_active_sip = config.monthlySip;

    for (var y = 1; y <= totalYears; y++) {
      var isWaitPhase = y > sipYears;
      var sip_this_year = 0;

      if (!isWaitPhase) {
        if (y === 1) {
          sip_this_year = config.monthlySip;
        } else {
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
        last_active_sip = sip_this_year;
      }

      var start_year_balance = current_balance;
      var yearly_sip_invested = sip_this_year * 12;

      // Month-by-month compounding (installment deposited at start of each month during SIP phase)
      for (var m = 0; m < 12; m++) {
        current_balance = (current_balance + sip_this_year) * (1 + r_monthly);
      }

      total_invested += yearly_sip_invested;
      var year_returns = current_balance - start_year_balance - yearly_sip_invested;
      var total_gains = current_balance - total_invested;

      // Note: All baseline keys below are part of the public backward-compatible contract
      schedule.push({
        year: y,
        phase: isWaitPhase ? 'Wait / Compounding' : 'Active SIP',
        monthly_sip: sip_this_year,
        yearly_sip: yearly_sip_invested,
        cumulative_invested: total_invested,
        year_returns: Math.max(0, year_returns),
        year_end_corpus: current_balance,
        total_gains: Math.max(0, total_gains)
      });
    }

    // Benchmark comparison: Flat SIP without step-up (over same active SIP years + wait years)
    var flat_balance = config.lumpsum;
    var flat_invested = config.lumpsum + (config.monthlySip * 12 * sipYears);
    for (var y_flat = 1; y_flat <= totalYears; y_flat++) {
      var m_sip = y_flat <= sipYears ? config.monthlySip : 0;
      for (var m_f = 0; m_f < 12; m_f++) {
        flat_balance = (flat_balance + m_sip) * (1 + r_monthly);
      }
    }

    var finalRow = schedule[schedule.length - 1];
    var sipPhaseEndRow = schedule[sipYears - 1];

    var summary = {
      totalCorpus: finalRow.year_end_corpus,
      corpusAtEndOfSipPhase: sipPhaseEndRow ? sipPhaseEndRow.year_end_corpus : finalRow.year_end_corpus,
      wealthAddedDuringWait: finalRow.year_end_corpus - (sipPhaseEndRow ? sipPhaseEndRow.year_end_corpus : finalRow.year_end_corpus),
      totalInvested: finalRow.cumulative_invested,
      totalGains: finalRow.total_gains,
      lumpsumInvested: config.lumpsum,
      sipInvested: finalRow.cumulative_invested - config.lumpsum,
      finalMonthlySip: finalRow.monthly_sip,
      peakActiveMonthlySip: last_active_sip,
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
   * Calculate Realistic Inflation-Adjusted SWP (Systematic Withdrawal Plan)
   * Models future monthly expense after inflation, and year-by-year withdrawal sustainability
   * @param {Object} swpOpts - SWP parameters
   * @returns {Object} SWP schedule and sustainability metrics
   */
  function calculateInflationAdjustedSwp(swpOpts) {
    swpOpts = swpOpts || {};
    var currentMonthlyExpense = Math.max(0, parseFloat(swpOpts.currentMonthlyExpense !== undefined ? swpOpts.currentMonthlyExpense : SWP_DEFAULTS.currentMonthlyExpense) || 0);
    var inflationRate = Math.max(0, parseFloat(swpOpts.inflationRate !== undefined ? swpOpts.inflationRate : SWP_DEFAULTS.inflationRate) || 0);
    var yearsUntilSwp = Math.max(0, parseInt(swpOpts.yearsUntilSwp !== undefined ? swpOpts.yearsUntilSwp : SWP_DEFAULTS.yearsUntilSwp, 10) || 0);
    var accumulatedCorpus = Math.max(0, parseFloat(swpOpts.accumulatedCorpus !== undefined ? swpOpts.accumulatedCorpus : SWP_DEFAULTS.accumulatedCorpus) || 0);
    var swpReturnRate = Math.max(0, parseFloat(swpOpts.swpReturnRate !== undefined ? swpOpts.swpReturnRate : SWP_DEFAULTS.swpReturnRate) || 0);
    var swpDurationYears = Math.max(1, Math.min(60, parseInt(swpOpts.swpDurationYears !== undefined ? swpOpts.swpDurationYears : SWP_DEFAULTS.swpDurationYears, 10) || 30));

    // Expense at the start of SWP (Year 1 of retirement / withdrawal)
    var startingSwpMonthlyExpense = currentMonthlyExpense * Math.pow(1 + inflationRate / 100, yearsUntilSwp);
    var r_monthly = (swpReturnRate / 100) / 12;

    var balance = accumulatedCorpus;
    var cumulativeWithdrawn = 0;
    var cumulativeInterestEarned = 0;
    var schedule = [];
    var depletedAtYear = null;
    var depletedAtMonth = null;

    for (var y = 1; y <= swpDurationYears; y++) {
      // Monthly withdrawal steps up each year by inflationRate to preserve purchasing power
      var monthlyWithdrawal = startingSwpMonthlyExpense * Math.pow(1 + inflationRate / 100, y - 1);
      var startBalance = balance;
      var yearWithdrawn = 0;
      var yearInterest = 0;

      for (var m = 1; m <= 12; m++) {
        if (balance <= 0) {
          if (depletedAtYear === null) {
            depletedAtYear = y;
            depletedAtMonth = (y - 1) * 12 + m;
          }
          break;
        }

        var actualWithdrawal = Math.min(balance, monthlyWithdrawal);
        balance -= actualWithdrawal;
        yearWithdrawn += actualWithdrawal;

        var interestThisMonth = balance * r_monthly;
        balance += interestThisMonth;
        yearInterest += interestThisMonth;

        if (balance <= 0.01 && depletedAtYear === null) {
          balance = 0;
          depletedAtYear = y;
          depletedAtMonth = (y - 1) * 12 + m;
        }
      }

      cumulativeWithdrawn += yearWithdrawn;
      cumulativeInterestEarned += yearInterest;

      schedule.push({
        year: y,
        ageOrTimelineYear: yearsUntilSwp + y,
        start_balance: startBalance,
        monthly_withdrawal: monthlyWithdrawal,
        annual_withdrawal: yearWithdrawn,
        interest_earned: yearInterest,
        end_balance: Math.max(0, balance),
        cumulative_withdrawn: cumulativeWithdrawn,
        status: balance > 0 ? 'Sustainable' : 'Depleted'
      });
    }

    return {
      config: {
        currentMonthlyExpense: currentMonthlyExpense,
        inflationRate: inflationRate,
        yearsUntilSwp: yearsUntilSwp,
        accumulatedCorpus: accumulatedCorpus,
        swpReturnRate: swpReturnRate,
        swpDurationYears: swpDurationYears
      },
      summary: {
        startingMonthlySwp: startingSwpMonthlyExpense,
        startingAnnualSwp: startingSwpMonthlyExpense * 12,
        finalYearMonthlySwp: schedule[schedule.length - 1].monthly_withdrawal,
        totalWithdrawn: cumulativeWithdrawn,
        totalInterestEarned: cumulativeInterestEarned,
        finalRemainingCorpus: Math.max(0, balance),
        isFullySustainable: depletedAtYear === null,
        depletedAtYear: depletedAtYear,
        yearsSustained: depletedAtYear === null ? swpDurationYears : depletedAtYear
      },
      schedule: schedule
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
    SWP_DEFAULTS: SWP_DEFAULTS,
    normalizeOptions: normalizeOptions,
    calculate: calculate,
    calculateInflationAdjustedSwp: calculateInflationAdjustedSwp,
    exportScheduleToCsv: exportScheduleToCsv
  };
}));
