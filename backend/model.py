import pandas as pd
import math
import os

def load_historical_data(path):
    """
    Load historical match data from a CSV file or a directory of CSVs.
    Returns a DataFrame with columns: Date, HomeTeam, AwayTeam, FTHG, FTAG, FTR.
    """
    if os.path.isdir(path):
        files = [os.path.join(path, f) for f in os.listdir(path) if f.lower().endswith('.csv')]
        if not files:
            raise ValueError(f"No CSV files found in {path}")
        dfs = []
        for f in files:
            try:
                df = pd.read_csv(f)
                dfs.append(df)
            except Exception as e:
                print(f"Warning: Could not read {f}: {e}")
        if not dfs:
            raise ValueError("No valid CSV data loaded")
        df = pd.concat(dfs, ignore_index=True)
    else:
        df = pd.read_csv(path)

    # Standardize column names: strip whitespace
    df.columns = df.columns.str.strip()
    # Required columns
    required = ['Date', 'HomeTeam', 'AwayTeam', 'FTHG', 'FTAG', 'FTR']
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}. Available: {df.columns.tolist()}")
    # Keep only required columns to minimize memory
    df = df[required].copy()
    # Parse dates, handling format DD/MM/YYYY
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    # Drop rows with invalid dates
    df = df.dropna(subset=['Date'])
    # Sort by date
    df = df.sort_values('Date').reset_index(drop=True)
    return df

def compute_team_factors(df):
    """
    Compute attack and defense factors for each team based on historical data.
    Returns: (factors_dict, avg_home_goals, avg_away_goals)
    """
    total_home_goals = df['FTHG'].sum()
    total_away_goals = df['FTAG'].sum()
    num_matches = len(df)
    avg_home_goals = total_home_goals / num_matches
    avg_away_goals = total_away_goals / num_matches

    home_group = df.groupby('HomeTeam').agg(
        home_matches=('FTHG', 'count'),
        home_goals_scored=('FTHG', 'sum'),
        home_goals_conceded=('FTAG', 'sum')
    )
    away_group = df.groupby('AwayTeam').agg(
        away_matches=('FTAG', 'count'),
        away_goals_scored=('FTAG', 'sum'),
        away_goals_conceded=('FTHG', 'sum')
    )
    teams = set(home_group.index) | set(away_group.index)
    factors = {}
    for team in teams:
        if team in home_group.index:
            hm = home_group.loc[team, 'home_matches']
            hs = home_group.loc[team, 'home_goals_scored']
            hc = home_group.loc[team, 'home_goals_conceded']
            home_attack = (hs / hm) / avg_home_goals if hm > 0 else 1.0
            home_defense = (hc / hm) / avg_home_goals if hm > 0 else 1.0
        else:
            home_attack = 1.0
            home_defense = 1.0
        if team in away_group.index:
            am = away_group.loc[team, 'away_matches']
            as_ = away_group.loc[team, 'away_goals_scored']
            ac = away_group.loc[team, 'away_goals_conceded']
            away_attack = (as_ / am) / avg_away_goals if am > 0 else 1.0
            away_defense = (ac / am) / avg_away_goals if am > 0 else 1.0
        else:
            away_attack = 1.0
            away_defense = 1.0
        factors[team] = {
            'home_attack': home_attack,
            'home_defense': home_defense,
            'away_attack': away_attack,
            'away_defense': away_defense
        }
    return factors, avg_home_goals, avg_away_goals

def poisson_pmf(k, lam):
    if lam < 0:
        lam = 0
    if k < 0:
        return 0.0
    try:
        return (lam ** k) * math.exp(-lam) / math.factorial(k)
    except OverflowError:
        return 0.0

def simulate_match(lambda_home, lambda_away, max_goals=10):
    """
    Compute probabilities of home win, draw, away win given expected goals (Poisson).
    """
    p_home_win = 0.0
    p_draw = 0.0
    p_away_win = 0.0
    for home_goals in range(0, max_goals + 1):
        ph = poisson_pmf(home_goals, lambda_home)
        for away_goals in range(0, max_goals + 1):
            pa = poisson_pmf(away_goals, lambda_away)
            prob = ph * pa
            if home_goals > away_goals:
                p_home_win += prob
            elif home_goals == away_goals:
                p_draw += prob
            else:
                p_away_win += prob
    return p_home_win, p_draw, p_away_win

def predict_match(home_team, away_team, factors, avg_home_goals, avg_away_goals, max_goals=10):
    """
    Return probabilities for home win, draw, away win.
    """
    home_factors = factors.get(home_team, {'home_attack': 1.0, 'home_defense': 1.0, 'away_attack': 1.0, 'away_defense': 1.0})
    away_factors = factors.get(away_team, {'home_attack': 1.0, 'home_defense': 1.0, 'away_attack': 1.0, 'away_defense': 1.0})
    lambda_home = avg_home_goals * home_factors['home_attack'] * away_factors['away_defense']
    lambda_away = avg_away_goals * away_factors['away_attack'] * home_factors['home_defense']
    p_home_win, p_draw, p_away_win = simulate_match(lambda_home, lambda_away, max_goals)
    return {'home_win': p_home_win, 'draw': p_draw, 'away_win': p_away_win}, lambda_home, lambda_away

def compute_lambda(home_team, away_team, factors, avg_home_goals, avg_away_goals):
    """
    Compute expected goals for home and away team.
    """
    home_factors = factors.get(home_team, {'home_attack': 1.0, 'home_defense': 1.0, 'away_attack': 1.0, 'away_defense': 1.0})
    away_factors = factors.get(away_team, {'home_attack': 1.0, 'home_defense': 1.0, 'away_attack': 1.0, 'away_defense': 1.0})
    lambda_home = avg_home_goals * home_factors['home_attack'] * away_factors['away_defense']
    lambda_away = avg_away_goals * away_factors['away_attack'] * home_factors['home_defense']
    return lambda_home, lambda_away

def get_team_form(df, team, date, window=5):
    """
    Compute average points per match over the last `window` matches before the given date.
    """
    # Ensure Date is datetime
    if not pd.is_datetime64_any_dtype(df['Date']):
        df['Date'] = pd.to_datetime(df['Date'])
    ref_date = pd.to_datetime(date)
    team_matches = df[(df['Date'] < ref_date) & ((df['HomeTeam'] == team) | (df['AwayTeam'] == team))]
    team_matches = team_matches.sort_values('Date', ascending=False).head(window)
    if len(team_matches) == 0:
        return 0.0
    points = 0
    for _, row in team_matches.iterrows():
        if row['HomeTeam'] == team:
            result = row['FTR']
            if result == 'H':
                points += 3
            elif result == 'D':
                points += 1
        else:
            result = row['FTR']
            if result == 'A':
                points += 3
            elif result == 'D':
                points += 1
    return points / len(team_matches)
