import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
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

interface LeaderboardEntry {
  driver: string;
  carNo: string;
  value: number;
  date?: string;
  opponent?: string;
}

interface RelationshipData {
  x: number;
  y: number;
  z: number;
  driver: string;
}

// Custom theme colors
const COLORS = ['#FF5F5F', '#38B6FF', '#5EFF5E', '#FFDE59', '#FF66C4', '#9D66FF', '#FF914D', '#87CEEB'];
const GRID_COLOR = '#3F3F5A';

const StatisticsComponent = () => {
  const [raceData, setRaceData] = useState<RaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Leaderboards
  const [bestET, setBestET] = useState<LeaderboardEntry[]>([]);
  const [topSpeed, setTopSpeed] = useState<LeaderboardEntry[]>([]);
  const [bestReaction, setBestReaction] = useState<LeaderboardEntry[]>([]);
  const [best60ft, setBest60ft] = useState<LeaderboardEntry[]>([]);
  const [mostWins, setMostWins] = useState<LeaderboardEntry[]>([]);
  const [bestWinRate, setBestWinRate] = useState<LeaderboardEntry[]>([]);
  
  // Advanced Stats
  const [raceCountByDate, setRaceCountByDate] = useState<any[]>([]);
  const [reactionVsET, setReactionVsET] = useState<RelationshipData[]>([]);
  const [sixtyVsET, setSixtyVsET] = useState<RelationshipData[]>([]);
  const [consistencyRanking, setConsistencyRanking] = useState<LeaderboardEntry[]>([]);
  const [performanceByTime, setPerformanceByTime] = useState<any[]>([]);
  const [winFactors, setWinFactors] = useState<any[]>([]);
  const [heatMap, setHeatMap] = useState<any[]>([]);
  const [improvementRanking, setImprovementRanking] = useState<LeaderboardEntry[]>([]);
  const [mphImprovementRanking, setMphImprovementRanking] = useState<LeaderboardEntry[]>([]);

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
            processStatistics(parsedData);
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

      // Calculate all statistics
  const processStatistics = (data: RaceRecord[]) => {
    // Sort data by date to aid in time-based analysis
    const sortedByDate = [...data].sort((a, b) => 
      new Date(a.Date).getTime() - new Date(b.Date).getTime()
    );
    
    // Best ET (lowest time)
    const etLeaders = data
      .filter(race => race['1/8ET'] && race['1/8ET'] > 0)
      .sort((a, b) => a['1/8ET'] - b['1/8ET'])
      .slice(0, 10)
      .map(race => ({
        driver: race.Driver,
        carNo: race.CarNo,
        value: race['1/8ET'],
        date: race.Date,
        opponent: race.Opponent
      }));
    setBestET(etLeaders);
    
    // Top Speed (highest MPH)
    const speedLeaders = data
      .filter(race => race['1/8MPH'] && race['1/8MPH'] > 0)
      .sort((a, b) => b['1/8MPH'] - a['1/8MPH'])
      .slice(0, 10)
      .map(race => ({
        driver: race.Driver,
        carNo: race.CarNo,
        value: race['1/8MPH'],
        date: race.Date,
        opponent: race.Opponent
      }));
    setTopSpeed(speedLeaders);
    
    // Best Reaction Time (lowest, but above 0)
    const reactionLeaders = data
      .filter(race => race.Reaction && race.Reaction > 0.001) // Filter out potential false/incorrect readings
      .sort((a, b) => a.Reaction - b.Reaction)
      .slice(0, 10)
      .map(race => ({
        driver: race.Driver,
        carNo: race.CarNo,
        value: race.Reaction,
        date: race.Date,
        opponent: race.Opponent
      }));
    setBestReaction(reactionLeaders);
    
    // Best 60ft Time (lowest)
    const sixtyFootLeaders = data
      .filter(race => race['60ft'] && race['60ft'] > 0)
      .sort((a, b) => a['60ft'] - b['60ft'])
      .slice(0, 10)
      .map(race => ({
        driver: race.Driver,
        carNo: race.CarNo,
        value: race['60ft'],
        date: race.Date,
        opponent: race.Opponent
      }));
    setBest60ft(sixtyFootLeaders);
    
    // Most Wins
    const winsByDriver = data.reduce((acc, race) => {
      if (race.WinLoss === 'Win') {
        if (!acc[race.Driver]) {
          acc[race.Driver] = {
            driver: race.Driver,
            carNo: race.CarNo,
            wins: 0
          };
        }
        acc[race.Driver].wins += 1;
      }
      return acc;
    }, {} as Record<string, { driver: string; carNo: string; wins: number; }>);
    
    const winsLeaderboard = Object.values(winsByDriver)
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)
      .map(entry => ({
        driver: entry.driver,
        carNo: entry.carNo,
        value: entry.wins
      }));
    setMostWins(winsLeaderboard);
    
    // Best Win Rate (minimum 3 races)
    const driverStats = data.reduce((acc, race) => {
      if (!acc[race.Driver]) {
        acc[race.Driver] = {
          driver: race.Driver,
          carNo: race.CarNo,
          wins: 0,
          races: 0
        };
      }
      
      acc[race.Driver].races += 1;
      if (race.WinLoss === 'Win') {
        acc[race.Driver].wins += 1;
      }
      
      return acc;
    }, {} as Record<string, { driver: string; carNo: string; wins: number; races: number; }>);
    
    const winRateLeaderboard = Object.values(driverStats)
      .filter(stats => stats.races >= 3) // Minimum race threshold
      .map(stats => ({
        driver: stats.driver,
        carNo: stats.carNo,
        value: (stats.wins / stats.races) * 100,
        races: stats.races
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    
    setBestWinRate(winRateLeaderboard);
    
    // Race count by date
    const racesByDate = data.reduce((acc, race) => {
      const date = race.Date;
      if (!acc[date]) {
        acc[date] = {
          date,
          count: 0
        };
      }
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, { date: string; count: number; }>);
    
    const raceCountData = Object.values(racesByDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setRaceCountByDate(raceCountData);
    
    // Correlation data: Reaction Time vs ET
    const reactionETData = data
      .filter(race => race.Reaction && race.Reaction > 0 && race['1/8ET'] && race['1/8ET'] > 0)
      .map(race => ({
        x: race.Reaction,
        y: race['1/8ET'],
        z: race['1/8MPH'] || 100, // Size indicator
        driver: race.Driver
      }));
    setReactionVsET(reactionETData);
    
    // Correlation data: 60ft vs ET
    const sixtyETData = data
      .filter(race => race['60ft'] && race['60ft'] > 0 && race['1/8ET'] && race['1/8ET'] > 0)
      .map(race => ({
        x: race['60ft'],
        y: race['1/8ET'],
        z: race['1/8MPH'] || 100, // Size indicator
        driver: race.Driver
      }));
    setSixtyVsET(sixtyETData);
    
    // Consistency Rankings (lowest standard deviation in ET times, min 3 races)
    const driverETStats = data
      .filter(race => race['1/8ET'] && race['1/8ET'] > 0)
      .reduce((acc, race) => {
        if (!acc[race.Driver]) {
          acc[race.Driver] = {
            driver: race.Driver,
            carNo: race.CarNo,
            etTimes: []
          };
        }
        
        acc[race.Driver].etTimes.push(race['1/8ET']);
        return acc;
      }, {} as Record<string, { driver: string; carNo: string; etTimes: number[]; }>);
    
    // Calculate standard deviation for each driver's ET times
    const consistencyLeaderboard = Object.values(driverETStats)
      .filter(stats => stats.etTimes.length >= 3) // Minimum race threshold
      .map(stats => {
        const mean = stats.etTimes.reduce((sum, val) => sum + val, 0) / stats.etTimes.length;
        const variance = stats.etTimes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / stats.etTimes.length;
        const stdDev = Math.sqrt(variance);
        
        return {
          driver: stats.driver,
          carNo: stats.carNo,
          value: stdDev,
          races: stats.etTimes.length
        };
      })
      .sort((a, b) => a.value - b.value) // Lowest std dev first (most consistent)
      .slice(0, 6);
    
    setConsistencyRanking(consistencyLeaderboard);
    
    // Performance by time of day analysis (assuming race number approximates time of day)
    const performanceByRaceNumber = data.reduce((acc, race) => {
      const raceNumber = Math.min(10, race.RaceNumber || 0); // Cap at 10 races per day
      if (!acc[raceNumber]) {
        acc[raceNumber] = {
          raceNumber,
          totalET: 0,
          totalReaction: 0,
          totalMPH: 0,
          count: 0
        };
      }
      
      if (race['1/8ET'] && race['1/8ET'] > 0) {
        acc[raceNumber].totalET += race['1/8ET'];
        acc[raceNumber].count += 1;
      }
      
      if (race.Reaction && race.Reaction > 0) {
        acc[raceNumber].totalReaction += race.Reaction;
      }
      
      if (race['1/8MPH'] && race['1/8MPH'] > 0) {
        acc[raceNumber].totalMPH += race['1/8MPH'];
      }
      
      return acc;
    }, {} as Record<number, any>);
    
    const timePerformanceData = Object.values(performanceByRaceNumber)
      .filter(item => item.count > 0)
      .map(item => ({
        raceNumber: item.raceNumber,
        avgET: item.totalET / item.count,
        avgReaction: item.totalReaction / item.count,
        avgMPH: item.totalMPH / item.count,
        count: item.count
      }))
      .sort((a, b) => a.raceNumber - b.raceNumber);
    
    setPerformanceByTime(timePerformanceData);
    
    // Win factors analysis
    const winAnalysis = {
      betterReaction: 0,
      better60ft: 0,
      better330: 0,
      betterMPH: 0,
      totalComparisons: 0
    };
    
    // Group races by race date and number to pair competitors
    const raceGroups = data.reduce((acc, race) => {
      const key = `${race.Date}-${race.RaceNumber}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(race);
      return acc;
    }, {} as Record<string, RaceRecord[]>);
    
    // Compare factors between winner and loser
    Object.values(raceGroups).forEach(group => {
      if (group.length !== 2) return; // Skip if not exactly 2 racers
      
      const winner = group.find(r => r.WinLoss === 'Win');
      const loser = group.find(r => r.WinLoss === 'Loss');
      
      if (!winner || !loser) return;
      
      winAnalysis.totalComparisons += 1;
      
      if (winner.Reaction && loser.Reaction && winner.Reaction < loser.Reaction) {
        winAnalysis.betterReaction += 1;
      }
      
      if (winner['60ft'] && loser['60ft'] && winner['60ft'] < loser['60ft']) {
        winAnalysis.better60ft += 1;
      }
      
      if (winner['330ft'] && loser['330ft'] && winner['330ft'] < loser['330ft']) {
        winAnalysis.better330 += 1;
      }
      
      if (winner['1/8MPH'] && loser['1/8MPH'] && winner['1/8MPH'] > loser['1/8MPH']) {
        winAnalysis.betterMPH += 1;
      }
    });
    
    // Convert to percentage-based chart data
    const winFactorsData = [
      {
        name: 'Better Reaction',
        value: (winAnalysis.betterReaction / winAnalysis.totalComparisons) * 100
      },
      {
        name: 'Better 60ft',
        value: (winAnalysis.better60ft / winAnalysis.totalComparisons) * 100
      },
      {
        name: 'Better 330ft',
        value: (winAnalysis.better330 / winAnalysis.totalComparisons) * 100
      },
      {
        name: 'Higher MPH',
        value: (winAnalysis.betterMPH / winAnalysis.totalComparisons) * 100
      }
    ];
    
    setWinFactors(winFactorsData);
    
    // Heat map data for performance patterns
    // Group by date and time slots
    const heatMapData: Array<{day: string, hour: number, value: number}> = [];
    
    // Get unique dates
    const uniqueDates = Array.from(new Set(data.map(race => race.Date))).sort();
    
    // For each date, bin race times (using race number as proxy for time of day)
    uniqueDates.forEach((date, dateIndex) => {
      const dayRaces = data.filter(r => r.Date === date);
      
      // Create bins for race numbers (treat as hours of the day for visualization)
      const bins: Record<number, number[]> = {};
      for (let i = 1; i <= 10; i++) {
        bins[i] = [];
      }
      
      // Group ETs by race number
      dayRaces.forEach(race => {
        const hour = Math.min(10, race.RaceNumber || 1);
        if (race['1/8ET'] && race['1/8ET'] > 0) {
          bins[hour].push(race['1/8ET']);
        }
      });
      
      // Calculate average ET for each hour and add to heat map
      Object.entries(bins).forEach(([hour, times]) => {
        if (times.length > 0) {
          const avgET = times.reduce((sum, time) => sum + time, 0) / times.length;
          heatMapData.push({
            day: date,
            hour: parseInt(hour),
            value: avgET
          });
        }
      });
    });
    
    setHeatMap(heatMapData);
    
    // Driver improvement over time analysis
    const driverProgress = data.reduce((acc, race) => {
      if (!race['1/8ET'] || race['1/8ET'] <= 0) return acc;
      
      if (!acc[race.Driver]) {
        acc[race.Driver] = {
          driver: race.Driver,
          carNo: race.CarNo,
          runs: []
        };
      }
      
      acc[race.Driver].runs.push({
        date: race.Date,
        et: race['1/8ET']
      });
      
      return acc;
    }, {} as Record<string, { driver: string; carNo: string; runs: Array<{date: string; et: number}> }>);
    
    // Calculate improvement rate for each driver
    const improvementData = Object.values(driverProgress)
      .filter(driver => driver.runs.length >= 4) // Need minimum number of runs for trend
      .map(driver => {
        // Sort runs by date
        const sortedRuns = [...driver.runs].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Get first and last 2 runs to compare
        const firstRuns = sortedRuns.slice(0, 2);
        const lastRuns = sortedRuns.slice(-2);
        
        const earlyAvg = firstRuns.reduce((sum, run) => sum + run.et, 0) / firstRuns.length;
        const lateAvg = lastRuns.reduce((sum, run) => sum + run.et, 0) / lastRuns.length;
        
        // Calculate improvement (negative is better)
        const improvement = lateAvg - earlyAvg;
        const [first, last] = driver.driver.split(' ');
        const displayName = last ? `${first} ${last[0]}. ` : first; // Handle single-word names
        
        return {
          driver: displayName,
          carNo: driver.carNo,
          value: improvement,
          // Negative values represent improvement (lower ET is better)
          improvementPct: ((earlyAvg - lateAvg) / earlyAvg) * 100
        };
      })
      .sort((a, b) => a.value - b.value) // Sort by most improved (most negative change)
      .slice(0, 10);
    
    setImprovementRanking(improvementData);
    
    // Driver MPH improvement over time analysis
    const driverMphProgress = data.reduce((acc, race) => {
      if (!race['1/8MPH'] || race['1/8MPH'] <= 0) return acc;
      
      if (!acc[race.Driver]) {
        acc[race.Driver] = {
          driver: race.Driver,
          carNo: race.CarNo,
          runs: []
        };
      }
      
      acc[race.Driver].runs.push({
        date: race.Date,
        mph: race['1/8MPH']
      });
      
      return acc;
    }, {} as Record<string, { driver: string; carNo: string; runs: Array<{date: string; mph: number}> }>);
    
    // Calculate MPH improvement rate for each driver
    const mphImprovementData = Object.values(driverMphProgress)
      .filter(driver => driver.runs.length >= 4) // Need minimum number of runs for trend
      .map(driver => {
        // Sort runs by date
        const sortedRuns = [...driver.runs].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Get first and last 2 runs to compare
        const firstRuns = sortedRuns.slice(0, 2);
        const lastRuns = sortedRuns.slice(-2);
        
        const earlyAvg = firstRuns.reduce((sum, run) => sum + run.mph, 0) / firstRuns.length;
        const lateAvg = lastRuns.reduce((sum, run) => sum + run.mph, 0) / lastRuns.length;
        
        // Calculate improvement (positive is better for MPH)
        const improvement = lateAvg - earlyAvg;
        const [first, last] = driver.driver.split(' ');
        const displayName = last ? `${first} ${last[0]}. ` : first; // Handle single-word names
        return {
          driver: displayName,
          carNo: driver.carNo,
          value: improvement,
          // Positive values represent improvement (higher MPH is better)
          improvementPct: ((lateAvg - earlyAvg) / earlyAvg) * 100
        };
      })
      .sort((a, b) => b.value - a.value) // Sort by most improved (most positive change for MPH)
      .slice(0, 10);
    
    setMphImprovementRanking(mphImprovementData);
  };

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-2 rounded shadow-lg text-gray-200">
          <p className="font-semibold">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color || '#fff' }}>
              {`${entry.name}: ${typeof entry.value === 'number' && !isNaN(entry.value) ? 
                (entry.name.toLowerCase().includes('percent') || entry.name.includes('%')) ? 
                  `${entry.value.toFixed(1)}%` : 
                  entry.name.toLowerCase().includes('time') || entry.name.toLowerCase().includes('et') || entry.name.toLowerCase().includes('reaction') || entry.name.toLowerCase().includes('60ft') ? 
                    entry.value.toFixed(3) : 
                    entry.value.toFixed(1)
                : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const TimeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-2 rounded shadow-lg text-gray-200">
          <p className="font-semibold">Race #{payload[0].payload.raceNumber}</p>
          <p>Avg ET: {payload[0].payload.avgET.toFixed(3)} sec</p>
          <p>Avg Reaction: {payload[0].payload.avgReaction.toFixed(3)} sec</p>
          <p>Avg MPH: {payload[0].payload.avgMPH.toFixed(2)}</p>
          <p>Race Count: {payload[0].payload.count}</p>
        </div>
      );
    }
    return null;
  };
  
  const HeatMapTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-700 p-2 rounded shadow-lg text-gray-200">
          <p className="font-semibold">{data.day}</p>
          <p>Race #{data.hour}</p>
          <p>Avg ET: {data.value.toFixed(3)} sec</p>
        </div>
      );
    }
    return null;
  };

  const ScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-700 p-2 rounded shadow-lg text-gray-200">
          <p className="font-semibold">{data.driver}</p>
          <p>Reaction: {data.x.toFixed(4)} sec</p>
          <p>1/8 ET: {data.y.toFixed(4)} sec</p>
          <p>1/8 MPH: {data.z.toFixed(2)} mph</p>
        </div>
      );
    }
    return null;
  };

  const SixtyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-700 p-2 rounded shadow-lg text-gray-200">
          <p className="font-semibold">{data.driver}</p>
          <p>60ft: {data.x.toFixed(4)} sec</p>
          <p>1/8 ET: {data.y.toFixed(4)} sec</p>
          <p>1/8 MPH: {data.z.toFixed(2)} mph</p>
        </div>
      );
    }
    return null;
  };

  // Format functions
  const formatTime = (time: number) => time.toFixed(3);
  const formatSpeed = (speed: number) => speed.toFixed(2);
  const formatPercent = (pct: number) => pct.toFixed(1);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-gray-200">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-purple-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl">Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-gray-900">Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-gray-900 text-gray-200 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">Season Statistics</h1>
      
      {/* Track Records Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-6 text-purple-400 border-b border-gray-700 pb-2">Track Records</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Best ET */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-blue-400">Fastest 1/8 Mile ET</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left border-b border-gray-700">
                    <th className="px-2 py-2 text-gray-300">Rank</th>
                    <th className="px-2 py-2 text-gray-300">Driver</th>
                    <th className="px-2 py-2 text-gray-300">ET (sec)</th>
                    <th className="px-2 py-2 text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {bestET.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="px-2 py-2 font-bold">{index + 1}</td>
                      <td className="px-2 py-2">{entry.driver} (#{entry.carNo})</td>
                      <td className="px-2 py-2 font-semibold text-blue-400">{formatTime(entry.value)}</td>
                      <td className="px-2 py-2">{entry.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Top Speed */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-green-400">Top 1/8 Mile Speed</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left border-b border-gray-700">
                    <th className="px-2 py-2 text-gray-300">Rank</th>
                    <th className="px-2 py-2 text-gray-300">Driver</th>
                    <th className="px-2 py-2 text-gray-300">MPH</th>
                    <th className="px-2 py-2 text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {topSpeed.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="px-2 py-2 font-bold">{index + 1}</td>
                      <td className="px-2 py-2">{entry.driver} (#{entry.carNo})</td>
                      <td className="px-2 py-2 font-semibold text-green-400">{formatSpeed(entry.value)}</td>
                      <td className="px-2 py-2">{entry.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Best Reaction Time */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-yellow-400">Best Reaction Time</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left border-b border-gray-700">
                    <th className="px-2 py-2 text-gray-300">Rank</th>
                    <th className="px-2 py-2 text-gray-300">Driver</th>
                    <th className="px-2 py-2 text-gray-300">Time (sec)</th>
                    <th className="px-2 py-2 text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {bestReaction.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="px-2 py-2 font-bold">{index + 1}</td>
                      <td className="px-2 py-2">{entry.driver} (#{entry.carNo})</td>
                      <td className="px-2 py-2 font-semibold text-yellow-400">{formatTime(entry.value)}</td>
                      <td className="px-2 py-2">{entry.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Best 60ft Time */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-pink-400">Best 60ft Time</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left border-b border-gray-700">
                    <th className="px-2 py-2 text-gray-300">Rank</th>
                    <th className="px-2 py-2 text-gray-300">Driver</th>
                    <th className="px-2 py-2 text-gray-300">Time (sec)</th>
                    <th className="px-2 py-2 text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {best60ft.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="px-2 py-2 font-bold">{index + 1}</td>
                      <td className="px-2 py-2">{entry.driver} (#{entry.carNo})</td>
                      <td className="px-2 py-2 font-semibold text-pink-400">{formatTime(entry.value)}</td>
                      <td className="px-2 py-2">{entry.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Most Wins */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-purple-400">Most Wins</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left border-b border-gray-700">
                    <th className="px-2 py-2 text-gray-300">Rank</th>
                    <th className="px-2 py-2 text-gray-300">Driver</th>
                    <th className="px-2 py-2 text-gray-300">Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {mostWins.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="px-2 py-2 font-bold">{index + 1}</td>
                      <td className="px-2 py-2">{entry.driver} (#{entry.carNo})</td>
                      <td className="px-2 py-2 font-semibold text-purple-400">{entry.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Best Win Rate */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-orange-400">Best Win Rate (Min 3 Races)</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left border-b border-gray-700">
                    <th className="px-2 py-2 text-gray-300">Rank</th>
                    <th className="px-2 py-2 text-gray-300">Driver</th>
                    <th className="px-2 py-2 text-gray-300">Win Rate</th>
                    <th className="px-2 py-2 text-gray-300">Races</th>
                  </tr>
                </thead>
                <tbody>
                  {bestWinRate.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="px-2 py-2 font-bold">{index + 1}</td>
                      <td className="px-2 py-2">{entry.driver} (#{entry.carNo})</td>
                      <td className="px-2 py-2 font-semibold text-orange-400">{formatPercent(entry.value)}%</td>
                      <td className="px-2 py-2">{(entry as any).races}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {/* Advanced Stats Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-6 text-purple-400 border-b border-gray-700 pb-2">Advanced Statistics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          {/* Consistency Ranking */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-gray-200">Most Consistent Drivers (1/8 ET)</h3>
            <p className="text-sm text-gray-400 mb-2 text-center">Lower standard deviation = more consistent</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={consistencyRanking}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis 
                    type="number" 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                  />
                  <YAxis 
                    dataKey="driver" 
                    type="category" 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                    width={120}
                    interval={0}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Std Dev (sec)" fill="#38B6FF" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Win Factors */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-gray-200">What Wins Races?</h3>
            <p className="text-sm text-gray-400 mb-2 text-center">
              Percentage of races where the winner had the better metric
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={winFactors}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                  />
                  <YAxis 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                    label={{ value: 'Win Percentage', angle: -90, position: 'left', dy: -50, fill: '#E4E4E7' }}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Percent of Wins" fill="#5EFF5E">
                    {winFactors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Second row of advanced stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Most Improved Drivers */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-gray-200">Most Improved Drivers (ET)</h3>
            <p className="text-sm text-gray-400 mb-2 text-center">
              ET improvement from first races to most recent races
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={improvementRanking}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis 
                    type="number" 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                    domain={['dataMin - 0.1', 'dataMax + 0.1']}
                    label={{ value: 'ET Improvement Percentage', position: 'bottom', fill: '#E4E4E7' }}
                    tickFormatter={(value) => value.toFixed(2)}
                  />
                  <YAxis 
                    dataKey="driver" 
                    type="category" 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                    width={120}
                    interval={0}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="improvementPct" name="Improvement %" fill="#5EFF5E" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Most Improved Drivers (MPH) */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-gray-200">Most Improved Drivers (MPH)</h3>
            <p className="text-sm text-gray-400 mb-2 text-center">
              MPH improvement from first races to most recent races
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mphImprovementRanking}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis 
                    type="number" 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                    domain={['dataMin - 0.1', 'dataMax + 0.1']}
                    label={{ value: 'MPH Improvement Percentage', position: 'bottom', fill: '#E4E4E7' }}
                    tickFormatter={(value) => value.toFixed(1)}
                  />
                  <YAxis 
                    dataKey="driver" 
                    type="category" 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                    width={120}
                    interval={0}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="improvementPct" name="Improvement %" fill="#FF5F5F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Fourth row with correlation charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reaction Time vs ET Scatter */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-gray-200">Reaction Time vs 1/8 Mile ET</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Reaction Time" 
                    unit="s" 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                    label={{ value: 'Reaction Time (sec)', position: 'bottom', fill: '#E4E4E7' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="1/8 ET" 
                    unit="s" 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                    label={{ value: '1/8 Mile ET (sec)', angle: -90, position: 'left', fill: '#E4E4E7' }}
                  />
                  <ZAxis type="number" dataKey="z" range={[5, 20]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTooltip />} />
                  <Scatter name="Runs" data={reactionVsET} fill="#FFDE59" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* 60ft vs ET Scatter */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center text-gray-200">60ft Time vs 1/8 Mile ET</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="60ft Time" 
                    unit="s" 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                    label={{ value: '60ft Time (sec)', position: 'bottom', fill: '#E4E4E7' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="1/8 ET" 
                    unit="s" 
                    tick={{ fill: '#E4E4E7' }}
                    stroke="#A1A1AA"
                    label={{ value: '1/8 Mile ET (sec)', angle: -90, position: 'left', fill: '#E4E4E7' }}
                  />
                  <ZAxis type="number" dataKey="z" range={[5, 20]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<SixtyTooltip />} />
                  <Scatter name="Runs" data={sixtyVsET} fill="#FF66C4" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsComponent;