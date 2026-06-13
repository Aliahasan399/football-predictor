import os
import csv
import json
from urllib.request import urlopen
from datetime import datetime

SEASONS = ["2324", "2223", "2122", "2021"]
BASE_URL = "https://www.football-data.co.uk/mmz4281"
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

def download_season(season):
    url = f"{BASE_URL}/{season}/E0.csv"
    dest = os.path.join(DATA_DIR, f"pl_{season}.csv")
    if os.path.exists(dest):
        return dest
    print(f"Downloading {season}...")
    with urlopen(url) as resp, open(dest, 'wb') as out:
        out.write(resp.read())
    return dest

def read_csv(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            clean_row = {k.strip(): v for k, v in row.items()}
            rows.append(clean_row)
    return rows

def main():
    all_matches = []
    for season in SEASONS:
        path = download_season(season)
        rows = read_csv(path)
        for row in rows:
            date_str = row.get('Date', '')
            try:
                dt = datetime.strptime(date_str, '%d/%m/%Y')
            except:
                continue
            home = row.get('HomeTeam', '')
            away = row.get('AwayTeam', '')
            try:
                fthg = int(row.get('FTHG', 0))
                ftag = int(row.get('FTAG', 0))
            except:
                fthg = ftag = 0
            ftr = row.get('FTR', '')
            all_matches.append({
                'date': dt,
                'home': home,
                'away': away,
                'fthg': fthg,
                'ftag': ftag,
                'ftr': ftr
            })
    # Sort by date
    all_matches.sort(key=lambda x: x['date'])
    # Averages
    total_home_goals = sum(m['fthg'] for m in all_matches)
    total_away_goals = sum(m['ftag'] for m in all_matches)
    num_matches = len(all_matches)
    avg_home = total_home_goals / num_matches
    avg_away = total_away_goals / num_matches
    # Team aggregates
    home_stats = {}
    away_stats = {}
    for m in all_matches:
        home = m['home']
        away = m['away']
        # Home team
        if home not in home_stats:
            home_stats[home] = {'matches': 0, 'goals_scored': 0, 'goals_conceded': 0}
        home_stats[home]['matches'] += 1
        home_stats[home]['goals_scored'] += m['fthg']
        home_stats[home]['goals_conceded'] += m['ftag']
        # Away team
        if away not in away_stats:
            away_stats[away] = {'matches': 0, 'goals_scored': 0, 'goals_conceded': 0}
        away_stats[away]['matches'] += 1
        away_stats[away]['goals_scored'] += m['ftag']
        away_stats[away]['goals_conceded'] += m['fthg']
    # Compute factors
    teams = set(home_stats.keys()) | set(away_stats.keys())
    factors = {}
    for team in teams:
        # Home factors
        if team in home_stats:
            hm = home_stats[team]['matches']
            hs = home_stats[team]['goals_scored']
            hc = home_stats[team]['goals_conceded']
            home_attack = (hs / hm) / avg_home if hm > 0 else 1.0
            home_defense = (hc / hm) / avg_home if hm > 0 else 1.0
        else:
            home_attack = home_defense = 1.0
        # Away factors
        if team in away_stats:
            am = away_stats[team]['matches']
            as_ = away_stats[team]['goals_scored']
            ac = away_stats[team]['goals_conceded']
            away_attack = (as_ / am) / avg_away if am > 0 else 1.0
            away_defense = (ac / am) / avg_away if am > 0 else 1.0
        else:
            away_attack = away_defense = 1.0
        factors[team] = {
            'home_attack': home_attack,
            'home_defense': home_defense,
            'away_attack': away_attack,
            'away_defense': away_defense
        }
    # Write JSON
    with open('data/team_factors.json', 'w') as f:
        json.dump(factors, f, indent=2)
    with open('data/averages.json', 'w') as f:
        json.dump({'avg_home_goals': avg_home, 'avg_away_goals': avg_away}, f, indent=2)
    print(f"Factors computed for {len(factors)} teams. Averages: home={avg_home:.3f}, away={avg_away:.3f}")
    print("JSON files written to data/")

if __name__ == '__main__':
    main()
