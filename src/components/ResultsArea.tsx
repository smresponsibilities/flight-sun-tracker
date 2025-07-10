import styles from './ResultsArea.module.css';

interface ResultsAreaProps {
  hasResults: boolean;
}

export default function ResultsArea({ hasResults }: ResultsAreaProps) {
  return (
    <section 
      className={styles.resultsContainer}
      role="region"
      aria-label="Flight seat recommendations"
      aria-live="polite"
    >
      <h2 className={styles.heading}>Seat Recommendations</h2>
      
      {hasResults ? (
        <div className={styles.resultsContent}>
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon} aria-hidden="true">
              ✈️
            </div>
            <p className={styles.placeholderText}>
              Results will appear here when you click "Find Best Seat"
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            ☀️
          </div>
          <h3 className={styles.emptyHeading}>Ready to find your perfect seat</h3>
          <p className={styles.emptyText}>
            Fill out the flight information above and click "Find Best Seat" to get personalized recommendations based on sun exposure patterns.
          </p>
          <div className={styles.features}>
            <ul className={styles.featureList} role="list">
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">🌅</span>
                Optimal sunlight exposure timing
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">🪟</span>
                Window vs aisle recommendations
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">🧭</span>
                Direction-based seat positioning
              </li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
} 