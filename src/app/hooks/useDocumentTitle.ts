import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    // Only update if title is provided
    if (title) {
      document.title = `${title} - Cahaya POS`;
    }
  }, [title]);
}
