'use client';

import { useState } from 'react';
import styles from './FlightForm.module.css';

interface FlightFormData {
  sourceCity: string;
  destinationCity: string;
  departureTime: string;
  flightDuration: string;
}

interface FlightFormProps {
  onSubmit: (data: FlightFormData) => void;
}

export default function FlightForm({ onSubmit }: FlightFormProps) {
  // Get current date and time in the format required by datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState<FlightFormData>({
    sourceCity: '',
    destinationCity: '',
    departureTime: getCurrentDateTime(),
    flightDuration: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof FlightFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} role="form" aria-label="Flight information form">
      <div className={styles.formGroup}>
        <label htmlFor="sourceCity" className={styles.label}>
          Source City
        </label>
        <input
          type="text"
          id="sourceCity"
          className={styles.input}
          value={formData.sourceCity}
          onChange={(e) => handleInputChange('sourceCity', e.target.value)}
          required
          aria-describedby="sourceCity-desc"
          placeholder="Enter departure city"
        />
        <span id="sourceCity-desc" className={styles.description}>
          City where your flight departs from
        </span>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="destinationCity" className={styles.label}>
          Destination City
        </label>
        <input
          type="text"
          id="destinationCity"
          className={styles.input}
          value={formData.destinationCity}
          onChange={(e) => handleInputChange('destinationCity', e.target.value)}
          required
          aria-describedby="destinationCity-desc"
          placeholder="Enter arrival city"
        />
        <span id="destinationCity-desc" className={styles.description}>
          City where your flight arrives
        </span>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="departureTime" className={styles.label}>
          Departure Time
        </label>
        <input
          type="datetime-local"
          id="departureTime"
          className={styles.input}
          value={formData.departureTime}
          onChange={(e) => handleInputChange('departureTime', e.target.value)}
          required
          aria-describedby="departureTime-desc"
        />
        <span id="departureTime-desc" className={styles.description}>
          Select date and time of departure
        </span>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="flightDuration" className={styles.label}>
          Flight Duration
        </label>
        <input
          type="text"
          id="flightDuration"
          className={styles.input}
          value={formData.flightDuration}
          onChange={(e) => handleInputChange('flightDuration', e.target.value)}
          required
          aria-describedby="flightDuration-desc"
          placeholder="e.g. 2h 30m or 2:30 or 150 minutes"
        />
        <span id="flightDuration-desc" className={styles.description}>
          Enter flight duration (e.g. "2h 30m", "2:30", or "150 minutes")
        </span>
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        aria-describedby="submit-desc"
      >
        Find Best Seat
      </button>
      <span id="submit-desc" className={styles.description}>
        Calculate optimal seat position for sunlight exposure
      </span>
    </form>
  );
} 