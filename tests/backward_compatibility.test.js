const test = require('node:test');
const assert = require('node:assert');
const SipCalculator = require('../src/calculator.js');

test('Step-Up SIP Calculator: Backward Compatibility & Regression Suite', async (t) => {

  await t.test('1. Baseline Numerical Invariance (Reference Scenario 1: ₹1L Lumpsum, ₹10K SIP, 10% Step-Up, 12% Return, 10Y)', () => {
    const result = SipCalculator.calculate({
      lumpsum: 100000,
      monthlySip: 10000,
      stepUpType: 'percent',
      stepUpValue: 10,
      compoundStepUp: true,
      returnRate: 12.0,
      years: 10
    });

    // Known locked reference values calculated with exact monthly compounding
    const expectedInvested = 2012490.95;
    const expectedCorpus = 3704364.95;
    const expectedGains = 1691874.00;

    assert.strictEqual(result.schedule.length, 10, 'Schedule must contain exactly 10 years');

    const finalRow = result.schedule[9];
    assert(Math.abs(finalRow.cumulative_invested - expectedInvested) < 0.1, 
      `Invested amount regression: expected ~${expectedInvested}, got ${finalRow.cumulative_invested}`);
    assert(Math.abs(finalRow.year_end_corpus - expectedCorpus) < 0.1, 
      `Final corpus regression: expected ~${expectedCorpus}, got ${finalRow.year_end_corpus}`);
    assert(Math.abs(finalRow.total_gains - expectedGains) < 0.1, 
      `Total gains regression: expected ~${expectedGains}, got ${finalRow.total_gains}`);
  });

  await t.test('2. Schema Contract Invariance (Ensures no existing keys are broken or renamed)', () => {
    const result = SipCalculator.calculate({
      lumpsum: 50000,
      monthlySip: 5000,
      years: 5
    });

    const requiredScheduleKeys = [
      'year',
      'monthly_sip',
      'yearly_sip',
      'cumulative_invested',
      'year_returns',
      'year_end_corpus',
      'total_gains'
    ];

    result.schedule.forEach((row, idx) => {
      requiredScheduleKeys.forEach(key => {
        assert(key in row, `Schedule row ${idx + 1} missing required key: ${key}`);
        assert(typeof row[key] === 'number', `Key ${key} must be a number`);
        assert(!isNaN(row[key]), `Key ${key} must not be NaN`);
        assert(isFinite(row[key]), `Key ${key} must be finite`);
      });
    });

    const requiredSummaryKeys = [
      'totalCorpus',
      'totalInvested',
      'totalGains',
      'lumpsumInvested',
      'sipInvested',
      'finalMonthlySip',
      'initialMonthlySip',
      'multiplier',
      'extraWealthOverFlat',
      'flatCorpus',
      'flatInvested'
    ];

    requiredSummaryKeys.forEach(key => {
      assert(key in result.summary, `Summary missing required key: ${key}`);
      assert(typeof result.summary[key] === 'number', `Summary ${key} must be a number`);
      assert(!isNaN(result.summary[key]), `Summary ${key} must not be NaN`);
    });
  });

  await t.test('3. Legacy Parameter Aliasing (Ensures older API calls & URL parameters continue working)', () => {
    // Calling with legacy snake_case and abbreviated parameter names
    const legacyResult = SipCalculator.calculate({
      lump_sum: 50000,
      sip: 8000,
      rate: 15.0,
      step_up: 500,
      step_up_type: 'value',
      tenure: 8
    });

    assert.strictEqual(legacyResult.config.lumpsum, 50000);
    assert.strictEqual(legacyResult.config.monthlySip, 8000);
    assert.strictEqual(legacyResult.config.returnRate, 15.0);
    assert.strictEqual(legacyResult.config.stepUpValue, 500);
    assert.strictEqual(legacyResult.config.stepUpType, 'value');
    assert.strictEqual(legacyResult.config.years, 8);
    assert.strictEqual(legacyResult.schedule.length, 8);
  });

  await t.test('4. Graceful Input Fallbacks (Strings, empty objects, invalid types)', () => {
    // Empty config should gracefully apply defaults
    const defaultResult = SipCalculator.calculate({});
    assert.strictEqual(defaultResult.schedule.length, SipCalculator.DEFAULTS.years);
    assert.strictEqual(defaultResult.config.lumpsum, SipCalculator.DEFAULTS.lumpsum);
    assert.strictEqual(defaultResult.config.monthlySip, SipCalculator.DEFAULTS.monthlySip);

    // Numeric strings should parse cleanly
    const stringResult = SipCalculator.calculate({
      lumpsum: '200000',
      monthlySip: '15000',
      returnRate: '11.5',
      years: '12'
    });
    assert.strictEqual(stringResult.config.lumpsum, 200000);
    assert.strictEqual(stringResult.config.monthlySip, 15000);
    assert.strictEqual(stringResult.config.returnRate, 11.5);
    assert.strictEqual(stringResult.config.years, 12);
  });

  await t.test('5. Fixed Value Step-Up Progression Verification', () => {
    const result = SipCalculator.calculate({
      lumpsum: 0,
      monthlySip: 5000,
      stepUpType: 'value',
      stepUpValue: 1000,
      compoundStepUp: true,
      returnRate: 10.0,
      years: 4
    });

    assert.strictEqual(result.schedule[0].monthly_sip, 5000, 'Year 1 SIP should be 5000');
    assert.strictEqual(result.schedule[1].monthly_sip, 6000, 'Year 2 SIP should be 6000');
    assert.strictEqual(result.schedule[2].monthly_sip, 7000, 'Year 3 SIP should be 7000');
    assert.strictEqual(result.schedule[3].monthly_sip, 8000, 'Year 4 SIP should be 8000');
  });

  await t.test('6. CSV Export Compatibility Contract', () => {
    const result = SipCalculator.calculate({
      lumpsum: 10000,
      monthlySip: 2000,
      years: 3
    });

    const csv = SipCalculator.exportScheduleToCsv(result.schedule);
    const lines = csv.split('\n');
    assert.strictEqual(lines.length, 4, 'CSV must have 1 header line + 3 year rows');

    const expectedHeader = 'Year,Monthly_SIP,Yearly_SIP_Contribution,Cumulative_Invested,Yearly_Returns,Total_Gains,Year_End_Corpus';
    assert.strictEqual(lines[0], expectedHeader, 'CSV header structure must be strictly preserved');
  });

});
