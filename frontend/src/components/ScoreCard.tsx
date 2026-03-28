import type { Scorecard as ScorecardType } from '../types';

interface Props {
  scorecard: ScorecardType;
}

export default function Scorecard({ scorecard }: Props) {
  return (
    <div className="space-y-6">
      {scorecard.innings.map((inn) => (
        <div key={inn.innings_number} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {/* Innings header */}
          <div className="px-5 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-display text-white text-lg">{inn.batting_team}</h3>
              <p className="text-blue-300/50 text-xs">Innings {inn.innings_number} · bowling: {inn.bowling_team}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-[var(--blue-400)] text-xl">{inn.total}</p>
              <p className="text-blue-300/50 text-xs">extras: {inn.extras}</p>
            </div>
          </div>

          {/* Batting table */}
          {inn.batting.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-blue-300/40 text-xs border-b border-white/5">
                    <th className="text-left px-5 py-2 font-medium">Batter</th>
                    <th className="px-3 py-2 font-medium text-right">R</th>
                    <th className="px-3 py-2 font-medium text-right">B</th>
                    <th className="px-3 py-2 font-medium text-right">4s</th>
                    <th className="px-3 py-2 font-medium text-right">6s</th>
                    <th className="px-3 py-2 font-medium text-right">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {inn.batting.map((b, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-white font-medium">{b.player_name}</p>
                        {b.is_out && b.dismissal_type && (
                          <p className="text-blue-300/40 text-xs">
                            {b.dismissal_type}
                            {b.bowler_name ? ` b. ${b.bowler_name}` : ''}
                          </p>
                        )}
                        {!b.is_out && <p className="text-green-400/70 text-xs">not out</p>}
                      </td>
                      <td className="px-3 py-3 text-right font-display text-white">{b.runs_scored}</td>
                      <td className="px-3 py-3 text-right text-blue-300/60">{b.balls_faced}</td>
                      <td className="px-3 py-3 text-right text-blue-300/60">{b.fours}</td>
                      <td className="px-3 py-3 text-right text-blue-300/60">{b.sixes}</td>
                      <td className="px-3 py-3 text-right text-blue-300/60">
                        {b.balls_faced > 0 ? ((b.runs_scored / b.balls_faced) * 100).toFixed(0) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bowling table */}
          {inn.bowling.length > 0 && (
            <>
              <div className="px-5 py-2 bg-white/3 border-t border-b border-white/5">
                <p className="text-blue-300/40 text-xs font-medium uppercase tracking-wide">Bowling</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-blue-300/40 text-xs border-b border-white/5">
                      <th className="text-left px-5 py-2 font-medium">Bowler</th>
                      <th className="px-3 py-2 font-medium text-right">O</th>
                      <th className="px-3 py-2 font-medium text-right">R</th>
                      <th className="px-3 py-2 font-medium text-right">W</th>
                      <th className="px-3 py-2 font-medium text-right">Wd</th>
                      <th className="px-3 py-2 font-medium text-right">Nb</th>
                      <th className="px-3 py-2 font-medium text-right">Eco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inn.bowling.map((b, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-5 py-3 text-white font-medium">{b.player_name}</td>
                        <td className="px-3 py-3 text-right text-blue-300/60">{b.overs_bowled}</td>
                        <td className="px-3 py-3 text-right text-blue-300/60">{b.runs_given}</td>
                        <td className="px-3 py-3 text-right font-display text-white">{b.wickets_taken}</td>
                        <td className="px-3 py-3 text-right text-blue-300/60">{b.wides}</td>
                        <td className="px-3 py-3 text-right text-blue-300/60">{b.no_balls}</td>
                        <td className="px-3 py-3 text-right text-blue-300/60">
                          {b.overs_bowled > 0 ? (b.runs_given / b.overs_bowled).toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}