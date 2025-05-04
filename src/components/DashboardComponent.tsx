import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Sector,
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

// Interface for performance by race data
interface PerformanceData {
  date: string;
  et: number;
  mph: number;
  count: number;
}

// Interface for tooltip props
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

// Custom dark theme colors
const COLORS = ['#FF5F5F', '#38B6FF', '#5EFF5E', '#FFDE59', '#FF66C4', '#9D66FF'];

// Add customized active shape
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  
  return (
    <g>
      <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#E4E4E7" fontSize="16px">
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={10} textAnchor="middle" fill="#E4E4E7" fontSize="20px">
        {`${value}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius - 1}
        fill={fill}
      />
    </g>
  );
};

const DashboardComponent = () => {
  const [raceData, setRaceData] = useState<RaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [activeIndex, setActiveIndex] = useState(0);

  // Derived data for charts
  const [driverWinRates, setDriverWinRates] = useState<{ name: string; value: number }[]>([]);
  const [reactionTimes, setReactionTimes] = useState<{ driver: string; value: number }[]>([]);
  const [performanceByRace, setPerformanceByRace] = useState<PerformanceData[]>([]);
  const [avgSpeedByDriver, setAvgSpeedByDriver] = useState<{ driver: string; speed: number }[]>([]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

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
          complete: results => {
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
          error: (error: Error) => {
            setError(`Error parsing CSV: ${error.message}`);
            setLoading(false);
          },
        });
      } catch (err) {
        setError('Failed to fetch data');
        setLoading(false);
        console.error(err);
      }
    };

    fetchData();
  }, []);

  // Process the race data to create chart data
  const processData = (data: RaceRecord[]) => {
    // Calculate win rates for each driver
    const driverStats = new Map<string, { wins: number; total: number }>();

    data.forEach(record => {
      if (!driverStats.has(record.Driver)) {
        driverStats.set(record.Driver, { wins: 0, total: 0 });
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
        const displayName = last ? `${first} ${last[0]}. ` : first; // Handle single-word names

        return {
          name: displayName,
          value: winRate,
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
          value: parseFloat(avg.toFixed(3)),
        };
      })
      .sort((a, b) => a.value - b.value) // Remove slice to show all drivers
      .slice(0, 6); // Top 6 drivers by reaction time
    setReactionTimes(avgReactions);

    // Calculate average ET and MPH by date
    const datePerformanceMap = new Map<
      string,
      {
        et: number[];
        mph: number[];
        count: number;
      }
    >();

    data.forEach(record => {
      if (!datePerformanceMap.has(record.Date)) {
        datePerformanceMap.set(record.Date, {
          et: [],
          mph: [],
          count: 0,
        });
      }

      const dateStats = datePerformanceMap.get(record.Date)!;

      if (record['1/8ET'] && record['1/8ET'] > 0) {
        dateStats.et.push(record['1/8ET']);
      }

      if (record['1/8MPH'] && record['1/8MPH'] > 0) {
        dateStats.mph.push(record['1/8MPH']);
      }

      dateStats.count += 1;
    });

    const performanceByDate = Array.from(datePerformanceMap.entries())
      .map(([date, stats]) => {
        const avgEt =
          stats.et.length > 0 ? stats.et.reduce((sum, val) => sum + val, 0) / stats.et.length : 0;

        const avgMph =
          stats.mph.length > 0
            ? stats.mph.reduce((sum, val) => sum + val, 0) / stats.mph.length
            : 0;

        return {
          date,
          et: parseFloat(avgEt.toFixed(3)),
          mph: parseFloat(avgMph.toFixed(2)),
          count: stats.count,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setPerformanceByRace(performanceByDate);

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
          speed: parseFloat(avg.toFixed(2)),
        };
      })
      .sort((a, b) => b.speed - a.speed)
      .slice(0, 6); // Top 6 drivers by speed

    setAvgSpeedByDriver(avgSpeeds);
  };

  // Custom chart theme components
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-2 rounded shadow-lg text-gray-200">
          <p className="font-semibold">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-gray-200">
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-10 w-10 text-purple-500 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-xl">Loading race data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-gray-900">Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-gray-900 text-gray-200 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">
        Big Dog Automotive 2024 Season
      </h1>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-2 text-gray-300">Total Races</h2>
          <p className="text-4xl font-bold text-purple-400">{raceData.length}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-2 text-gray-300">Unique Drivers</h2>
          <p className="text-4xl font-bold text-blue-400">
            {new Set(raceData.map(record => record.Driver)).size}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-2 text-gray-300">Average MPH</h2>
          <p className="text-4xl font-bold text-green-400">
            {(
              raceData.reduce((sum, record) => sum + (record['1/8MPH'] || 0), 0) / raceData.length
            ).toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-2 text-gray-300">Average ET</h2>
          <p className="text-4xl font-bold text-red-400">
            {(
              raceData.reduce((sum, record) => sum + (record['1/8ET'] || 0), 0) / raceData.length
            ).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Driver Win Rates */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Driver Win Percentages</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {windowWidth < 640 ? (
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={driverWinRates}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onClick={(data, index) => setActiveIndex(index)}
                  >
                    {driverWinRates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                ) : (
                  <Pie
                    data={driverWinRates}
                    cx="50%"
                    cy="50%"
                    labelLine={windowWidth < 1280 ? { stroke: '#777', strokeWidth: 1, className: 'text-xs' } : true}
                    innerRadius={30}
                    outerRadius={windowWidth < 1280 ? 65 : 80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => {
                      if (windowWidth < 1280) {
                        // Just show percentage for medium screens
                        return `${value}%`;
                      } else {
                        // Full label for large screens
                        return `${name}: ${value}%`;
                      }
                    }}
                  >
                    {driverWinRates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                )}
                <Legend 
                  formatter={value => <span style={{ color: '#E4E4E7' }}>{value}</span>}
                  layout={windowWidth < 1280 ? "horizontal" : "vertical"}
                  verticalAlign={windowWidth < 1280 ? "bottom" : "middle"}
                  align={windowWidth < 1280 ? "center" : "right"}
                  wrapperStyle={windowWidth < 768 ? { fontSize: '0.8rem' } : {}}
                  onClick={windowWidth < 640 ? (entry, index) => setActiveIndex(index) : undefined}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Driver Reaction Times */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">
            Average Reaction Times (seconds)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={reactionTimes}
                layout="vertical"
                margin={windowWidth < 640 ? 
                  { top: 5, right: 20, left: 60, bottom: 5 } : 
                  { top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3F3F5A" />
                <XAxis
                  type="number"
                  domain={[0, 'dataMax + 0.015']}
                  tick={{ fill: '#E4E4E7' }}
                  stroke="#A1A1AA"
                />
                <YAxis
                  dataKey="driver"
                  type="category"
                  width={windowWidth < 640 ? 60 : 100}
                  tick={{ fill: '#E4E4E7', fontSize: windowWidth < 640 ? 10 : 12 }}
                  stroke="#A1A1AA"
                  interval={0}
                />
                <Tooltip content={<CustomTooltip />} formatter={(value: number) => value.toFixed(3)} />
                <Bar dataKey="value" fill="#38B6FF" name="Reaction Time" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Trends */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Event Average ET and MPH</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={performanceByRace}
                margin={windowWidth < 640 ? 
                  { top: 5, right: 20, left: 5, bottom: 20 } : 
                  { top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3F3F5A" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#E4E4E7', fontSize: windowWidth < 640 ? 10 : 12 }}
                  stroke="#A1A1AA"
                  angle={-45}
                  textAnchor="end"
                  height={windowWidth < 640 ? 60 : 80}
                  interval={windowWidth < 640 ? 1 : 0}
                />
                <YAxis
                  yAxisId="left"
                  domain={['dataMin - 0.05', 'dataMax + 0.02']}
                  tick={{ fill: '#E4E4E7' }}
                  stroke="#A1A1AA"
                  label={windowWidth < 640 ? 
                    {} : 
                    { value: 'ET', angle: -90, position: 'insideLeft', fill: '#E4E4E7' }}
                  tickFormatter={value => value.toFixed(3)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 'dataMax + 5']}
                  tick={{ fill: '#E4E4E7' }}
                  stroke="#A1A1AA"
                  label={windowWidth < 640 ? 
                    {} : 
                    { value: 'MPH', angle: 90, position: 'insideRight', fill: '#E4E4E7' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={value => <span style={{ color: '#E4E4E7' }}>{value}</span>} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="et"
                  stroke="#FF5F5F"
                  name="Avg 1/8 Mile ET"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="mph"
                  stroke="#5EFF5E"
                  name="Avg 1/8 Mile MPH"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average Speed by Driver */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">
            Average 1/8 Mile MPH by Driver
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={avgSpeedByDriver}
                margin={windowWidth < 640 ? 
                  { top: 5, right: 20, left: 5, bottom: 40 } : 
                  { top: 5, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3F3F5A" />
                <XAxis
                  dataKey="driver"
                  tick={{ fill: '#E4E4E7', fontSize: windowWidth < 640 ? 10 : 12 }}
                  stroke="#A1A1AA"
                  angle={-45}
                  textAnchor="end"
                  height={windowWidth < 640 ? 50 : 60}
                  interval={0}
                />
                <YAxis
                  domain={['dataMin - 5', 'dataMax + 1']}
                  tick={{ fill: '#E4E4E7' }}
                  stroke="#A1A1AA"
                  tickFormatter={value => value.toFixed(2)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="speed" fill="#FFDE59" name="Avg MPH" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardComponent;
