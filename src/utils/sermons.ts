export const mergeAndSortSermons = (dbSermons: any[]): any[] => {
  // Load from localStorage
  let localSermons: any[] = [];
  try {
    const raw = localStorage.getItem('sermons_backup');
    if (raw) {
      localSermons = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse local sermons:', e);
  }

  // Combine sermons, preferring the Firestore version if they have the same pdfUrl or storagePath
  const mergedMap = new Map<string, any>();

  // Add local first
  localSermons.forEach(s => {
    const key = s.storagePath || s.pdfUrl || s.id;
    const rawDate = s.uploadDateRaw || s.uploadedAtRaw || s.uploadDate || s.uploadedAt || Date.now();
    mergedMap.set(key, {
      ...s,
      uploadDate: {
        toDate: () => new Date(rawDate)
      }
    });
  });

  // Overwrite or append with DB versions
  dbSermons.forEach(s => {
    const key = s.storagePath || s.pdfUrl || s.id;
    let computedDate: Date;
    
    // Fallbacks for any time-related fields (uploadDate, uploadedAt, etc.)
    const dateField = s.uploadDate || s.uploadedAt;
    
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
