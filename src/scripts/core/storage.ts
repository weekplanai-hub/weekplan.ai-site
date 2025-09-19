export function saveLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Unable to persist to localStorage', error);
  }
}

export function loadLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Unable to read from localStorage', error);
    return null;
  }
}

export function deleteLocal(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Unable to delete from localStorage', error);
  }
}
