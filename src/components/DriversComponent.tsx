import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import Papa from 'papaparse';

// Type definitions
interface RaceRecord {
  Driver: string;
  CarNo: string;
  Date: string;
  RaceNumber: number;
  Reaction: number;
  '60ft': number;
  '330ft': number;
  '1/8ET': number;
  '1/8MPH': number;
  Opponent: string;
  OpponentCarNo: string;
  WinLoss: string;
}

interface DriverStats {
  name: string;
  carNumber: string;
  races: number;
  wins: number;
  losses: number;
  winRate: number;
  avgReaction: number;
  avg60ft: number;
  avg330ft: number;
  avgEighthET: number;
  avgEighthMPH: number;
  bestEighthET: number;
  bestThreeThirty: number;
  bestSixtyFoot: number;
  bestReaction: number;
  bestEighthMPH: number;
  raceHistory: RaceRecord[];
}

// Custom theme colors
const COLORS = ['#FF5F5F', '#38B6FF', '#5EFF5E', '#FFDE59', '#FF66C4', '#9D66FF'];
const WIN_COLOR = '#5EFF5E';
const LOSS_COLOR = '#FF5F5F';
const GRID_COLOR = '#3F3F5A';

const DriversComponent = () => {
  const [raceData, setRaceData] = useState<RaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [driverStats, setDriverStats] = useState<DriverStats | null>(null);
  const [performanceTrend, setPerformanceTrend] = useState<any[]>([]);
  const [opponentStats, setOpponentStats] = useState<any[]>([]);

  useEffect(() => {
    // Fetch and parse the CSV file
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/drag_racing_season_data.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              setError('Error parsing CSV file');
              console.error(results.errors);
              return;
            }
            
            const parsedData = results.data as RaceRecord[];
            setRaceData(parsedData);
            
            // Extract unique drivers list
            const uniqueDrivers = Array.from(new Set(parsedData.map(record => record.Driver))).sort();
            setDrivers(uniqueDrivers);
            
            if (uniqueDrivers.length > 0) {
              setSelectedDriver(uniqueDrivers[0]);
            }
            
            setLoading(false);
          },
          error: (error: any) => {
            setError(`Error parsing CSV: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (err) {
        setError('Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Process driver stats whenever selected driver changes
  useEffect(() => {
    if (!selectedDriver || raceData.length === 0) return;
    
    const driverRaces = raceData.filter(record => record.Driver === selectedDriver);
    
    if (driverRaces.length === 0) {
      setDriverStats(null);
      setPerformanceTrend([]);
      setOpponentStats([]);
      return;
    }
    
    // Compile driver statistics
    const wins = driverRaces.filter(race => race.WinLoss === 'Win').length;
    const losses = driverRaces.filter(race => race.WinLoss === 'Loss').length;
    
    // Calculate averages, handling potential null/undefined values
    const calcAverage = (values: number[]) => 
      values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    
    const reactionTimes = driverRaces.filter(race => race.Reaction && race.Reaction > 0).map(race => race.Reaction);
    const sixtyFootTimes = driverRaces.filter(race => race['60ft'] && race['60ft'] > 0).map(race => race['60ft']);
    const threeThirtyFootTimes = driverRaces.filter(race => race['330ft'] && race['330ft'] > 0).map(race => race['330ft']);
    const eighthETTimes = driverRaces.filter(race => race['1/8ET'] && race['1/8ET'] > 0).map(race => race['1/8ET']);
    const eighthMPHSpeeds = driverRaces.filter(race => race['1/8MPH'] && race['1/8MPH'] > 0).map(race => race['1/8MPH']);

    
    // Find best times/speeds
    const bestEighthET = eighthETTimes.length > 0 ? Math.min(...eighthETTimes) : 0;
    const bestEighthMPH = eighthMPHSpeeds.length > 0 ? Math.max(...eighthMPHSpeeds) : 0;
    const bestThreeThirty = threeThirtyFootTimes.length > 0 ? Math.min(...threeThirtyFootTimes) : 0;
    const bestSixtyFoot = sixtyFootTimes.length > 0 ? Math.min(...sixtyFootTimes) : 0;
    const bestReaction = reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0;
    setDriverStats({
      name: selectedDriver,
      carNumber: driverRaces[0].CarNo,
      races: driverRaces.length,
      wins,
      losses,
      winRate: (wins / driverRaces.length) * 100,
      avgReaction: calcAverage(reactionTimes),
      avg60ft: calcAverage(sixtyFootTimes),
      avg330ft: calcAverage(threeThirtyFootTimes),
      avgEighthET: calcAverage(eighthETTimes),
      avgEighthMPH: calcAverage(eighthMPHSpeeds),
      bestEighthET,
      bestThreeThirty,
      bestEighthMPH,
      bestSixtyFoot,
      bestReaction,
      raceHistory: driverRaces
    });
    
    // Calculate performance trends by date
    const racesByDate = driverRaces.reduce((acc, race) => {
      if (!acc[race.Date]) {
        acc[race.Date] = [];
      }
      acc[race.Date].push(race);
      return acc;
    }, {} as Record<string, RaceRecord[]>);
    
    const performanceData = Object.entries(racesByDate).map(([date, races]) => {
      const dateRaceETs = races.filter(r => r['1/8ET'] && r['1/8ET'] > 0).map(r => r['1/8ET']);
      const dateRaceMPHs = races.filter(r => r['1/8MPH'] && r['1/8MPH'] > 0).map(r => r['1/8MPH']);
      const dateReactionTimes = races.filter(r => r.Reaction && r.Reaction > 0).map(r => r.Reaction);
      
      return {
        date,
        et: dateRaceETs.length > 0 ? Math.min(...dateRaceETs) : null,
        mph: dateRaceMPHs.length > 0 ? Math.max(...dateRaceMPHs) : null,
        reaction: dateReactionTimes.length > 0 ? Math.min(...dateReactionTimes) : null,
        races: races.length,
        wins: races.filter(r => r.WinLoss === 'Win').length
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setPerformanceTrend(performanceData);
    
    // Analyze performance against opponents
    const opponentData = driverRaces.reduce((acc, race) => {
      if (!acc[race.Opponent]) {
        acc[race.Opponent] = {
          opponent: race.Opponent,
          races: 0,
          wins: 0,
          losses: 0
        };
      }
      
      acc[race.Opponent].races += 1;
      if (race.WinLoss === 'Win') {
        acc[race.Opponent].wins += 1;
      } else {
        acc[race.Opponent].losses += 1;
      }
      
      return acc;
    }, {} as Record<string, { opponent: string; races: number; wins: number; losses: number; }>);
    
    const opponentDataArray = Object.values(opponentData)
      .map(data => ({
        ...data,
        winRate: (data.wins / data.races) * 100
      }))
      .sort((a, b) => b.races - a.races);
    
    setOpponentStats(opponentDataArray);
    
  }, [selectedDriver, raceData]);

  // Format functions
  const formatTime = (time: number) => time ? time.toFixed(3) : 'N/A';
  const formatMPH = (mph: number) => mph ? mph.toFixed(2) : 'N/A';
  const formatPercent = (percent: number) => {
    if (percent === 0) return '0%';
    return percent ? percent.toFixed(1) + '%' : 'N/A';
  };

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-2 rounded shadow-lg text-gray-200">
          <p className="font-semibold">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PerformanceRadarChart = () => {
    if (!driverStats) return null;
    
    // Create radar chart data
    // Normalize values between 0-100 for comparison
    const allDrivers = raceData.reduce((acc, race) => {
      if (!acc[race.Driver]) {
        acc[race.Driver] = {
          reaction: [],
          sixtyFoot: [],
          threeThirty: [],
          eighthET: [],
          eighthMPH: [],
          wins: 0,
          races: 0
        };
      }
      
      if (race.Reaction && race.Reaction > 0) acc[race.Driver].reaction.push(race.Reaction);
      if (race['60ft'] && race['60ft'] > 0) acc[race.Driver].sixtyFoot.push(race['60ft']);
      if (race['330ft'] && race['330ft'] > 0) acc[race.Driver].threeThirty.push(race['330ft']);
      if (race['1/8ET'] && race['1/8ET'] > 0) acc[race.Driver].eighthET.push(race['1/8ET']);
      if (race['1/8MPH'] && race['1/8MPH'] > 0) acc[race.Driver].eighthMPH.push(race['1/8MPH']);
      if (race.WinLoss === 'Win') acc[race.Driver].wins += 1;
      acc[race.Driver].races += 1;
      
      return acc;
    }, {} as Record<string, any>);
    
    // Find min/max values for each metric
    const findMinMax = (metric: string, accessor: (stats: any) => number[]) => {
      let min = Infinity;
      let max = -Infinity;
      
      Object.values(allDrivers).forEach(driverData => {
        const values = accessor(driverData);
        if (values.length === 0) return;
        
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        if (avg < min) min = avg;
        if (avg > max) max = avg;
      });
      
      return { min, max };
    };
    
    // For reaction, 60ft, 330ft, 1/8ET - lower is better, so we invert the scale
    // For 1/8MPH and win rate - higher is better
    const reactionRange = findMinMax('reaction', d => d.reaction);
    const sixtyFootRange = findMinMax('sixtyFoot', d => d.sixtyFoot);
    const threeThirtyRange = findMinMax('threeThirty', d => d.threeThirty);
    const eighthETRange = findMinMax('eighthET', d => d.eighthET);
    const eighthMPHRange = findMinMax('eighthMPH', d => d.eighthMPH);
    
    // Calculate normalized scores (0-100)
    const normalizeInverted = (value: number, min: number, max: number) => 
      100 - ((value - min) / (max - min) * 100);
    
    const normalizeDirectly = (value: number, min: number, max: number) => 
      ((value - min) / (max - min) * 100);
    
    const radarData = [
      {
        metric: 'Reaction',
        value: normalizeInverted(driverStats.avgReaction, reactionRange.min, reactionRange.max)
      },
      {
        metric: '60ft',
        value: normalizeInverted(driverStats.avg60ft, sixtyFootRange.min, sixtyFootRange.max)
      },
      {
        metric: '330ft',
        value: normalizeInverted(driverStats.avg330ft, threeThirtyRange.min, threeThirtyRange.max)
      },
      {
        metric: '1/8 ET',
        value: normalizeInverted(driverStats.avgEighthET, eighthETRange.min, eighthETRange.max)
      },
      {
        metric: '1/8 MPH',
        value: normalizeDirectly(driverStats.avgEighthMPH, eighthMPHRange.min, eighthMPHRange.max)
      },
      {
        metric: 'Win Rate',
        value: driverStats.winRate
      }
    ];
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
          <PolarGrid stroke={GRID_COLOR} />
          <PolarAngleAxis dataKey="metric" tick={{ fill: '#E4E4E7' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#E4E4E7' }} />
          <Radar name="Performance" dataKey="value" stroke="#9D66FF" fill="#9D66FF" fillOpacity={0.6} />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-gray-200">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-purple-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl">Loading driver data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-gray-900">Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-gray-900 text-gray-200 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">Big Dog Automotive 2024 Season Drivers</h1>
      
      {/* Navigation */}
      <div className="mb-8 flex items-center gap-4 justify-between">
        <a href="/" className="bg-gray-800 border border-gray-700 px-4 py-2 rounded hover:bg-gray-700 transition text-white">
          ← Back to Dashboard
        </a>
        
        <div className="flex items-center gap-4">
          <label htmlFor="driver-select" className="text-gray-300">Select Driver:</label>
          <div className="relative">
            <select 
              id="driver-select"
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 pr-4 text-white appearance-none"
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
            >
              {drivers.map(driver => (
                <option key={driver} value={driver}>{driver}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {driverStats ? (
        <>
          {/* Driver Stats Overview */}
          <div className="mb-8">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="text-center md:text-left flex-shrink-0 md:w-1/4">
                  <h2 className="text-3xl font-bold text-purple-400 mb-1">{driverStats.name}</h2>
                  <p className="text-xl text-gray-400 mb-4">Car #: {driverStats.carNumber}</p>
                  
                  <div className="flex flex-col gap-2 items-center md:items-start mb-4">
                    <div className="flex gap-2 items-center">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span>Wins: {driverStats.wins}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span>Losses: {driverStats.losses}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span>Win Rate: {formatPercent(driverStats.winRate)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-purple-300">Reaction Time</h3>
                    <p className="text-2xl">Avg: {formatTime(driverStats.avgReaction)} sec</p>
                    <p className="text-lg text-green-400">Best: {formatTime(driverStats.bestReaction)} sec</p>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-purple-300">60ft Time</h3>
                    <p className="text-2xl">Avg: {formatTime(driverStats.avg60ft)} sec</p>
                    <p className="text-lg text-green-400">Best: {formatTime(driverStats.bestSixtyFoot)} sec</p>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-purple-300">330ft Time</h3>
                    <p className="text-2xl">Avg: {formatTime(driverStats.avg330ft)} sec</p>
                    <p className="text-lg text-green-400">Best: {formatTime(driverStats.bestThreeThirty)} sec</p>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-purple-300">1/8 Mile ET</h3>
                    <p className="text-2xl">Avg: {formatTime(driverStats.avgEighthET)} sec</p>
                    <p className="text-lg text-green-400">Best: {formatTime(driverStats.bestEighthET)} sec</p>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-purple-300">1/8 Mile MPH</h3>
                    <p className="text-2xl">Avg: {formatMPH(driverStats.avgEighthMPH)} mph</p>
                    <p className="text-lg text-green-400">Best: {formatMPH(driverStats.bestEighthMPH)} mph</p>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-purple-300">Total Races</h3>
                    <p className="text-2xl">{driverStats.races} races</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Performance Radar Chart */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-300">Overall Performance</h2>
              <p className="text-gray-400 mb-4 text-sm">
                Scores normalized across all drivers (higher is better in all categories)
              </p>
              <div className="h-64">
                <PerformanceRadarChart />
              </div>
            </div>
            
            {/* Performance Trend */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-300">Performance Trend</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={performanceTrend}
                    margin={{ top: 5, right: 40, left: 40, bottom: -20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#E4E4E7' }}
                      stroke="#A1A1AA"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      yAxisId="left" 
                      domain={['dataMin - 0.1', 'dataMax + 0.1']} 
                      tick={{ fill: '#E4E4E7' }}
                      stroke="#A1A1AA"
                      label={{ value: 'ET', angle: -90, position: 'insideLeft', fill: '#E4E4E7', dx: -25 }}
                      tickFormatter={(value) => value.toFixed(3)}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      domain={[0, 'dataMax + 5']} 
                      tick={{ fill: '#E4E4E7' }}
                      stroke="#A1A1AA"
                      label={{ value: 'MPH', angle: 90, position: 'insideRight', fill: '#E4E4E7', dx: 25 }}
                      tickFormatter={(value) => value.toFixed(2)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(value, entry) => <span style={{ color: '#E4E4E7' }}>{value}</span>} />
                    <Line yAxisId="left" type="monotone" dataKey="et" stroke="#FF5F5F" name="Best 1/8 Mile ET" />
                    <Line yAxisId="right" type="monotone" dataKey="mph" stroke="#5EFF5E" name="Best 1/8 Mile MPH" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Opponent Analysis */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-200">Opponent Analysis</h2>
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="text-left border-b border-gray-700">
                      <th className="px-4 py-2 text-gray-300">Opponent</th>
                      <th className="px-4 py-2 text-gray-300">Races</th>
                      <th className="px-4 py-2 text-gray-300">Wins</th>
                      <th className="px-4 py-2 text-gray-300">Losses</th>
                      <th className="px-4 py-2 text-gray-300">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opponentStats.map(opponent => (
                      <tr key={opponent.opponent} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="px-4 py-2">{opponent.opponent}</td>
                        <td className="px-4 py-2">{opponent.races}</td>
                        <td className="px-4 py-2 text-green-400">{opponent.wins}</td>
                        <td className="px-4 py-2 text-red-400">{opponent.losses}</td>
                        <td className="px-4 py-2">{formatPercent(opponent.winRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Race History */}
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-200">Race History</h2>
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="text-left border-b border-gray-700">
                      <th className="px-4 py-2 text-gray-300">Date</th>
                      <th className="px-4 py-2 text-gray-300">Race #</th>
                      <th className="px-4 py-2 text-gray-300">Opponent</th>
                      <th className="px-4 py-2 text-gray-300">Result</th>
                      <th className="px-4 py-2 text-gray-300">Reaction</th>
                      <th className="px-4 py-2 text-gray-300">60ft</th>
                      <th className="px-4 py-2 text-gray-300">330ft</th>
                      <th className="px-4 py-2 text-gray-300">1/8 ET</th>
                      <th className="px-4 py-2 text-gray-300">1/8 MPH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverStats.raceHistory
                      .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
                      .map((race, index) => (
                        <tr key={index} className={`border-b border-gray-700 hover:bg-gray-700 ${
                          race.WinLoss === 'Win' ? 'bg-green-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20'
                        }`}>
                          <td className="px-4 py-2">{race.Date}</td>
                          <td className="px-4 py-2">{race.RaceNumber}</td>
                          <td className="px-4 py-2">{race.Opponent} (#{race.OpponentCarNo})</td>
                          <td className={`px-4 py-2 font-semibold ${
                            race.WinLoss === 'Win' ? 'text-green-400' : 'text-red-400'
                          }`}>{race.WinLoss}</td>
                          <td className="px-4 py-2">{formatTime(race.Reaction)}</td>
                          <td className="px-4 py-2">{formatTime(race['60ft'])}</td>
                          <td className="px-4 py-2">{formatTime(race['330ft'])}</td>
                          <td className="px-4 py-2">{formatTime(race['1/8ET'])}</td>
                          <td className="px-4 py-2">{formatMPH(race['1/8MPH'])}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center p-8 bg-gray-800 rounded-lg">
          <p className="text-xl">Select a driver to see their statistics</p>
        </div>
      )}
    </div>
  );
};

export default DriversComponent;