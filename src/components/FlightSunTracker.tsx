'use client';

import { useActionState } from 'react';
import FlightForm from './FlightForm';
import ResultsArea from './ResultsArea';
import styles from './FlightSunTracker.module.css';
import { getFlightRecommendation, type FlightRecommendationState } from '@/app/actions';

const initialState: FlightRecommendationState = {
  success: false,
  message: undefined,
  data: undefined,
  errors: undefined
};

export default function FlightSunTracker() {
  const [state, formAction, isPending] = useActionState(getFlightRecommendation, initialState);

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
          <FlightForm formAction={formAction} isLoading={isPending} />
          

          
          {/* Error messages */}
          {state?.errors && (
            <div className={styles.errorState} role="alert" aria-live="assertive">
              {state.message && (
                <p className={styles.errorMessage}>{state.message}</p>
              )}
              {state.errors.general && (
                <p className={styles.errorDetail}>{state.errors.general}</p>
              )}
              {state.errors.sourceCity && (
                <p className={styles.errorDetail}>Source City: {state.errors.sourceCity}</p>
              )}
              {state.errors.destinationCity && (
                <p className={styles.errorDetail}>Destination: {state.errors.destinationCity}</p>
              )}
              {state.errors.departureTime && (
                <p className={styles.errorDetail}>Departure Time: {state.errors.departureTime}</p>
              )}
              {state.errors.flightDuration && (
                <p className={styles.errorDetail}>Duration: {state.errors.flightDuration}</p>
              )}
            </div>
          )}
          
          {/* Toast notification for success */}
          {state?.success && state?.message && (
            <div className={styles.toast} role="status" aria-live="polite">
              <div className={styles.toastIcon} aria-hidden="true"></div>
              <span>Flight recommendations ready</span>
            </div>
          )}
        </div>
        
        <div className={styles.resultsSection}>
          <ResultsArea 
            hasResults={state?.success || false}
            isLoading={isPending}
            data={state?.data}
            error={state?.errors?.general}
          />
        </div>
      </main>
    </div>
  );
} 