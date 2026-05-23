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
    mergedMap.set(key, {
      ...s,
      uploadDate: {
        toDate: () => new Date(s.uploadDateRaw || s.uploadDate || Date.now())
      }
    });
  });

  // Overwrite or append with DB versions
  dbSermons.forEach(s => {
    const key = s.storagePath || s.pdfUrl || s.id;
    let computedDate: Date;
    if (s.uploadDate) {
      if (typeof s.uploadDate.toDate === 'function') {
        computedDate = s.uploadDate.toDate();
      } else if (s.uploadDate.seconds) {
        computedDate = new Date(s.uploadDate.seconds * 1000);
      } else {
        computedDate = new Date(s.uploadDate);
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
