'use client';

import { useState } from 'react';
import FlightForm from './FlightForm';
import ResultsArea from './ResultsArea';
import styles from './FlightSunTracker.module.css';

interface FlightFormData {
  sourceCity: string;
  destinationCity: string;
  departureTime: string;
  flightDuration: string;
}

export default function FlightSunTracker() {
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleFormSubmit = (data: FlightFormData) => {
    console.log('Flight data submitted:', data);
    setHasSubmitted(true);
    // Here we'll add the actual calculation logic later
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Flight Sun Tracker</h1>
        <p className={styles.subtitle}>
          Find the perfect seat for scenic flight views
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.formSection}>
          <FlightForm onSubmit={handleFormSubmit} />
        </div>
        
        <div className={styles.resultsSection}>
          <ResultsArea hasResults={hasSubmitted} />
        </div>
      </main>
    </div>
  );
} 