export const useSearchTemplate = (
  templates: any[],
  setSearchTemplate: (x: any) => void,
) => {
  const search = (searchTag: string) => {
    if (searchTag.length === 0) {
      setSearchTemplate([]);
    } else {
      const currTexts = templates.filter(({ tag }) =>
        tag.toLowerCase().includes(searchTag.toLowerCase()),
      );

      setSearchTemplate(currTexts);
    }
  };

  return { search };
};
