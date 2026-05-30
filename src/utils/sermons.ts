export const mergeAndSortSermons = (dbSermons: any[]): any[] => {
  const mergedMap = new Map<string, any>();

  // Process DB versions directly
  dbSermons.forEach(s => {
    const key = s.storagePath || s.fileName || s.pdfUrl || s.fileUrl || s.id;
    let computedDate: Date;
    
    // Support either uploadedAt or uploadDate (both formats are parsed for resilience)
    const dateField = s.uploadedAt || s.uploadDate;
    
    if (dateField) {
      if (typeof dateField.toDate === 'function') {
        computedDate = dateField.toDate();
      } else if (dateField.seconds) {
        computedDate = new Date(dateField.seconds * 1000);
      } else if (typeof dateField === 'string' || typeof dateField === 'number' || dateField instanceof Date) {
        computedDate = new Date(dateField);
      } else {
        computedDate = new Date();
      }
    } else {
      computedDate = new Date();
    }

    mergedMap.set(key, {
      ...s,
      id: s.id,
      pdfUrl: s.pdfUrl || s.fileUrl,
      author: s.author || s.preacher || 'Church Of Christ',
      storagePath: s.storagePath || s.fileName,
      uploadDate: {
        toDate: () => computedDate
      }
    });
  });

  // Convert map to array and sort descending by date
  return Array.from(mergedMap.values()).sort((a, b) => {
    const timeA = a.uploadDate?.toDate().getTime() || 0;
    const timeB = b.uploadDate?.toDate().getTime() || 0;
    return timeB - timeA;
  });
};
