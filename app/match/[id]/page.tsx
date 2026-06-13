'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Share2, TrendingUp, Activity, Swords } from 'lucide-react';

interface MatchDetail {
  match: {
    id: string;
    date: string;
    home_team: string;
    away_team: string;
    score?: { home: number | null; away: number | null };
    status: string;
  };
  prediction: {
    home_win: number;
    draw: number;
    away_win: number;
  };
  team_stats: {
    home_team: { form_last_5: number };
    away_team: { form_last_5: number };
  };
  model_data?: {
    lambda_home: number;
    lambda_away: number;
    home_attack: number;
    home_defense: number;
    away_attack: number;
    away_defense: number;
    avg_home_goals: number;
    avg_away_goals: number;
  };
}

export default function MatchDetail() {
  const params = useParams();
  const matchId = params.id as string;
  const [data, setData] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [homeAdjustment, setHomeAdjustment] = useState(1.0);

  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await axios.get(`${backendUrl}/match/${matchId}`);
        setData(res.data);
      } catch (error) {
        console.error('Error fetching match detail:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [matchId, backendUrl]);

  const shareOnFacebook = () => {
    if (!data) return;
    const shareUrl = window.location.href;
    const quote = `⚽ AI Prediction: ${data.match.home_team} vs ${data.match.away_team}\n${data.match.home_team} win: ${data.prediction.home_win.toFixed(1)}% | Draw: ${data.prediction.draw.toFixed(1)}% | ${data.match.away_team} win: ${data.prediction.away_win.toFixed(1)}%\nI think ${data.match.home_team} will win! Agree? Full analysis: ${shareUrl}`;
    const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(quote)}`;
    window.open(fbShare, '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
        <Activity className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-2xl font-bold mb-2">Match not found</h2>
        <p className="text-gray-400">Unable to load match details. Please try again later.</p>
        <a href="/" className="mt-4 text-blue-400 hover:underline">← Back to home</a>
      </div>
    );
  }

  const { match, prediction, team_stats } = data;

  const barData = [
    { name: 'Home Win', value: prediction.home_win, fill: '#3b82f6' },
    { name: 'Draw', value: prediction.draw, fill: '#eab308' },
    { name: 'Away Win', value: prediction.away_win, fill: '#ef4444' }
  ];

  // Simulate adjusted prediction on the client (optional)
  const adjustedPrediction = (() => {
    if (!data.model_data) return null;
    const { lambda_home, lambda_away, avg_home_goals, avg_away_goals } = data.model_data;
    // Adjust home lambda by homeAdjustment (affects home attack)
    const newLambdaHome = lambda_home * homeAdjustment;
    // Simple Poisson simulation
    const poisson_pmf = (k: number, lam: number) => (lam ** k) * Math.exp(-lam) / factorial(k);
    const factorial = (n: number) => n <= 1 ? 1 : n * factorial(n - 1);
    let p_home = 0, p_draw = 0, p_away = 0;
    for (let h = 0; h <= 10; h++) {
      const ph = poisson_pmf(h, newLambdaHome);
      for (let a = 0; a <= 10; a++) {
        const pa = poisson_pmf(a, lambda_away);
        const prob = ph * pa;
        if (h > a) p_home += prob;
        else if (h === a) p_draw += prob;
        else p_away += prob;
      }
    }
    return {
      home_win: p_home * 100,
      draw: p_draw * 100,
      away_win: p_away * 100
    };
  })();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <a href="/" className="text-blue-400 hover:underline text-sm mb-2 inline-block">← Back to matches</a>
            <h1 className="text-3xl font-bold mt-2">
              {match.home_team} <span className="text-gray-500 mx-2">vs</span> {match.away_team}
            </h1>
            <p className="text-gray-400">{new Date(match.date).toLocaleDateString()} • {match.status}</p>
            {match.score && (match.score.home !== null && match.score.away !== null) && (
              <p className="text-2xl font-bold mt-2">
                {match.score.home} - {match.score.away}
              </p>
            )}
          </div>
          <button
            onClick={shareOnFacebook}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share on Facebook
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Predictions Chart */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> AI Prediction
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" barCategoryGap={0}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(t) => `${t}%`} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Bar dataKey="value">
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="bg-blue-900/30 p-3 rounded">
                <div className="font-bold text-xl">{prediction.home_win.toFixed(1)}%</div>
                <div className="text-gray-400 text-sm">Home Win</div>
              </div>
              <div className="bg-yellow-900/30 p-3 rounded">
                <div className="font-bold text-xl">{prediction.draw.toFixed(1)}%</div>
                <div className="text-gray-400 text-sm">Draw</div>
              </div>
              <div className="bg-red-900/30 p-3 rounded">
                <div className="font-bold text-xl">{prediction.away_win.toFixed(1)}%</div>
                <div className="text-gray-400 text-sm">Away Win</div>
              </div>
            </div>
          </div>

          {/* Team Stats */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" /> Team Form (Last 5)
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg">{match.home_team}</h3>
                <div className="mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Avg Points (last 5)</span>
                    <span className="font-bold">{team_stats.home_team.form_last_5.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(team_stats.home_team.form_last_5 / 3) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg">{match.away_team}</h3>
                <div className="mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Avg Points (last 5)</span>
                    <span className="font-bold">{team_stats.away_team.form_last_5.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(team_stats.away_team.form_last_5 / 3) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What-If Scenario */}
        <div className="mt-8 bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Swords className="w-5 h-5" /> What-If Scenario (Coming Soon)
          </h2>
          <p className="text-gray-400 mb-4 text-sm">
            Simulate the impact of a key player injury or transfer on the match outcome.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Home team strength adjustment (due to injury/transfer)
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                defaultValue="1.0"
                onChange={(e) => setHomeAdjustment(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>-50% (major injury)</span>
                <span>{Math.round(homeAdjustment * 100)}%</span>
                <span>+50% (boost)</span>
              </div>
            </div>
            {adjustedPrediction && (
              <div className="mt-4 p-4 bg-gray-700 rounded">
                <h3 className="font-bold mb-2">Adjusted Probabilities</h3>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-blue-900/30 p-2 rounded">
                    <div className="font-bold">{adjustedPrediction.home_win.toFixed(1)}%</div>
                    <div className="text-gray-400">Home Win</div>
                  </div>
                  <div className="bg-yellow-900/30 p-2 rounded">
                    <div className="font-bold">{adjustedPrediction.draw.toFixed(1)}%</div>
                    <div className="text-gray-400">Draw</div>
                  </div>
                  <div className="bg-red-900/30 p-2 rounded">
                    <div className="font-bold">{adjustedPrediction.away_win.toFixed(1)}%</div>
                    <div className="text-gray-400">Away Win</div>
                  </div>
                </div>
              </div>
            )}
            <p className="text-gray-500 text-xs">
              Note: Adjustment calculation uses a simplified client-side Poisson model. For full accuracy, the backend will handle complex scenarios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
