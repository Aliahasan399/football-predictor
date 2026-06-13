# Football AI Predictor 🚀

A full-stack web app that uses AI to predict football match outcomes. Built with **Next.js 14**, **FastAPI**, and a **Poisson ML model** trained on historical Premier League data. Includes social sharing to go viral on Facebook.

---

## 🌟 Features

- **Live Predictions**: AI predicts win/draw/loss probabilities for upcoming Premier League matches.
- **Beautiful UI**: Dark theme, interactive charts, responsive design.
- **Team Form**: Shows last 5 matches average points.
- **Social Sharing**: One-click share predictions to Facebook with prefilled text.
- **What-If Scenarios**: (Basic) Adjust team strength and see updated probabilities in real-time.
- **Easy Deployment**: Frontend on Vercel, backend on Railway.

---

## 🛠 Tech Stack

### Frontend
- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Recharts (charts)
- Lucide React (icons)
- Axios (API calls)

### Backend
- FastAPI (Python)
- Pandas / NumPy
- Poisson statistical model
- football-data.org API (live fixtures)

---

## 📦 Project Structure

```
football-predictor/
├── app/                         # Next.js frontend
│   ├── page.tsx                # Home: list of matches
│   └── match/
│       └── [id]/
│           └── page.tsx        # Match detail with stats
├── backend/                     # FastAPI backend
│   ├── main.py                 # API server
│   ├── model.py                # Poisson model & data loading
│   ├── scripts/
│   │   └── download_data.py    # Download historical CSVs
│   ├── data/                   # CSV files (downloaded)
│   ├── requirements.txt
│   └── README.md               # Backend setup
├── .env.local                  # Frontend env (NEXT_PUBLIC_PYTHON_BACKEND_URL)
└── README.md                   # This file
```

---

## 🚀 Quick Start

### 1. Backend Setup (Python)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate    # Windows
pip install -r requirements.txt
python scripts/download_data.py   # Downloads PL data into data/
```

Get a free API key from [football-data.org](https://www.football-data.org/client/register) (50 calls/min).

Set environment variable:

```bash
export FOOTBALL_DATA_API_KEY=your_key_here
# Or create a .env file in backend/ with that line.
```

Run the server:

```bash
uvicorn main:app --reload --port 8000
```

Test: http://localhost:8000/matches (should return JSON with upcoming matches and predictions).

### 2. Frontend Setup (Node.js)

```bash
cd football-predictor
npm install
```

If you get peer dependency errors, run:

```bash
npm install --legacy-peer-deps
```

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_PYTHON_BACKEND_URL=http://localhost:8000
```

Run the dev server:

```bash
npm run dev
```

Open http://localhost:3000 – you should see the match list!

### 3. Deploy to Production (Optional)

**Frontend** → Vercel (import GitHub repo, set `NEXT_PUBLIC_PYTHON_BACKEND_URL` to your Railway URL).

**Backend** → Railway (or any Python host). Set `FOOTBALL_DATA_API_KEY` in environment. Build command: `pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port $PORT`.

---

## 🤖 How the AI Works

- **Historical Data**: Downloads Premier League match results from football-data.co.uk (seasons 2021–2024).
- **Team Strengths**: Computes attack/defense factors for each team (home/away) relative to league average.
- **Expected Goals**: Uses factors to predict lambda (expected goals) for home and away teams.
- **Poisson Distribution**: Simulates match outcomes to get probabilities for home win, draw, away win.
- **Live Fixtures**: Fetches upcoming matches from football-data.org and applies the model.

---

## 📱 Facebook Viral Strategy

### Goal
Drive traffic via user shares. When a user clicks "Share on Facebook", a post appears with the AI prediction and a link back to your site.

### 1. Create a Facebook Page
- Name: e.g., "Football AI Predictor"
- Add description, profile picture (ball + AI icon), cover image (maybe a stylized pitch).

### 2. Fill Page Content
- Pin a post: "⚽ Predicted today: [Team] to beat [Team] with X% confidence! Check your team's fate → [link]"
- Add call-to-action button: "Visit Website" linking to your Vercel URL.

### 3. Automated Daily Posts (Optional)
Write a script that:
- Calls your `/matches` endpoint every morning.
- Picks the most interesting upset prediction (closest to 50/50 or highest confidence underdog).
- Posts an image (generated with chart) and text to your Facebook Page using Graph API.

We provide a sample script in `marketing/facebook_auto_post.py`. You'll need a Page Access Token with `pages_manage_posts` permission.

### 4. Sample Post Templates

```
⚽ AI MATCH PREDICTION
{Home Team} vs {Away Team}
{Date}

🏠 Home Win: {H}%
🤝 Draw: {D}%
✈️ Away Win: {A}%

Our AI says {HomeTeam} are favorites! Do you agree? See full analysis and more predictions:
👉 {url}
```

**Hashtags**: #Football #Soccer #Predictions #AIPicks #PremierLeague

### 5. Encourage Sharing
- On your site: "Share your prediction to Facebook and challenge your friends!"
- Show a leaderboard of users with most accurate predictions (future feature – requires login).

---

## 🛠 Future Enhancements

- Multiple leagues (La Liga, Serie A, etc.)
- User accounts and prediction leaderboards
- Live in-game probability updates
- More advanced ML (XGBoost, neural nets)
- Mobile app (React Native)
- Discord/Twitter bots

---

## 📄 License

MIT – feel free to modify and use.

---

**Enjoy building, and may your predictions be accurate!** ⚽🤖
