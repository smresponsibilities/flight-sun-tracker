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
  formAction: (formData: FormData) => void;
  isLoading?: boolean;
}

export default function FlightForm({ formAction, isLoading = false }: FlightFormProps) {
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

  // Validation state
  const [fieldErrors, setFieldErrors] = useState<Partial<FlightFormData>>({});
  const [touched, setTouched] = useState<Partial<FlightFormData>>({});

  // Validation functions
  const validateField = (field: keyof FlightFormData, value: string): string | null => {
    switch (field) {
      case 'sourceCity':
        if (!value.trim()) return 'Source city is required';
        if (value.trim().length < 3) return 'Please enter at least 3 characters';
        return null;
      
      case 'destinationCity':
        if (!value.trim()) return 'Destination city is required';
        if (value.trim().length < 3) return 'Please enter at least 3 characters';
        if (value.trim().toLowerCase() === formData.sourceCity.trim().toLowerCase()) {
          return 'Destination must be different from source city';
        }
        return null;
      
      case 'departureTime':
        if (!value) return 'Departure time is required';
        const departureDate = new Date(value);
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        
        if (isNaN(departureDate.getTime())) return 'Please enter a valid date and time';
        if (departureDate < oneDayAgo) return 'Departure time cannot be more than 1 day in the past';
        if (departureDate > oneYearFromNow) return 'Departure time cannot be more than 1 year in the future';
        return null;
      
      case 'flightDuration':
        if (!value.trim()) return 'Flight duration is required';
        const parsedDuration = parseDurationToMinutes(value.trim());
        if (parsedDuration === null) return 'Invalid format. Use "2h 30m", "2:30", or "150 minutes"';
        if (parsedDuration < 30) return 'Flight duration must be at least 30 minutes';
        if (parsedDuration > 1200) return 'Flight duration cannot exceed 20 hours';
        return null;
      
      default:
        return null;
    }
  };

  // Parse duration to minutes (same function as in actions.ts)
  const parseDurationToMinutes = (duration: string): number | null => {
    if (!duration || typeof duration !== 'string') return null;
    
    const trimmed = duration.trim().toLowerCase();
    
    // Handle "150 minutes" or "150m"
    const minutesMatch = trimmed.match(/^(\d+)\s*(?:minutes?|mins?|m)$/i);
    if (minutesMatch) {
      return parseInt(minutesMatch[1], 10);
    }
    
    // Handle "2h" format
    const hoursOnlyMatch = trimmed.match(/^(\d+)\s*(?:hours?|hrs?|h)$/i);
    if (hoursOnlyMatch) {
      return parseInt(hoursOnlyMatch[1], 10) * 60;
    }
    
    // Handle "2h 30m" format
    const hoursMinutesMatch = trimmed.match(/^(\d+)\s*(?:hours?|hrs?|h)\s*(\d+)\s*(?:minutes?|mins?|m)$/i);
    if (hoursMinutesMatch) {
      const hours = parseInt(hoursMinutesMatch[1], 10);
      const minutes = parseInt(hoursMinutesMatch[2], 10);
      return hours * 60 + minutes;
    }
    
    // Handle "2:30" format
    const colonMatch = trimmed.match(/^(\d+):(\d+)$/i);
    if (colonMatch) {
      const hours = parseInt(colonMatch[1], 10);
      const minutes = parseInt(colonMatch[2], 10);
      return hours * 60 + minutes;
    }
    
    return null;
  };

  const validateAllFields = (): boolean => {
    const errors: Partial<FlightFormData> = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof FlightFormData>).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        errors[field] = error;
        isValid = false;
      }
    });

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    // Mark all fields as touched
    setTouched({
      sourceCity: true,
      destinationCity: true,
      departureTime: true,
      flightDuration: true
    });

    if (!validateAllFields()) {
      e.preventDefault();
      return;
    }
    
    // Let the form action handle the submission automatically
  };

  const handleInputChange = (field: keyof FlightFormData, value: string | number) => {
    const stringValue = String(value);
    
    setFormData(prev => ({
      ...prev,
      [field]: stringValue
    }));

    // Real-time validation for touched fields
    if (touched[field]) {
      const error = validateField(field, stringValue);
      setFieldErrors(prev => ({
        ...prev,
        [field]: error || undefined
      }));
    }
  };

  const handleBlur = (field: keyof FlightFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    const error = validateField(field, formData[field]);
    setFieldErrors(prev => ({
      ...prev,
      [field]: error || undefined
    }));
  };

  return (
    <form className={styles.form} action={formAction} onSubmit={handleSubmit} role="form" aria-label="Flight information form">
      <div className={styles.formGroup}>
        <label htmlFor="sourceCity" className={styles.label}>
          Source City
        </label>
        <input
          type="text"
          id="sourceCity"
          name="sourceCity"
          className={`${styles.input} ${fieldErrors.sourceCity ? styles.inputError : ''}`}
          value={formData.sourceCity}
          onChange={(e) => handleInputChange('sourceCity', e.target.value)}
          onBlur={() => handleBlur('sourceCity')}
          required
          aria-describedby="sourceCity-desc sourceCity-error"
          aria-invalid={!!fieldErrors.sourceCity}
          placeholder="e.g. New York, JFK, Los Angeles, London"
        />
        {fieldErrors.sourceCity && (
          <span id="sourceCity-error" className={styles.errorText} role="alert">
            {fieldErrors.sourceCity}
          </span>
        )}
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
          name="destinationCity"
          className={`${styles.input} ${fieldErrors.destinationCity ? styles.inputError : ''}`}
          value={formData.destinationCity}
          onChange={(e) => handleInputChange('destinationCity', e.target.value)}
          onBlur={() => handleBlur('destinationCity')}
          required
          aria-describedby="destinationCity-desc destinationCity-error"
          aria-invalid={!!fieldErrors.destinationCity}
          placeholder="e.g. Paris, CDG, Tokyo, Sydney"
        />
        {fieldErrors.destinationCity && (
          <span id="destinationCity-error" className={styles.errorText} role="alert">
            {fieldErrors.destinationCity}
          </span>
        )}
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
          name="departureTime"
          className={`${styles.input} ${fieldErrors.departureTime ? styles.inputError : ''}`}
          value={formData.departureTime}
          onChange={(e) => handleInputChange('departureTime', e.target.value)}
          onBlur={() => handleBlur('departureTime')}
          required
          aria-describedby="departureTime-desc departureTime-error"
          aria-invalid={!!fieldErrors.departureTime}
        />
        {fieldErrors.departureTime && (
          <span id="departureTime-error" className={styles.errorText} role="alert">
            {fieldErrors.departureTime}
          </span>
        )}
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
          name="flightDuration"
          className={`${styles.input} ${fieldErrors.flightDuration ? styles.inputError : ''}`}
          value={formData.flightDuration}
          onChange={(e) => handleInputChange('flightDuration', e.target.value)}
          onBlur={() => handleBlur('flightDuration')}
          required
          aria-describedby="flightDuration-desc flightDuration-error"
          aria-invalid={!!fieldErrors.flightDuration}
          placeholder="e.g. 2h 30m or 2:30 or 150 minutes"
        />
        {fieldErrors.flightDuration && (
          <span id="flightDuration-error" className={styles.errorText} role="alert">
            {fieldErrors.flightDuration}
          </span>
        )}
        <span id="flightDuration-desc" className={styles.description}>
          {formData.flightDuration && parseDurationToMinutes(formData.flightDuration) 
            ? `✅ Parsed as: ${Math.floor(parseDurationToMinutes(formData.flightDuration)! / 60)}h ${parseDurationToMinutes(formData.flightDuration)! % 60}m`
            : 'Enter flight duration (e.g. "2h 30m", "2:30", or "150 minutes")'
          }
        </span>
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className={styles.loadingSpinner} aria-hidden="true">⏳</span>
            Analyzing flight path...
          </>
        ) : (
          'Find Best Seat'
        )}
      </button>
    </form>
  );
} 