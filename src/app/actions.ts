'use server'

import type { FlightRecommendation } from '@/lib/flightCalculator'

// State interfaces for useActionState
export interface FlightRecommendationState {
  success: boolean
  message?: string
  data?: FlightRecommendation
  errors?: {
    sourceCity?: string
    destinationCity?: string
    departureTime?: string
    flightDuration?: string
    general?: string
  }
}

// Form data interface
interface FlightFormData {
  sourceCity: string
  destinationCity: string
  departureTime: string
  flightDuration: string
}

/**
 * Server Action for getting flight recommendations
 * Used with React 19's useActionState hook
 */
export async function getFlightRecommendation(
  prevState: FlightRecommendationState | null,
  formData: FormData
): Promise<FlightRecommendationState> {
  try {
    // Extract form data
    const rawData: FlightFormData = {
      sourceCity: formData.get('sourceCity') as string,
      destinationCity: formData.get('destinationCity') as string, 
      departureTime: formData.get('departureTime') as string,
      flightDuration: formData.get('flightDuration') as string,
    }

    // Basic validation
    const errors: FlightRecommendationState['errors'] = {}
    
    if (!rawData.sourceCity?.trim()) {
      errors.sourceCity = 'Source city is required'
    }
    
    if (!rawData.destinationCity?.trim()) {
      errors.destinationCity = 'Destination city is required'
    }
    
    if (!rawData.departureTime) {
      errors.departureTime = 'Departure time is required'
    }
    
    if (!rawData.flightDuration?.trim()) {
      errors.flightDuration = 'Flight duration is required'
    }

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        message: 'Please fix the errors below',
        errors
      }
    }

    // Transform data for API (we'll implement utilities next)
    const durationMinutes = parseDurationToMinutes(rawData.flightDuration)
    if (durationMinutes === null) {
      return {
        success: false,
        message: 'Invalid flight duration format',
        errors: {
          flightDuration: 'Please use format like "2h 30m", "2:30", or "150 minutes"'
        }
      }
    }

    // Enhanced airport handling - try common IATA codes first
    const departure = mapCityToIATA(rawData.sourceCity.trim());
    const arrival = mapCityToIATA(rawData.destinationCity.trim());

    const apiPayload = {
      departure,
      arrival,
      departureTime: new Date(rawData.departureTime).toISOString(),
      durationMinutes
    }

    // Call our API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/recommendation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: result.details || result.error || 'Failed to get recommendation',
        errors: {
          general: result.details || result.error || 'API error occurred'
        }
      }
    }

    if (result.success) {
      return {
        success: true,
        message: 'Flight recommendation generated successfully!',
        data: result.data
      }
    } else {
      return {
        success: false,
        message: result.error || 'Failed to generate recommendation',
        errors: {
          general: result.error || 'Unknown error occurred'
        }
      }
    }

  } catch (error) {
    console.error('Server Action error:', error)
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
      errors: {
        general: 'Network or server error occurred'
      }
    }
  }
}

/**
 * Parse duration string to minutes
 * Supports formats: "2h 30m", "2:30", "150 minutes", "150m", "2h"
 */
function parseDurationToMinutes(duration: string): number | null {
  if (!duration || typeof duration !== 'string') return null
  
  const trimmed = duration.trim().toLowerCase()
  
  // Handle "150 minutes" or "150m"
  const minutesMatch = trimmed.match(/^(\d+)\s*(?:minutes?|mins?|m)$/i)
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10)
  }
  
  // Handle "2h" format
  const hoursOnlyMatch = trimmed.match(/^(\d+)\s*(?:hours?|hrs?|h)$/i)
  if (hoursOnlyMatch) {
    return parseInt(hoursOnlyMatch[1], 10) * 60
  }
  
  // Handle "2h 30m" format
  const hoursMinutesMatch = trimmed.match(/^(\d+)\s*(?:hours?|hrs?|h)\s*(\d+)\s*(?:minutes?|mins?|m)$/i)
  if (hoursMinutesMatch) {
    const hours = parseInt(hoursMinutesMatch[1], 10)
    const minutes = parseInt(hoursMinutesMatch[2], 10)
    return hours * 60 + minutes
  }
  
  // Handle "2:30" format
  const colonMatch = trimmed.match(/^(\d+):(\d+)$/i)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10)
    const minutes = parseInt(colonMatch[2], 10)
    return hours * 60 + minutes
  }
  
  return null
}

/**
 * Map common city names to IATA codes
 * This is a basic implementation - in production, you'd use a comprehensive airport database
 */
function mapCityToIATA(cityName: string): string {
  const city = cityName.toLowerCase().trim();
  
  // Common airport mappings
  const cityToIATA: Record<string, string> = {
    // Major US cities
    'new york': 'JFK',
    'nyc': 'JFK',
    'newyork': 'JFK',
    'los angeles': 'LAX',
    'la': 'LAX',
    'losangeles': 'LAX',
    'chicago': 'ORD',
    'miami': 'MIA',
    'san francisco': 'SFO',
    'sanfrancisco': 'SFO',
    'sf': 'SFO',
    'seattle': 'SEA',
    'boston': 'BOS',
    'denver': 'DEN',
    'atlanta': 'ATL',
    'dallas': 'DFW',
    'houston': 'IAH',
    'phoenix': 'PHX',
    'philadelphia': 'PHL',
    'detroit': 'DTW',
    'minneapolis': 'MSP',
    'orlando': 'MCO',
    'las vegas': 'LAS',
    'lasvegas': 'LAS',
    'vegas': 'LAS',
    'washington': 'DCA',
    'dc': 'DCA',
    
    // Major international cities
    'london': 'LHR',
    'paris': 'CDG',
    'tokyo': 'NRT',
    'beijing': 'PEK',
    'shanghai': 'PVG',
    'hong kong': 'HKG',
    'hongkong': 'HKG',
    'singapore': 'SIN',
    'dubai': 'DXB',
    'amsterdam': 'AMS',
    'frankfurt': 'FRA',
    'rome': 'FCO',
    'madrid': 'MAD',
    'barcelona': 'BCN',
    'munich': 'MUC',
    'zurich': 'ZUR',
    'vienna': 'VIE',
    'stockholm': 'ARN',
    'copenhagen': 'CPH',
    'oslo': 'OSL',
    'helsinki': 'HEL',
    'moscow': 'SVO',
    'istanbul': 'IST',
    'cairo': 'CAI',
    'johannesburg': 'JNB',
    'sydney': 'SYD',
    'melbourne': 'MEL',
    'toronto': 'YYZ',
    'vancouver': 'YVR',
    'montreal': 'YUL',
    'mexico city': 'MEX',
    'mexicocity': 'MEX',
    'sao paulo': 'GRU',
    'saopaulo': 'GRU',
    'rio de janeiro': 'GIG',
    'riodejaneiro': 'GIG',
    'rio': 'GIG',
    'buenos aires': 'EZE',
    'buenosaires': 'EZE',
    'lima': 'LIM',
    'bogota': 'BOG',
    'mumbai': 'BOM',
    'delhi': 'DEL',
    'bangalore': 'BLR',
    'kolkata': 'CCU',
    'chennai': 'MAA',
    'hyderabad': 'HYD',
    'pune': 'PNQ',
    'ahmedabad': 'AMD',
    'kochi': 'COK',
    'thiruvananthapuram': 'TRV',
    'calicut': 'CCJ',
    'coimbatore': 'CJB',
    'goa': 'GOI',
    'jakarta': 'CGK',
    'kuala lumpur': 'KUL',
    'kualalumpur': 'KUL',
    'bangkok': 'BKK',
    'manila': 'MNL',
    'seoul': 'ICN',
    'taipei': 'TPE',
    'ho chi minh': 'SGN',
    'hochiminh': 'SGN',
    'hanoi': 'HAN'
  };
  
  // Check for direct match first
  if (cityToIATA[city]) {
    return cityToIATA[city];
  }
  
  // Check if it's already a valid IATA code (3 letters)
  if (/^[A-Z]{3}$/i.test(cityName)) {
    return cityName.toUpperCase();
  }
  
  // Fallback: take first 3 characters and uppercase
  return cityName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
} 