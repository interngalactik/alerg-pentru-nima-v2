import React, { useEffect, useState, useCallback } from 'react';
import Papa from 'papaparse';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  // Button,
  Typography,
  Box,
  CircularProgress,
  // Tooltip,
  // IconButton,
} from '@mui/material';
// import { ArrowForward } from '@mui/icons-material'; // Importing an icon for visual enhancement

interface Race {
  date: string;
  name: string;
  link: string;
  distance: string;
  elevationGain: string;
  status?: string;
  time?: string;
  generalPlace?: string;
  categoryPlace?: string;
}

const RacesTable = () => {
  // Get current year
  const currentYear = new Date().getFullYear();
  
  // Set initial sheetId based on current year
  const getInitialSheetId = () => {
    if (currentYear === 2024) return '0';
    if (currentYear === 2025) return '1758931029';
    // If year is beyond 2025, default to latest year (2025)
    if (currentYear > 2025) return '1758931029';
    // If year is before 2024, default to earliest year (2024)
    return '0';
  };

  const [csvData, setCsvData] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spreadsheetId] = useState('2PACX-1vSHYqZ9S0Q9pbMy97P1rYquyNr9897G6LsV_YP4_bBRxyoX-3hOspdM-iR0Z7Nf15JByZhvLwDwTMES');
  const [sheetId, setSheetId] = useState(getInitialSheetId());

  const fetchData = useCallback(async (sheetId: string) => {
    setLoading(true); // Start loading
    try {
      const response = await fetch(`https://docs.google.com/spreadsheets/d/e/${spreadsheetId}/pub?output=csv&gid=${sheetId}`); // Replace with your actual Sheet ID
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse CSV data
      const text = await response.text(); // Get the response as text
      Papa.parse(text, {
        header: true, // Use the first row as header
        skipEmptyLines: true, // Skip empty lines
        complete: (results) => {
          setCsvData(results.data as Race[]); // Set the parsed data
        },
        error: (err: Error) => {
          setError(err.message); // Handle parsing errors
        },
      });
    } catch (err: unknown) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false); // Stop loading
    }
  }, [spreadsheetId]);

  useEffect(() => {
    fetchData(sheetId); // Fetch data for the selected year
  }, [sheetId, fetchData]); // Fetch data whenever the selected year changes

  const handleYearChange = (sheetId: string) => {
    setSheetId(sheetId); // Update the selected year
  };

  const YearSelector = () => (
    <div className="table_section">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        width: '100%',
        margin: '0 auto'
      }}>
        <a 
          href="#" 
          className="paragraph table_year"
          onClick={(e) => {
            e.preventDefault();
            handleYearChange('0');
          }}
          style={{ visibility: sheetId === '1758931029' ? 'visible' : 'hidden' }}
        >
          &lt; 2024
        </a>
        <p className="paragraph table_year active">
          {sheetId === '1758931029' ? '2025' : '2024'}
        </p>
        <a 
          href="#" 
          className="paragraph table_year"
          onClick={(e) => {
            e.preventDefault();
            handleYearChange('1758931029');
          }}
          style={{ visibility: sheetId === '0' ? 'visible' : 'hidden' }}
        >
          2025 &gt;
        </a>
      </div>
      <div className="_15-spacer"></div>
    </div>
  );

  return (
    <div>
      <YearSelector />
      <TableContainer component={Paper} sx={{ border: '2px solid var(--blue)', borderRadius: '10px', boxShadow: 3 }}>
        <Table sx={{ minWidth: 650 }} aria-label="races table">
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: 'white', color: 'var(--blue)' }}>Data</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: 'white', color: 'var(--blue)' }} align="left">Competiție</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: 'white', color: 'var(--blue)' }} align="right">Distanța (km)</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: 'white', color: 'var(--blue)' }} align="right">Diferența de nivel (m)</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: 'white', color: 'var(--blue)' }} align="left">Status</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: 'white', color: 'var(--blue)' }} align="right">Timp</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: 'white', color: 'var(--blue)' }} align="right">Loc General</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: 'white', color: 'var(--blue)' }} align="right">Loc categorie de vârstă</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ border: 0, padding: 0, width: '100%' }}>
                  <Box sx={{ backgroundColor: 'var(--blue)', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', width: '100%'}}>
                    <CircularProgress size={60} sx={{ color: 'white' }} />
                  </Box>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ border: 0 }}>
                  <Typography variant="h6" color="error" align="center" sx={{ marginTop: 2 }}>
                    Error: {error}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : csvData.length === 0 && sheetId === '1758931029' ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ border: 0, padding: 0, width: '100%' }}>
                  <Box sx={{ 
                    backgroundColor: 'var(--blue)', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '200px', 
                    width: '100%',
                    color: 'white',
                    fontSize: '2rem',
                    fontWeight: 'bold'
                  }}>
                    ÎN CURÂND
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              csvData.map((race, index) => (
                <TableRow
                  key={index}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    // '&:hover': { backgroundColor: '#f5f5f5' }, // Hover effect
                    backgroundColor: 'var(--blue)',
                  }}
                >
                  <TableCell component="th" scope="row" sx={{ color: 'white' }}>
                    {race.date}
                  </TableCell>
                  <TableCell align="left" sx={{ color: 'white' }}>
                    <a href={race.link} target="_blank" rel="noopener noreferrer" className="underline hover:text-success duration-200 transition-colors">
                      {race.name}
                    </a>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>{race.distance}</TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>{race.elevationGain}</TableCell>
                  <TableCell align="left" sx={{ color: 'white' }}>{race.status ? race.status : '-'}</TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>{race.time ? race.time : '-'}</TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>{race.generalPlace ? race.generalPlace : '-'}</TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>{race.categoryPlace ? race.categoryPlace : '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default RacesTable;