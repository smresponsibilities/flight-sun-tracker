# Flight Sun Tracker

A web application that allows users to visualize a flight's path and the position of the sun relative to the aircraft at any point during the journey. This helps passengers choose the best seat to avoid or enjoy the sun.

## Table of Contents

- [Tech Stack](#tech-stack)
- [File Structure](#file-structure)
- [Run Locally](#run-locally)
- [Features](#features)
- [Running Tests](#running-tests)
- [API Endpoints](#api-endpoints)
- [Dependencies](#dependencies)

## Tech Stack

- **Client:** Next.js (React), Resium, React-Globe.gl, Cesium
- **Server:** Next.js API Routes

## File Structure

- `src/app/`: Contains the main pages of the application.
  - `api/`: API routes for the application.
    - `flight/`: API routes for flight calculations and lookups.
    - `sun/`: API routes for sun position calculations.
  - `flight-globe/`: The main page for displaying the flight path on a 3D globe.
- `src/components/`: Reusable React components.
  - `AutocompleteInput.tsx`: An input field with autocomplete functionality for airport lookups.
  - `FlightForm.tsx`: The main form for entering flight details.
  - `GlobeDisplay.tsx`: The component that renders the 3D globe.
  - `ResultsArea.tsx`: The area to display the results of the flight analysis.
- `src/lib/`: Core application logic.
  - `flightCalculator.ts`: Contains the logic for calculating the flight path and sun positions.
  - `data/airports.json`: A local database of airports for the autocomplete input.
- `public/`: Static assets.
- `package.json`: Project dependencies and scripts.

## Run Locally

1.  Clone the project:
    ```bash
    git clone <your-repo-url>
    ```
2.  Go to the project directory:
    ```bash
    cd flight-sun-tracker1
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```

## Features

-   **Flight Path Visualization:** See the great-circle path of a flight on a 3D globe.
-   **Sun Position Tracking:** View the sun's position relative to the aircraft at any point in the flight.
-   **Seat Recommendation:** Get a recommendation for which side of the plane to sit on to avoid or get sun.
-   **Airport Autocomplete:** Easily find airports using an autocomplete input.
-   **Timezone Awareness:** Handles different timezones for departure and arrival airports.

## Running Tests

To run tests, execute the following command:

```bash
npm run test
```

## API Endpoints

-   `GET /api/health`: Health check endpoint.
-   `POST /api/flight/calculate`: Calculates the flight path and sun position data.
-   `GET /api/flight/lookup`: Searches for airports based on a query.
-   `GET /api/sun/position`: Gets the current position of the sun.
-   `POST /api/recommendation`: Provides a seat recommendation based on the flight path.

## Dependencies

-   **Next.js:** React framework for building the user interface and server-side logic.
-   **Resium & Cesium:** For rendering the 3D globe and flight path.
-   **React-Globe.gl:** An alternative or complementary library for globe visualization.
-   **SunCalc:** For calculating the position of the sun.
-   **geolib:** For geographical calculations like great-circle paths.
-   **date-fns-tz:** For handling timezones.
