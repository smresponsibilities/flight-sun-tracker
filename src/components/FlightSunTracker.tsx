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
          

          
          {/* Error toast notification */}
          {state?.errors && (
            <div className={styles.errorToast} role="alert" aria-live="assertive">
              <div className={styles.errorToastIcon} aria-hidden="true"></div>
              <span>
                {state.errors.general || state.message || 'Please check your input and try again'}
              </span>
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