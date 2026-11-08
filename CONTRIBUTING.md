# Contributing: Incremental Changes with Backward Compatibility

To maintain high stability for live users, shared bookmarks, and API consumers, all incremental changes must adhere to the following backward compatibility principles.

---

## 1. Golden Rules of Backward Compatibility

1. **Additive Changes Only:**
   - You may add new optional configuration fields, UI toggles, or new keys in output objects.
   - **Never delete or rename** existing keys in `calculate()` return values or `schedule` row objects.
2. **Preserve Default Behavior:**
   - If a caller or legacy link invokes the tool without your newly introduced parameter, the application must behave identically to the previous version.
3. **Parameter Aliasing:**
   - When introducing clearer parameter names, always map the previous names in `src/calculator.js`'s `normalizeOptions()` function so old bookmarks and API calls do not break.
4. **URL State Preservation:**
   - When adding new URL parameters, ensure `loadStateFromUrl()` falls back to defaults if the parameter is absent.
5. **Continuous Verification:**
   - Every Pull Request must pass `npm test` (`tests/backward_compatibility.test.js`) before merging.

---

## 2. Step-by-Step: Adding an Incremental Feature

### Example: Adding an "Inflation Adjustment" Feature

1. **Update `src/calculator.js`:**
   - Add the new field to `DEFAULTS`:
     ```javascript
     inflationRate: 0 // Default 0% preserves exact existing behavior
     ```
   - In `normalizeOptions()`, parse the new parameter with fallback:
     ```javascript
     var rawInflation = opts.inflationRate !== undefined ? opts.inflationRate : (opts.inflation !== undefined ? opts.inflation : DEFAULTS.inflationRate);
     ```
   - Add new output fields to `summary` or `schedule` without changing existing field names:
     ```javascript
     // Additive new property
     realCorpus: current_balance / Math.pow(1 + config.inflationRate / 100, y)
     ```
2. **Add a Regression Test in `tests/backward_compatibility.test.js`:**
   - Confirm that when `inflationRate` is omitted or `0`, existing baseline outputs match the reference numbers to the cent.
   - Confirm the new field exists and is numeric when supplied.
3. **Update UI in `index.html`:**
   - Add the input/slider with a default of 0% or an opt-in toggle so existing user habits are uninterrupted.
4. **Run Local Checks:**
   ```bash
   npm run check
   ```
5. **Commit and Push:**
   - GitHub Actions will run the test suite and deploy your changes automatically upon merge.
