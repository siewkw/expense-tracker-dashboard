import { useCallback, useState } from 'react';

const STORAGE_KEY = 'savelah-include-travel-expenses';

function readPreference() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useTravelReportingPreference() {
  const [includeTravelExpenses, setValue] = useState(readPreference);

  const setIncludeTravelExpenses = useCallback((value: boolean) => {
    setValue(value);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // The in-memory preference still works when storage is unavailable.
    }
  }, []);

  return { includeTravelExpenses, setIncludeTravelExpenses };
}
