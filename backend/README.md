# Football AI Predictor - Backend

## Setup

1. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate   # Linux/Mac
   # venv\Scripts\activate    # Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Download historical data:
   ```bash
   python scripts/download_data.py
   ```
   This will download Premier League match data from football-data.co.uk into the `data/` folder.

4. Get a free API key from [football-data.org](https://www.football-data.org/client/register) (free tier, 50 calls/min).

5. Set your API key as an environment variable:
   ```bash
   export FOOTBALL_DATA_API_KEY=***
   ```
   Or create a `.env` file in the `backend/` directory with:
   ```
   FOOTBALL_DATA_API_KEY=***
   ```

6. Run the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The API will be available at http://localhost:8000

7. (Optional) Check health: http://localhost:8000/health

## API Endpoints

- `GET /matches?competition_id=2021` - Get upcoming matches with predictions.
- `GET /match/{match_id}` - Get detailed prediction and team form for a specific match.

## Notes

- The historical data is loaded on startup. Ensure the `data/` folder exists and contains CSV files.
- The model uses a Poisson distribution based on team attack/defense strengths derived from historical results.
- Predictions are updated as new results become available if you retrain factors, but this requires restarting the server or implementing a background update.
- For production, consider using a process manager (e.g., gunicorn) and secure the API key.
