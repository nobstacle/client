import { useState, useCallback } from 'react';

export const useSearchDocument = (documents: any[], setSearchDocuments: (docs: any[]) => void) => {
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback((searchTerm: string) => {
    setIsSearching(true);

    if (!searchTerm.trim()) {
      setSearchDocuments([]);
      setIsSearching(false);
      return;
    }

    const filteredDocuments = documents.filter((document) => {
      const searchLower = searchTerm.toLowerCase();

      const matchesTag = document.tag?.toLowerCase().includes(searchLower);
      const matchesName = document.name?.toLowerCase().includes(searchLower);
      const matchesDescription = document.description?.toLowerCase().includes(searchLower);
      const matchesExt = document.ext?.toLowerCase().includes(searchLower);

      return matchesTag || matchesName || matchesDescription || matchesExt;
    });

    setSearchDocuments(filteredDocuments);
    setIsSearching(false);
  }, [documents, setSearchDocuments]);

  const clearSearch = useCallback(() => {
    setSearchDocuments([]);
    setIsSearching(false);
  }, [setSearchDocuments]);

  return { search, clearSearch, isSearching };
};