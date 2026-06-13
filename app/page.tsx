'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Share2, TrendingUp, Activity } from 'lucide-react';

interface Match {
  id: string;
  date: string;
  home_team: string;
  away_team: string;
  prediction: {
    home_win: number;
    draw: number;
    away_win: number;
  };
  home_team_crest?: string;
  away_team_crest?: string;
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await axios.get(`${backendUrl}/matches`);
        setMatches(res.data.matches);
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, [backendUrl]);

  const shareOnFacebook = (match: Match) => {
    const shareUrl = `${window.location.origin}/match/${match.id}`;
    const quote = `⚽ AI Prediction: ${match.home_team} vs ${match.away_team}\n${match.home_team} win: ${match.prediction.home_win}% | Draw: ${match.prediction.draw}% | ${match.away_team} win: ${match.prediction.away_win}%\nAgree? Check out the full analysis!`;
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="max-w-6xl mx-auto mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          ⚽ Football AI Predictor
        </h1>
        <p className="text-gray-400">
          Get AI-powered match predictions, trends, and insights. Share your predictions and challenge your friends!
        </p>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => {
            const data = [
              { name: 'Home Win', value: match.prediction.home_win, fill: '#3b82f6' },
              { name: 'Draw', value: match.prediction.draw, fill: '#eab308' },
              { name: 'Away Win', value: match.prediction.away_win, fill: '#ef4444' }
            ];
            return (
              <div key={match.id} className="bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-400">{match.date}</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {match.home_team} <span className="text-gray-500 mx-2">vs</span> {match.away_team}
                    </h3>
                  </div>
                  <button
                    onClick={() => shareOnFacebook(match)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full"
                    title="Share on Facebook"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Crest images (optional) */}
                {(match.home_team_crest || match.away_team_crest) && (
                  <div className="flex justify-around mb-4">
                    {match.home_team_crest && (
                      <img src={match.home_team_crest} alt={match.home_team} className="w-12 h-12 object-contain" />
                    )}
                    {match.away_team_crest && (
                      <img src={match.away_team_crest} alt={match.away_team} className="w-12 h-12 object-contain" />
                    )}
                  </div>
                )}

                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" barCategoryGap={0}>
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(t) => `${t}%`} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Bar dataKey="value">
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-blue-900/30 p-2 rounded">
                    <div className="font-bold text-lg">{match.prediction.home_win}%</div>
                    <div className="text-gray-400">Home Win</div>
                  </div>
                  <div className="bg-yellow-900/30 p-2 rounded">
                    <div className="font-bold text-lg">{match.prediction.draw}%</div>
                    <div className="text-gray-400">Draw</div>
                  </div>
                  <div className="bg-red-900/30 p-2 rounded">
                    <div className="font-bold text-lg">{match.prediction.away_win}%</div>
                    <div className="text-gray-400">Away Win</div>
                  </div>
                </div>

                <div className="mt-4 flex justify-center">
                  <a
                    href={`/match/${match.id}`}
                    className="text-blue-400 hover:text-blue-300 underline text-sm"
                  >
                    View detailed analysis →
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {matches.length === 0 && !loading && (
          <div className="text-center text-gray-500 mt-12">
            <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No upcoming matches found. Check your API key or try again later.</p>
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
        <p>Powered by AI • Data from football-data.org • Built with ❤️</p>
        <div className="mt-2">
          <a href="https://www.facebook.com/yourpage" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Follow us on Facebook
          </a>
        </div>
      </footer>
    </div>
  );
}
