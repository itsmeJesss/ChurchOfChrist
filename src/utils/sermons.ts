export const INITIAL_SERMONS = [
  {
    id: 'sermon-walking-in-love',
    title: 'Walking in Christian Love and Unity',
    author: 'Bro. Richard Raju',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: 'walking_in_love.pdf',
    uploadedAt: new Date('2026-08-15T10:00:00.000Z')
  },
  {
    id: 'sermon-the-living-hope',
    title: 'The Living Hope Through the Resurrection',
    author: 'Pastor Raju',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: 'living_hope.pdf',
    uploadedAt: new Date('2026-08-08T10:00:00.000Z')
  },
  {
    id: 'sermon-anchored-in-faith',
    title: 'Anchored in Faith: Overcoming the Storms of Life',
    author: 'Bro. George Tonsing',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: 'anchored_in_faith.pdf',
    uploadedAt: new Date('2026-08-01T10:00:00.000Z')
  }
];

export const mergeAndSortSermons = (dbSermons: any[]): any[] => {
  const mergedMap = new Map<string, any>();

  // Include initial default sermons as foundation
  INITIAL_SERMONS.forEach(s => {
    const key = s.fileName || s.title || s.id;
    mergedMap.set(key, {
      ...s,
      uploadDate: {
        toDate: () => new Date(s.uploadedAt)
      }
    });
  });

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
      id: s.id || key,
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
