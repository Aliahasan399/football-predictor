import { NextResponse } from 'next/server';

// Load factors and averages
const teamFactorsPath = process.cwd() + '/data/team_factors.json';
const averagesPath = process.cwd() + '/data/averages.json';
const teamFormPath = process.cwd() + '/data/team_form.json';

let teamFactors: Record<string, { home_attack: number; home_defense: number; away_attack: number; away_defense: number }> = {};
let avgHome = 0, avgAway = 0;
let teamForm: Record<string, number> = {};

try {
  const factorsData = require(teamFactorsPath);
  teamFactors = factorsData;
  const averagesData = require(averagesPath);
  avgHome = averagesData.avg_home_goals;
  avgAway = averagesData.avg_away_goals;
  const formData = require(teamFormPath);
  teamForm = formData;
} catch (e) {
  console.error("Failed to load factor/form data:", e);
}

function poissonPMF(k: number, lam: number): number {
  if (lam < 0) lam = 0;
  if (k < 0) return 0;
  return Math.pow(lam, k) * Math.exp(-lam) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function simulate(lambdaHome: number, lambdaAway: number, maxGoals = 10): { homeWin: number; draw: number; awayWin: number } {
  let pHome = 0, pDraw = 0, pAway = 0;
  for (let h = 0; h <= maxGoals; h++) {
    const ph = poissonPMF(h, lambdaHome);
    for (let a = 0; a <= maxGoals; a++) {
      const pa = poissonPMF(a, lambdaAway);
      const prob = ph * pa;
      if (h > a) pHome += prob;
      else if (h === a) pDraw += prob;
      else pAway += prob;
    }
  }
  return { homeWin: pHome, draw: pDraw, awayWin: pAway };
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing FOOTBALL_DATA_API_KEY' }, { status: 500 });
  }

  const matchId = params.id;
  const url = `https://api.football-data.org/v4/matches/${matchId}`;

  try {
    const resp = await fetch(url, {
      headers: { 'X-Auth-Token': apiKey },
      next: { revalidate: 30 } // cache for 30 seconds
    });
    if (!resp.ok) {
      return NextResponse.json({ error: `Match not found` }, { status: 404 });
    }
    const m = await resp.json();

    const homeTeam = m.homeTeam.name;
    const awayTeam = m.awayTeam.name;
    const matchDate = new Date(m.utcDate);

    const hFactors = teamFactors[homeTeam] || { home_attack: 1, home_defense: 1, away_attack: 1, away_defense: 1 };
    const aFactors = teamFactors[awayTeam] || { home_attack: 1, home_defense: 1, away_attack: 1, away_defense: 1 };

    const lambdaHome = avgHome * hFactors.home_attack * aFactors.away_defense;
    const lambdaAway = avgAway * aFactors.away_attack * hFactors.home_defense;
    const probs = simulate(lambdaHome, lambdaAway);

    const homeForm = teamForm[homeTeam] || 0;
    const awayForm = teamForm[awayTeam] || 0;

    return NextResponse.json({
      match: {
        id: matchId,
        date: m.utcDate,
        home_team: homeTeam,
        away_team: awayTeam,
        score: m.score?.fullTime ?? { home: null, away: null },
        status: m.status
      },
      prediction: {
        home_win: Number((probs.homeWin * 100).toFixed(1)),
        draw: Number((probs.draw * 100).toFixed(1)),
        away_win: Number((probs.awayWin * 100).toFixed(1))
      },
      team_stats: {
        home_team: { form_last_5: homeForm },
        away_team: { form_last_5: awayForm }
      }
    });
  } catch (error) {
    console.error('Failed to fetch match:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
