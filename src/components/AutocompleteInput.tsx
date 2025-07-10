'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import airportsData from '@/lib/data/airports.json';
import styles from './AutocompleteInput.module.css';

interface Airport {
  iata: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface SearchableAirport extends Airport {
  displayText: string;
  searchTerms: string[];
  cityName: string;
}

interface AutocompleteInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  excludeValue?: string; // For same-airport validation
}

// Extract city name from airport name
function extractCityName(airportName: string): string {
  // Common patterns to extract city names
  const patterns = [
    // "John F Kennedy International Airport" -> "New York"
    /^([^-]+?)\s+(?:International|Regional|Municipal|Airport|Intl)/i,
    // "London Heathrow Airport" -> "London"
    /^([A-Za-z\s]+?)\s+[A-Za-z]+\s+(?:International|Regional|Municipal|Airport|Intl)/i,
    // "Charles de Gaulle International Airport" -> "Paris" (harder case)
    // For now, just take first word(s) before common airport terms
  ];

  // Manual city mappings for known airports
  const cityMappings: Record<string, string> = {
    'Hartsfield Jackson Atlanta International Airport': 'Atlanta',
    'Dubai International Airport': 'Dubai',
    'Dallas Fort Worth International Airport': 'Dallas',
    'Tokyo International Airport': 'Tokyo',
    'London Heathrow Airport': 'London',
    'Denver International Airport': 'Denver',
    "Chicago O'Hare International Airport": 'Chicago',
    'Istanbul Airport': 'Istanbul',
    'Los Angeles International Airport': 'Los Angeles',
    'Charles de Gaulle International Airport': 'Paris',
    'Harry Reid International Airport': 'Las Vegas',
    'Suvarnabhumi Airport': 'Bangkok',
    'Miami International Airport': 'Miami',
    'Phoenix Sky Harbor International Airport': 'Phoenix',
    'Singapore Changi International Airport': 'Singapore',
    'Seattle Tacoma International Airport': 'Seattle',
    'John F Kennedy International Airport': 'New York',
    'Amsterdam Airport Schiphol': 'Amsterdam',
    'Minneapolis-St Paul International/Wold-Chamberlain Airport': 'Minneapolis',
    'San Diego International Airport': 'San Diego',
    'Frankfurt am Main International Airport': 'Frankfurt',
    'Incheon International Airport': 'Seoul',
    'Orlando International Airport': 'Orlando',
    'Newark Liberty International Airport': 'Newark',
    'Guangzhou Baiyun International Airport': 'Guangzhou',
    'Charlotte Douglas International Airport': 'Charlotte',
    'Munich International Airport': 'Munich',
    'Narita International Airport': 'Tokyo',
    'Madrid Barajas International Airport': 'Madrid',
    'Shanghai Pudong International Airport': 'Shanghai',
    'Taiwan Taoyuan International Airport': 'Taipei',
    'La Guardia Airport': 'New York',
  };

  if (cityMappings[airportName]) {
    return cityMappings[airportName];
  }

  // Fallback: extract first meaningful word(s)
  for (const pattern of patterns) {
    const match = airportName.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Last resort: take first word
  return airportName.split(' ')[0];
}

export default function AutocompleteInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  className = '',
  placeholder,
  required,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  excludeValue
}: AutocompleteInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSelected, setIsSelected] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filteredAirports, setFilteredAirports] = useState<SearchableAirport[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Process airports data into searchable format
  const searchableAirports = useMemo<SearchableAirport[]>(() => {
    return airportsData.airports.map((airport: Airport) => {
      const cityName = extractCityName(airport.name);
      const displayText = `${airport.name} - ${cityName} (${airport.iata})`;
      
      return {
        ...airport,
        cityName,
        displayText,
        searchTerms: [
          airport.iata.toLowerCase(),
          airport.name.toLowerCase(),
          cityName.toLowerCase(),
          // Add partial matches for city names
          ...cityName.toLowerCase().split(' '),
          // Add airport name words for better matching
          ...airport.name.toLowerCase().split(' ').filter(word => 
            word.length > 2 && !['airport', 'international', 'regional', 'municipal'].includes(word)
          )
        ]
      };
    });
  }, []);

  // Filter airports based on input
  const filterAirports = useMemo(() => {
    return (query: string): SearchableAirport[] => {
      if (!query || query.length < 1) return [];
      
      const searchQuery = query.toLowerCase().trim();
      const results: SearchableAirport[] = [];
      
             // Priority 1: Exact IATA code match
       const exactIataMatch = searchableAirports.find(airport => 
         airport.iata.toLowerCase() === searchQuery
       );
       if (exactIataMatch && (!excludeValue || exactIataMatch.iata.toUpperCase() !== excludeValue.toUpperCase())) {
         results.push(exactIataMatch);
       }
      
             // Priority 2: IATA code starts with query
       searchableAirports.forEach(airport => {
         if (airport.iata.toLowerCase().startsWith(searchQuery) && 
             !results.find(r => r.iata === airport.iata) &&
             (!excludeValue || airport.iata.toUpperCase() !== excludeValue.toUpperCase())) {
           results.push(airport);
         }
       });
      
             // Priority 3: City name starts with query
       searchableAirports.forEach(airport => {
         if (airport.cityName.toLowerCase().startsWith(searchQuery) && 
             !results.find(r => r.iata === airport.iata) &&
             (!excludeValue || airport.iata.toUpperCase() !== excludeValue.toUpperCase())) {
           results.push(airport);
         }
       });
      
             // Priority 4: Any search term contains query
       searchableAirports.forEach(airport => {
         const hasMatch = airport.searchTerms.some(term => 
           term.includes(searchQuery)
         );
         
         if (hasMatch && 
             !results.find(r => r.iata === airport.iata) &&
             (!excludeValue || airport.iata.toUpperCase() !== excludeValue.toUpperCase())) {
           results.push(airport);
         }
       });
      
      // Limit results for performance
      return results.slice(0, 15);
    };
  }, [searchableAirports, excludeValue]);

  // Initialize component state from prop value
  useEffect(() => {
    if (value && !isSelected) {
      // Check if the value is an IATA code that matches an airport
      const airport = searchableAirports.find(a => 
        a.iata.toLowerCase() === value.toLowerCase()
      );
      
      if (airport) {
        setInputValue(airport.displayText);
        setIsSelected(true);
      } else {
        setInputValue(value);
        setIsSelected(false);
      }
    } else if (!value) {
      setInputValue('');
      setIsSelected(false);
    }
  }, [value, searchableAirports, isSelected]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsSelected(false);
    setHighlightedIndex(-1);
    
    // Filter and show suggestions
    const filtered = filterAirports(newValue);
    setFilteredAirports(filtered);
    setShowSuggestions(newValue.length >= 1 && filtered.length > 0);
    
    // Update parent with raw input for validation
    const syntheticEvent = {
      ...e,
      target: { ...e.target, value: newValue }
    };
    onChange(syntheticEvent);
  };

  // Handle airport selection
  const selectAirport = (airport: SearchableAirport) => {
    setInputValue(airport.displayText);
    setIsSelected(true);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    
    // Update parent with IATA code for backend processing
    const syntheticEvent = {
      target: { name, value: airport.iata }
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Clear on backspace when airport is selected
    if (e.key === 'Backspace' && isSelected) {
      setInputValue('');
      setIsSelected(false);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      
      const syntheticEvent = {
        target: { name, value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
      return;
    }

    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredAirports.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredAirports.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredAirports[highlightedIndex]) {
          selectAirport(filteredAirports[highlightedIndex]);
        }
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle blur with delay to allow for selection clicks
  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      onBlur();
    }, 150);
  };

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionsRef.current) {
      const highlightedElement = suggestionsRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className={styles.container}>
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        className={`${className} ${isSelected ? styles.selected : ''}`}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (!isSelected && inputValue.length >= 1) {
            const filtered = filterAirports(inputValue);
            setFilteredAirports(filtered);
            setShowSuggestions(filtered.length > 0);
          }
        }}
        placeholder={placeholder}
        required={required}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
        aria-haspopup="listbox"
        aria-controls={`${id}-suggestions`}
        role="combobox"
        autoComplete="off"
      />
      
      {showSuggestions && (
        <ul
          ref={suggestionsRef}
          id={`${id}-suggestions`}
          className={styles.suggestions}
          role="listbox"
          aria-label="Airport suggestions"
        >
          {filteredAirports.map((airport, index) => (
            <li
              key={airport.iata}
              className={`${styles.suggestion} ${
                index === highlightedIndex ? styles.highlighted : ''
              }`}
              role="option"
              aria-selected={index === highlightedIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                selectAirport(airport);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className={styles.airportName}>{airport.name}</div>
              <div className={styles.airportDetails}>
                {airport.cityName} ({airport.iata})
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 