import { NextResponse } from 'next/server';

// Load factors and averages at build time (static)
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

function adjustProbability(p: number, homeAdj: number): number {
  // This will be used in match detail page's what-if scenario (basic client-side adjustment)
  // Not used on server now.
  return p;
}

export async function GET(request: Request) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing FOOTBALL_DATA_API_KEY' }, { status: 500 });
  }

  const baseUrl = 'https://api.football-data.org/v4/competitions/2021/matches';
  const url = new URL(baseUrl);
  url.searchParams.set('status', 'SCHEDULED');

  try {
    const resp = await fetch(url.toString(), {
      headers: { 'X-Auth-Token': apiKey },
      next: { revalidate: 600 } // cache for 10 minutes
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `football-data error: ${resp.status}`, details: text }, { status: resp.status });
    }
    const data = await resp.json();
    const matches = data.matches || [];

    const result = matches.map(m => {
      const homeTeam = m.homeTeam.name;
      const awayTeam = m.awayTeam.name;

      const hFactors = teamFactors[homeTeam] || { home_attack: 1, home_defense: 1, away_attack: 1, away_defense: 1 };
      const aFactors = teamFactors[awayTeam] || { home_attack: 1, home_defense: 1, away_attack: 1, away_defense: 1 };

      const lambdaHome = avgHome * hFactors.home_attack * aFactors.away_defense;
      const lambdaAway = avgAway * aFactors.away_attack * hFactors.home_defense;
      const probs = simulate(lambdaHome, lambdaAway);

      return {
        id: String(m.id),
        date: m.utcDate.slice(0, 10),
        home_team: homeTeam,
        away_team: awayTeam,
        prediction: {
          home_win: Number((probs.homeWin * 100).toFixed(1)),
          draw: Number((probs.draw * 100).toFixed(1)),
          away_win: Number((probs.awayWin * 100).toFixed(1))
        },
        home_team_crest: m.homeTeam.crest,
        away_team_crest: m.awayTeam.crest
      };
    });

    return NextResponse.json({ matches: result });
  } catch (error) {
    console.error('Failed to fetch matches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
