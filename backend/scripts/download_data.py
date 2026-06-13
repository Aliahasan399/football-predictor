#!/usr/bin/env python3
import os
import requests

BASE_URL = "https://www.football-data.co.uk/mmz4281"
SEASONS = ["2324", "2223", "2122", "2021"]  # add more if desired
DEST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

def download_season(season, dest_dir):
    filename = f"E0.csv"
    url = f"{BASE_URL}/{season}/{filename}"
    dest_path = os.path.join(dest_dir, f"pl_{season}.csv")
    try:
        print(f"Downloading season {season} from {url}...")
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        with open(dest_path, 'wb') as f:
            f.write(resp.content)
        print(f"Saved to {dest_path}")
    except Exception as e:
        print(f"Failed to download season {season}: {e}")

def main():
    os.makedirs(DEST_DIR, exist_ok=True)
    for season in SEASONS:
        download_season(season, DEST_DIR)
    print("All downloads completed.")

if __name__ == "__main__":
    main()
