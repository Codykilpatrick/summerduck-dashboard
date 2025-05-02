import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import Papa from 'papaparse';

// Type definitions for our data
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

// Custom colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const DashboardComponent = () => {
  const [raceData, setRaceData] = useState<RaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Derived data for charts
  const [driverWinRates, setDriverWinRates] = useState<{name: string, value: number}[]>([]);
  const [reactionTimes, setReactionTimes] = useState<{driver: string, value: number}[]>([]);
  const [performanceByRace, setPerformanceByRace] = useState<any[]>([]);
  const [avgSpeedByDriver, setAvgSpeedByDriver] = useState<{driver: string, speed: number}[]>([]);

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
            processData(parsedData);
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

  // Process the race data to create chart data
  const processData = (data: RaceRecord[]) => {
    // Calculate win rates for each driver
    const driverStats = new Map<string, {wins: number, total: number}>();
    
    data.forEach(record => {
      if (!driverStats.has(record.Driver)) {
        driverStats.set(record.Driver, {wins: 0, total: 0});
      }
      
      const stats = driverStats.get(record.Driver)!;
      stats.total += 1;
      
      if (record.WinLoss === 'Win') {
        stats.wins += 1;
      }
      
      driverStats.set(record.Driver, stats);
    });
    
    // Convert to chart data format
    const winRateData = Array.from(driverStats.entries())
      .map(([driver, stats]) => {
        const winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
        const [first, last] = driver.split(' ');
        const displayName = last ? `${first} ${last[0]}.` : first; // Handle single-word names
        
        return {
          name: displayName,
          value: winRate
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 drivers by win rate

    setDriverWinRates(winRateData);
    
    // Get average reaction times by driver
    const reactionsByDriver = new Map<string, number[]>();
    
    data.forEach(record => {
      if (record.Reaction && record.Reaction > 0) {
        if (!reactionsByDriver.has(record.Driver)) {
          reactionsByDriver.set(record.Driver, []);
        }
        
        reactionsByDriver.get(record.Driver)!.push(record.Reaction);
      }
    });
    const avgReactions = Array.from(reactionsByDriver.entries())
    .map(([driver, reactions]) => {
      const avg = reactions.reduce((sum, val) => sum + val, 0) / reactions.length;
  
      const [first, last] = driver.split(' ');
      const displayName = last ? `${first} ${last[0]}.` : first; // Handle single-word names
  
      return {
        driver: displayName,
        value: parseFloat(avg.toFixed(3))
      };
    })
    .sort((a, b) => a.value - b.value); // Remove slice to show all drivers
  
  setReactionTimes(avgReactions);
  
    
    // Get performance metrics by race number for a specific driver
    // Using the first driver with the most races for this example
    const driverRaceCounts = Array.from(driverStats.entries())
      .map(([driver, stats]) => ({driver, count: stats.total}))
      .sort((a, b) => b.count - a.count);
    
    if (driverRaceCounts.length > 0) {
      const focusDriver = driverRaceCounts[0].driver;
      
      const driverRaces = data
        .filter(record => record.Driver === focusDriver)
        .sort((a, b) => (a.RaceNumber || 0) - (b.RaceNumber || 0));
      
      const performanceData = driverRaces.map(race => ({
        race: race.RaceNumber,
        et: race['1/8ET'],
        mph: race['1/8MPH'],
        reaction: race.Reaction,
        result: race.WinLoss
      }));
      
      setPerformanceByRace(performanceData);
    }
    
    // Calculate average speed by driver
    const speedsByDriver = new Map<string, number[]>();
    
    data.forEach(record => {
      if (record['1/8MPH'] && record['1/8MPH'] > 0) {
        if (!speedsByDriver.has(record.Driver)) {
          speedsByDriver.set(record.Driver, []);
        }
        
        speedsByDriver.get(record.Driver)!.push(record['1/8MPH']);
      }
    });
    
    const avgSpeeds = Array.from(speedsByDriver.entries())
      .map(([driver, speeds]) => {
        const avg = speeds.reduce((sum, val) => sum + val, 0) / speeds.length;
        const [first, last] = driver.split(' ');
        const displayName = last ? `${first} ${last[0]}.` : first; // Handle single-word names
        return {
          driver: displayName,
          speed: parseFloat(avg.toFixed(2))
        };
      })
      .sort((a, b) => b.speed - a.speed)
      .slice(0, 6); // Top 6 drivers by speed
    
    setAvgSpeedByDriver(avgSpeeds);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading race data...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  console.log(performanceByRace);

  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-center text-blue-800">Drag Racing Season Dashboard</h1>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Total Races</h2>
          <p className="text-4xl font-bold text-blue-600">{raceData.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Unique Drivers</h2>
          <p className="text-4xl font-bold text-green-600">
            {new Set(raceData.map(record => record.Driver)).size}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Average MPH</h2>
          <p className="text-4xl font-bold text-purple-600">
            {(raceData.reduce((sum, record) => sum + (record['1/8MPH'] || 0), 0) / raceData.length).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Average ET</h2>
          <p className="text-4xl font-bold text-purple-600">
            {(raceData.reduce((sum, record) => sum + (record['1/8ET'] || 0), 0) / raceData.length).toFixed(2)}
          </p>
        </div>
      </div>
      
      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Driver Win Rates */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Driver Win Percentages</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={driverWinRates}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  innerRadius={30}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {driverWinRates.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Driver Reaction Times */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Average Reaction Times (seconds)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={reactionTimes}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 'dataMax']} />
                <YAxis dataKey="driver" type="category" width={80} />
                <Tooltip formatter={(value: any) => value.toFixed(3)} />
                <Bar dataKey="value" fill="#82ca9d" name="Reaction Time" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Performance Trends */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Driver Performance by Race</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={performanceByRace}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="race" label={{ value: 'Race Number', position: 'insideBottomRight', offset: -10 }} />
                <YAxis yAxisId="left" domain={['dataMin - 0.05', 'dataMax + 0.02']} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 5']} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="et" stroke="#8884d8" name="1/8 Mile ET" />
                <Line yAxisId="right" type="monotone" dataKey="mph" stroke="#82ca9d" name="1/8 Mile MPH" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Average Speed by Driver */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Average 1/8 Mile MPH by Driver</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgSpeedByDriver} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="driver" />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip />
                <Bar dataKey="speed" fill="#8884d8" name="Avg MPH" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardComponent;