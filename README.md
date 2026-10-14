# Flight Sun Tracker — Airplane Window Seat Shade & Sun Calculator

[![Live Case Study](https://img.shields.io/badge/Live_Case_Study-shivammahajan.com-3b82f6?style=flat&logo=googlechrome&logoColor=white)](https://shivammahajan.com/projects/flight-sun-tracker/)
[![Author](https://img.shields.io/badge/Author-Shivam_Mahajan-success?style=flat)](https://shivammahajan.com/)
[![Language: TypeScript](https://img.shields.io/badge/Language-TypeScript-3178c6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An open-source interactive web application and solar elevation calculator that models flight trajectories and calculates the sun's position relative to an aircraft's heading along any great-circle route.

**Read the full technical case study:** **[Flight Sun Tracker Architecture & Solar Math (shivammahajan.com)](https://shivammahajan.com/projects/flight-sun-tracker/)**

---

## The Problem: Which Side of the Plane Has the Sun?

When booking a flight, choosing a window seat is usually a gamble: *Will the afternoon sun blind you for six hours, or will you enjoy cool cabin shade and scenic cloud views?*

* **Northern Hemisphere Eastbound Flights:** The sun is typically on the **right side** (starboard / Seats F or K). For shade, sit on the **left side** (port / Seat A).
* **Northern Hemisphere Westbound Flights:** The sun is typically on the **left side** (port / Seat A). For shade, sit on the **right side** (starboard / Seats F or K).
* **Great-Circle Trajectories:** Because long-haul flights follow spherical geodesic arcs rather than flat straight lines, and because the earth's solar declination shifts seasonally, sunlight exposure can flip sides mid-flight.

Flight Sun Tracker eliminates guesswork by calculating second-by-second solar elevation, azimuth, and seat shade for any airport pair.

---

## Core Features

* **Great-Circle Path Modeling:** Computes accurate geodesic flight paths and true forward headings using spherical trigonometry (Haversine & law of cosines).
* **Deterministic Solar Ephemeris:** Computes the sun's subsolar coordinates client-side in under 1ms using low-discrepancy Jean Meeus astronomical algorithms (zero external API dependencies).
* **Seat Shading Recommendations:** Projects solar coordinates into the aircraft's local coordinate frame, giving passengers explicit shade vs direct sun breakdowns.
* **Airport Autocomplete & Timezone Resolution:** Seamlessly resolves IATA/ICAO airport codes and handles UTC timezone offsets.
* **Lightweight 2D/3D Visualization:** Fast rendering avoiding bloated 600KB+ WebGL runtimes to preserve mobile battery during travel.

---

## Mathematics Behind the Engine

```
         True Aircraft Heading (0°)
                     ▲
                     │
                     │  Aircraft
                     │
                     ├─── θ (Relative Azimuth) ───► ☼ (Sun Position)
                    / \
                   /   \
               Port     Starboard
             (Left/A)   (Right/F)
```

1. **Relative Azimuth $\theta_{\text{rel}}$:** Calculated by subtracting the aircraft's instantaneous true heading $\beta$ from the absolute solar azimuth $A$:
   $$\theta_{\text{rel}} = (A - \beta + 360^\circ) \bmod 360^\circ$$
2. **Side Classification:**
   * $0^\circ < \theta_{\text{rel}} < 180^\circ$: Direct sunlight strikes **Starboard** (Seats F / K).
   * $180^\circ < \theta_{\text{rel}} < 360^\circ$: Direct sunlight strikes **Port** (Seats A).
   * Solar Elevation $h < -6^\circ$: Civil twilight or night (both sides shaded).

---

## Tech Stack

* **Language:** TypeScript / JavaScript
* **Frontend:** Next.js (React), HTML5 Canvas, Cesium / React-Globe.gl
* **Algorithms:** Spherical geodesic interpolation, astronomical solar ephemeris formulas, `date-fns-tz`

---

## Local Setup

```bash
# Clone the repository
git clone https://github.com/smresponsibilities/flight-sun-tracker.git
cd flight-sun-tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## Author & Architecture Links

Built by **[Shivam Mahajan](https://shivammahajan.com/)** (Software Developer & Systems Builder).

* **Case Study:** [Flight Sun Tracker: Computing Aircraft Seat Shade](https://shivammahajan.com/projects/flight-sun-tracker/)
* **Portfolio:** [Shivam Mahajan — Engineering Portfolio](https://shivammahajan.com/)
* **All Projects:** [Software Engineering Catalog](https://shivammahajan.com/projects/)
* **Productivity Caller:** [Android Reminder App That Calls You](https://shivammahajan.com/projects/productivity-caller/)
* **Pokédex Portfolio:** [SM'S DEX Developer Portfolio](https://shivammahajan.com/projects/sm-dex/)
