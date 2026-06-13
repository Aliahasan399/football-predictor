import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import requests
from model import load_historical_data, compute_team_factors, predict_match, get_team_form, compute_lambda, simulate_match

app = FastAPI(title="Football AI Predictor")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global data
historical_df = None
team_factors = None
avg_home_goals = None
avg_away_goals = None
last_update = None

@app.on_event("startup")
async def startup_event():
    global historical_df, team_factors, avg_home_goals, avg_away_goals, last_update
    data_path = os.getenv("HISTORICAL_DATA_PATH", "data")
    try:
        print(f"Loading historical data from: {data_path}")
        historical_df = load_historical_data(data_path)
        print(f"Loaded {len(historical_df)} historical matches.")
        team_factors, avg_home_goals, avg_away_goals = compute_team_factors(historical_df)
        last_update = pd.Timestamp.now()
        print(f"Computed factors for {len(team_factors)} teams. Averages: home={avg_home_goals:.3f}, away={avg_away_goals:.3f}")
    except Exception as e:
        print(f"ERROR during startup: {e}")
        raise

@app.get("/")
def read_root():
    return {"message": "Football AI Predictor API", "status": "ok", "data_loaded": historical_df is not None}

@app.get("/matches")
def get_upcoming_matches(competition_id: int = Query(2021, ge=1)):
    """
    Fetch scheduled matches from football-data.org and add AI predictions.
    """
    api_key = os.getenv("FOOTBALL_DATA_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="FOOTBALL_DATA_API_KEY environment variable not set")

    url = f"https://api.football-data.org/v4/competitions/{competition_id}/matches"
    params = {"status": "SCHEDULED"}
    headers = {"X-Auth-Token": api_key}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch matches from football-data.org: {str(e)}")

    matches_list = []
    for match_data in data.get("matches", []):
        home_team = match_data["homeTeam"]["name"]
        away_team = match_data["awayTeam"]["name"]
        match_id = str(match_data["id"])
        match_date = match_data["utcDate"][:10]  # YYYY-MM-DD

        # Prediction
        try:
            pred_dict, lambda_h, lambda_a = predict_match(home_team, away_team, team_factors, avg_home_goals, avg_away_goals)
            prediction = {
                "home_win": round(pred_dict["home_win"] * 100, 1),
                "draw": round(pred_dict["draw"] * 100, 1),
                "away_win": round(pred_dict["away_win"] * 100, 1)
            }
        except Exception as e:
            # Fallback to equal probabilities
            prediction = {"home_win": 33.3, "draw": 33.3, "away_win": 33.4}
            lambda_h = None
            lambda_a = None

        matches_list.append({
            "id": match_id,
            "date": match_date,
            "home_team": home_team,
            "away_team": away_team,
            "prediction": prediction,
            "lambda_home": lambda_h,
            "lambda_away": lambda_a,
            "home_team_crest": match_data["homeTeam"].get("crest"),
            "away_team_crest": match_data["awayTeam"].get("crest")
        })

    return {"matches": matches_list}

@app.get("/match/{match_id}")
def get_match_detail(match_id: str):
    """
    Return detailed prediction and stats for a specific match.
    """
    competition_id = 2021
    api_key = os.getenv("FOOTBALL_DATA_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="FOOTBALL_DATA_API_KEY not set")

    url = f"https://api.football-data.org/v4/matches/{match_id}"
    headers = {"X-Auth-Token": api_key}

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        match_data = response.json()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Match not found or error: {str(e)}")

    home_team = match_data["homeTeam"]["name"]
    away_team = match_data["awayTeam"]["name"]
    match_date = pd.to_datetime(match_data["utcDate"])

    # Compute prediction and lambdas
    try:
        lambda_home, lambda_away = compute_lambda(home_team, away_team, team_factors, avg_home_goals, avg_away_goals)
        p_home_win, p_draw, p_away_win = simulate_match(lambda_home, lambda_away)
        prediction = {
            "home_win": round(p_home_win * 100, 1),
            "draw": round(p_draw * 100, 1),
            "away_win": round(p_away_win * 100, 1)
        }
    except Exception as e:
        prediction = {"home_win": 33.3, "draw": 33.3, "away_win": 33.4}
        lambda_home = None
        lambda_away = None

    # Compute form
    home_form = get_team_form(historical_df, home_team, match_date)
    away_form = get_team_form(historical_df, away_team, match_date)

    # Build response
    response = {
        "match": {
            "id": match_id,
            "date": match_data["utcDate"],
            "home_team": home_team,
            "away_team": away_team,
            "score": match_data.get("score", {}).get("fullTime", {"home": None, "away": None}),
            "status": match_data["status"]
        },
        "prediction": prediction,
        "team_stats": {
            "home_team": {"form_last_5": round(home_form, 2)},
            "away_team": {"form_last_5": round(away_form, 2)}
        }
    }
    if lambda_home is not None and lambda_away is not None:
        response["model_data"] = {
            "lambda_home": lambda_home,
            "lambda_away": lambda_away,
            "home_attack": team_factors.get(home_team, {}).get('home_attack', 1.0),
            "home_defense": team_factors.get(home_team, {}).get('home_defense', 1.0),
            "away_attack": team_factors.get(away_team, {}).get('away_attack', 1.0),
            "away_defense": team_factors.get(away_team, {}).get('away_defense', 1.0),
            "avg_home_goals": avg_home_goals,
            "avg_away_goals": avg_away_goals
        }

    return response

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "data_loaded": historical_df is not None,
        "teams_count": len(team_factors) if team_factors else 0,
    }
