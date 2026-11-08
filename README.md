# Step-Up SIP & Lumpsum Wealth Planner

A production-ready, interactive financial web application for modeling Systematic Investment Plans (SIPs) with annual step-up increments (percentage or fixed value), initial lumpsum compounding, and year-by-year progression.

---

## Key Features

- **Lumpsum & Monthly SIP Compounding:** Simultaneously models day-one lumpsum investment and recurring monthly SIPs.
- **Dual Step-Up Modes:** Seamlessly toggle between percentage increments (e.g., +10%/yr) and fixed-value increments (e.g., +₹1,000/yr).
- **Compounding vs. Simple Step-Up:** Choose between annual compounding step-up (standard mutual fund convention) or flat increment on the base installment.
- **Year-by-Year Schedule Table:** Granular annual table detailing active monthly SIP, annual out-of-pocket investment, yearly returns, total wealth gain, and year-end corpus.
- **Interactive Visualizations:** Powered by Chart.js (Growth Trajectory line/area chart & Corpus Distribution doughnut chart).
- **Shareable URLs:** Encodes calculation parameters into URL query parameters (`?lumpsum=100000&sip=10000&stepup=10&return=12&years=15`) with a 1-click "Share Plan" clipboard copy.
- **Data Export:** Export the complete year-by-year schedule as a CSV file (`.csv`).
- **Multi-Currency Support:** Formats in Indian Rupee (₹ Lakhs & Crores) as well as USD ($), EUR (€), and GBP (£).

---

## 1-Minute Live Publishing Guide

You can host this website for free on **GitHub Pages**, **Vercel**, **Netlify**, or **Cloudflare Pages**.

### Option A: GitHub Pages (Automated via Included CI/CD)

1. Unzip the project files or open this directory in your terminal.
2. Initialize git and push to a new GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of step-up sip website with CI/CD"
   git branch -M main
   git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```
3. In your GitHub repository:
   - Navigate to **Settings** &rarr; **Pages**.
   - Under **Build and deployment** &rarr; **Source**, select **GitHub Actions**.
4. The included `.github/workflows/ci-cd.yml` workflow will automatically:
   - Run the linting checks and the **Backward Compatibility Regression Suite**.
   - Build the production artifact.
   - Deploy the site to `https://<YOUR-GITHUB-USERNAME>.github.io/<YOUR-REPO-NAME>/`.

### Option B: Vercel

- **Via Web:** Push to GitHub, log in to [vercel.com](https://vercel.com), click **Add New Project**, select this repository, and click **Deploy**.
- **Via CLI:**
  ```bash
  npx vercel
  ```

### Option C: Netlify

- **Drag & Drop:** Visit [app.netlify.com/drop](https://app.netlify.com/drop) and drag this project folder directly onto the page.
- **Via Git:** Connect your repository on Netlify; leave build command blank or `npm run build`, and publish directory as `dist` or root `.`.

---

## CI/CD Pipeline & Backward Compatibility Architecture

This project is built from the ground up to support **continuous incremental changes without breaking backward compatibility** for existing users, shared URLs, or API consumers.

### CI/CD Workflow (`.github/workflows/ci-cd.yml`)

The pipeline runs on every **Push** and **Pull Request** to `main`:

```
               [ Pull Request / Push to main ]
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ Job 1: Test & Verify Compatibility       │
        │  1. Check JS syntax & linting             │
        │  2. Run backward-compatibility test suite │
        │  3. Verify production build artifact      │
        └─────────────────────┬─────────────────────┘
                              │ (Only on merge to main & tests pass)
                              ▼
        ┌───────────────────────────────────────────┐
        │ Job 2: Automated Deploy to GitHub Pages   │
        │  1. Configure Pages environment           │
        │  2. Upload production bundle              │
        │  3. Deploy live with atomic rollback      │
        └───────────────────────────────────────────┘
```

### How Backward Compatibility is Enforced

1. **Numerical Regression Baseline (`tests/backward_compatibility.test.js`):**
   - Locked financial benchmark cases verify that core compounding mathematics never change unexpectedly during incremental refactoring.
2. **Schema Invariance Contract:**
   - Every schedule row is guaranteed to maintain all existing keys (`year`, `monthly_sip`, `yearly_sip`, `cumulative_invested`, `year_returns`, `year_end_corpus`, `total_gains`). Any new data points added in the future must be additive.
3. **URL Parameter & Legacy Key Aliasing:**
   - Older shared links using deprecated or abbreviated query parameters (`sip` vs `monthlySip`, `rate` vs `returnRate`, `lump_sum` vs `lumpsum`) are automatically aliased and normalized with safe fallbacks.
4. **CSV Export Contract:**
   - The column header order and naming conventions in exported CSV files are regression-tested to prevent breaking external spreadsheet integrations or downstream parsers.

---

## Local Development & Testing

Run automated checks locally using Node.js (requires Node 18+):

```bash
# Run the backward-compatibility and regression test suite
npm test

# Run syntax validation
npm run lint

# Run all checks before pushing
npm run check

# Build production bundle into dist/
npm run build
```

---

## Project Structure

```
├── .github/
│   └── workflows/
│       └── ci-cd.yml              # Automated GitHub Actions CI/CD pipeline
├── src/
│   └── calculator.js              # Modular calculation engine with legacy aliasing
├── tests/
│   └── backward_compatibility.test.js # Automated regression & backward compatibility tests
├── index.html                     # Full-featured responsive web application
├── package.json                   # Scripts and project metadata
├── CONTRIBUTING.md                # Guide for adding incremental changes safely
└── README.md                      # Documentation and deployment instructions
```

---

## License

MIT License. Open-source and free for personal, educational, and commercial use.
