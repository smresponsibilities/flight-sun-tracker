import { NextRequest, NextResponse } from 'next/server';
import { calculateSunPositionForFlight, type FlightDetails, type FlightRecommendation } from '@/lib/flightCalculator';

// Request body interface
interface RecommendationRequest {
  departure: string;
  arrival: string;
  departureTime: string; // ISO string that we'll convert to Date
  durationMinutes: number;
}

// Response interfaces
interface SuccessResponse {
  success: true;
  data: FlightRecommendation;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

type ApiResponse = SuccessResponse | ErrorResponse;

function validateIataCode(code: string, fieldName: string): string | null {
  if (!code || typeof code !== 'string') {
    return `${fieldName} is required and must be a string`;
  }
  
  const trimmedCode = code.trim().toUpperCase();
  
  if (trimmedCode.length !== 3) {
    return `${fieldName} must be exactly 3 characters (e.g., LAX, JFK)`;
  }
  
  if (!/^[A-Z]{3}$/.test(trimmedCode)) {
    return `${fieldName} must contain only letters (e.g., LAX, JFK)`;
  }
  
  return null;
}

function validateDepartureTime(timeString: string): { error?: string; date?: Date } {
  if (!timeString || typeof timeString !== 'string') {
    return { error: 'Departure time is required and must be a valid ISO string (e.g., 2024-01-15T14:30:00Z)' };
  }
  
  const date = new Date(timeString);
  
  if (isNaN(date.getTime())) {
    return { error: 'Departure time must be a valid ISO string (e.g., 2024-01-15T14:30:00Z)' };
  }
  
  // Check if date is not too far in the past (more than 1 day ago)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (date < oneDayAgo) {
    return { error: 'Departure time cannot be more than 1 day in the past' };
  }
  
  // Check if date is not too far in the future (more than 1 year)
  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  if (date > oneYearFromNow) {
    return { error: 'Departure time cannot be more than 1 year in the future' };
  }
  
  return { date };
}

function validateDuration(duration: any): string | null {
  if (duration === undefined || duration === null) {
    return 'Flight duration is required';
  }
  
  if (typeof duration !== 'number' || isNaN(duration)) {
    return 'Flight duration must be a valid number (in minutes)';
  }
  
  if (duration <= 0) {
    return 'Flight duration must be greater than 0 minutes';
  }
  
  if (duration > 20 * 60) { // 20 hours max
    return 'Flight duration cannot exceed 20 hours (1200 minutes)';
  }
  
  if (duration < 30) { // 30 minutes minimum
    return 'Flight duration must be at least 30 minutes';
  }
  
  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // Parse request body
    let body: RecommendationRequest;
    
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body. Please check your request format.',
        },
        { status: 400 }
      );
    }
    
    // Validate input fields
    const errors: string[] = [];
    
    // Validate departure airport
    const departureError = validateIataCode(body.departure, 'Departure airport');
    if (departureError) errors.push(departureError);
    
    // Validate arrival airport
    const arrivalError = validateIataCode(body.arrival, 'Arrival airport');
    if (arrivalError) errors.push(arrivalError);
    
    // Check if departure and arrival are the same
    if (body.departure && body.arrival && 
        body.departure.trim().toUpperCase() === body.arrival.trim().toUpperCase()) {
      errors.push('Departure and arrival airports must be different');
    }
    
    // Validate departure time
    const { error: timeError, date: departureDate } = validateDepartureTime(body.departureTime);
    if (timeError) errors.push(timeError);
    
    // Validate duration
    const durationError = validateDuration(body.durationMinutes);
    if (durationError) errors.push(durationError);
    
    // Return validation errors if any
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors.join('; '),
        },
        { status: 400 }
      );
    }
    
    // Prepare flight details for calculator
    const flightDetails: FlightDetails = {
      departure: body.departure.trim().toUpperCase(),
      arrival: body.arrival.trim().toUpperCase(),
      departureTime: departureDate!,
      durationMinutes: body.durationMinutes,
    };
    
    // Call the calculator function
    const recommendation = calculateSunPositionForFlight(flightDetails);
    
    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: recommendation,
      },
      { status: 200 }
    );
    
  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('API /recommendation error:', error);
    
    // Check for known calculation errors (from the calculator function)
    if (error instanceof Error && error.message.includes('Airport not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Airport not found. Please check your airport codes.',
          details: error.message,
        },
        { status: 400 }
      );
    }
    
    // Return generic error for any other unexpected errors (security)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while processing your request.',
      },
      { status: 500 }
    );
  }
}

// Handle non-POST requests
export async function GET(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to get flight recommendations.',
    },
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to get flight recommendations.',
    },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to get flight recommendations.',
    },
    { status: 405 }
  );
}

export async function PATCH(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to get flight recommendations.',
    },
    { status: 405 }
  );
} 