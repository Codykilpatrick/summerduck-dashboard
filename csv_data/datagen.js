// Drag Racing Season Dataset Generator
const fs = require('fs');

// Driver data from the Big Dog table
const drivers = [
  { name: "Jerry Williams", carNo: "934" },
  { name: "Mike Anderson", carNo: "993" },
  { name: "Patick Pendergrass", carNo: "1X15" },
  { name: "Kavon Tibbs", carNo: "316" },
  { name: "Tracy Stroop", carNo: "396" },
  { name: "Kevin Beach", carNo: "1X37" },
  { name: "Darrell Morton", carNo: "1X17" },
  { name: "Steve Detwiler", carNo: "1X53" },
  { name: "Angie Tibbs", carNo: "518X" },
  { name: "Derek Dellinger", carNo: "DX67" },
  { name: "Bobby Dunn", carNo: "1X3E" },
  { name: "Pete Saffer", carNo: "3X5W" },
  { name: "Robert Pitcock", carNo: "93" }
];

// Event dates from the table
const eventDates = [
  "2024-03-14", // 3/14
  "2024-04-25", // 4/25
  "2024-05-16", // 5/16
  "2024-06-13", // 6/13
  "2024-07-11", // 7/11
  "2024-08-22", // 8/22
  "2024-09-19"  // 9/19
];

// Function to generate realistic racing data
function generateRaceData(driver, opponent, date, raceNumber) {
  // Generate realistic reaction times (typically between 0.001 and 0.5)
  const reaction = (Math.random() * 0.5 + 0.001).toFixed(4);
  
  // Generate 60ft times (typically between 1.0 and 2.5 seconds)
  const sixtyFt = (Math.random() * 1.5 + 1.0).toFixed(4);
  
  // Generate 330ft times (typically between 4.0 and 6.0 seconds)
  const threethirtyFt = (Math.random() * 2.0 + 4.0).toFixed(4);
  
  // Generate 1/8 mile ET (typically between 7.0 and 9.0 seconds for this class)
  const eighthET = (Math.random() * 2.0 + 7.0).toFixed(4);
  
  // Generate 1/8 mile MPH (typically between 90 and 180 for this class)
  const eighthMPH = (Math.random() * 90 + 90).toFixed(2);
  
  // Determine win/loss (this will be updated later in the tournament simulation)
  const winLoss = "TBD";
  
  return {
    driver: driver.name,
    carNo: driver.carNo,
    date,
    raceNumber,
    reaction,
    sixtyFt,
    threethirtyFt,
    eighthET,
    eighthMPH,
    opponent: opponent ? opponent.name : "Bye",
    opponentCarNo: opponent ? opponent.carNo : "N/A",
    winLoss
  };
}

// Function to simulate a single elimination tournament for one event date
function simulateTournament(eventDate) {
  let results = [];
  let raceNumber = 1;
  
  // Shuffle drivers to create random pairings
  let tournamentDrivers = [...drivers];
  for (let i = tournamentDrivers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tournamentDrivers[i], tournamentDrivers[j]] = [tournamentDrivers[j], tournamentDrivers[i]];
  }
  
  // Add byes if necessary to make the bracket work
  const requiredDrivers = Math.pow(2, Math.ceil(Math.log2(tournamentDrivers.length)));
  const byesNeeded = requiredDrivers - tournamentDrivers.length;
  
  for (let i = 0; i < byesNeeded; i++) {
    tournamentDrivers.push(null); // null represents a bye
  }
  
  // Simulate rounds
  let currentRound = tournamentDrivers;
  let roundNumber = 1;
  
  while (currentRound.length > 1) {
    let nextRound = [];
    for (let i = 0; i < currentRound.length; i += 2) {
      const driver1 = currentRound[i];
      const driver2 = currentRound[i + 1];
      
      // Handle byes
      if (driver1 === null) {
        nextRound.push(driver2);
        if (driver2) {
          const byeRace = generateRaceData(driver2, null, eventDate, raceNumber);
          byeRace.winLoss = "Win";
          results.push(byeRace);
          raceNumber++;
        }
        continue;
      }
      if (driver2 === null) {
        nextRound.push(driver1);
        if (driver1) {
          const byeRace = generateRaceData(driver1, null, eventDate, raceNumber);
          byeRace.winLoss = "Win";
          results.push(byeRace);
          raceNumber++;
        }
        continue;
      }
      
      // Generate race data for both drivers
      const race1 = generateRaceData(driver1, driver2, eventDate, raceNumber);
      const race2 = generateRaceData(driver2, driver1, eventDate, raceNumber);
      
      // Determine winner based on ET (could add more complexity with reaction time, redlights, etc.)
      const driver1ET = parseFloat(race1.eighthET);
      const driver2ET = parseFloat(race2.eighthET);
      
      if (driver1ET < driver2ET) {
        race1.winLoss = "Win";
        race2.winLoss = "Loss";
        nextRound.push(driver1);
      } else {
        race1.winLoss = "Loss";
        race2.winLoss = "Win";
        nextRound.push(driver2);
      }
      
      results.push(race1, race2);
      raceNumber++;
    }
    
    currentRound = nextRound;
    roundNumber++;
  }
  
  return results;
}

// Generate data for all events
function generateSeasonData() {
  let allRaceData = [];
  
  eventDates.forEach(date => {
    const tournamentResults = simulateTournament(date);
    allRaceData = allRaceData.concat(tournamentResults);
  });
  
  return allRaceData;
}

// Generate CSV headers
function getCSVHeaders() {
  return [
    "Driver",
    "CarNo",
    "Date",
    "RaceNumber",
    "Reaction",
    "60ft",
    "330ft",
    "1/8ET",
    "1/8MPH",
    "Opponent",
    "OpponentCarNo",
    "WinLoss"
  ].join(",");
}

// Convert race data to CSV format
function convertToCSV(raceData) {
  const headers = getCSVHeaders();
  const rows = raceData.map(race => [
    race.driver,
    race.carNo,
    race.date,
    race.raceNumber,
    race.reaction,
    race.sixtyFt,
    race.threethirtyFt,
    race.eighthET,
    race.eighthMPH,
    race.opponent,
    race.opponentCarNo,
    race.winLoss
  ].join(","));
  
  return [headers, ...rows].join("\n");
}

// Main execution
const seasonData = generateSeasonData();
const csvData = convertToCSV(seasonData);

// Save to a file (if running in Node.js environment)
fs.writeFileSync('drag_racing_season_data.csv', csvData);

// For viewing in console
console.log(csvData.substring(0, 1000) + "...");
console.log(`Total races generated: ${seasonData.length}`);

// Return the full data for in-browser use
return csvData;