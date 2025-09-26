'use client';

import React, { useState, useCallback } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchFieldProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  delay?: number;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

export const SearchField: React.FC<SearchFieldProps> = ({
  placeholder = 'Поиск...',
  onSearch,
  delay = 300,
  fullWidth = false,
  size = 'medium',
}) => {
  const [query, setQuery] = useState('');
  
  const debouncedQuery = useDebounce(query, delay);

  React.useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  return (
    <TextField
      value={query}
      onChange={handleChange}
      placeholder={placeholder}
      size={size}
      fullWidth={fullWidth}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search />
          </InputAdornment>
        ),
        endAdornment: query && (
          <InputAdornment position="end">
            <IconButton
              aria-label="clear search"
              onClick={handleClear}
              edge="end"
              size="small"
            >
              <Clear />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};