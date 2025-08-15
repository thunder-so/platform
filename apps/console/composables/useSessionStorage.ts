import { ref, watch } from 'vue';

export const useSessionStorage = <T>(key: string, defaultValue: () => T) => {
  const state = ref<T>(defaultValue());

  if (process.client) {
    const storedValue = sessionStorage.getItem(key);
    if (storedValue) {
      try {
        state.value = JSON.parse(storedValue);
      } catch (e) {
        console.error(`Error parsing sessionStorage item ${key}:`, e);
        sessionStorage.removeItem(key);
      }
    }
  }

  watch(state, (newValue) => {
    if (process.client) {
      if (newValue === null || newValue === undefined || (typeof newValue === 'object' && Object.keys(newValue).length === 0)) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, JSON.stringify(newValue));
      }
    }
  }, { deep: true });

  return state;
};
