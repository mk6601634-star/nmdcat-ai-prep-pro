const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('================================================================');
console.log('PRODUCTION FIRESTORE MCQ DATABASE COMPLETE AUDIT (READ-ONLY)');
console.log('Firebase Project:', firebaseConfig.projectId);
console.log('Collection: mcqs');
console.log('================================================================\n');

function decodeFirestoreValue(val) {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = decodeFirestoreValue(v);
    }
    return obj;
  }
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  return val;
}

function decodeFirestoreDoc(doc) {
  const obj = {
    _firestoreDocId: doc.name.split('/').pop(),
    _createTime: doc.createTime,
    _updateTime: doc.updateTime
  };
  for (const [k, v] of Object.entries(doc.fields || {})) {
    obj[k] = decodeFirestoreValue(v);
  }
  return obj;
}

async function fetchAllMcqs() {
  const allDocs = [];
  let pageToken = '';
  let pageNumber = 1;

  while (true) {
    let url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/mcqs?key=${firebaseConfig.apiKey}&pageSize=300`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    console.log(`Fetching page ${pageNumber}...`);
    const res = await fetch(url);
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Firestore REST API returned ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const docs = data.documents || [];
    for (const d of docs) {
      allDocs.push(decodeFirestoreDoc(d));
    }

    console.log(`Page ${pageNumber}: fetched ${docs.length} documents (Cumulative: ${allDocs.length})`);

    if (data.nextPageToken) {
      pageToken = data.nextPageToken;
      pageNumber++;
    } else {
      break;
    }
  }

  return allDocs;
}

async function auditDatabase() {
  const allRecords = await fetchAllMcqs();
  console.log(`\nTOTAL PRODUCTION DOCUMENTS RETRIEVED: ${allRecords.length}`);

  const dumpPath = path.join(process.cwd(), 'scratch', 'firestore_mcqs_dump.json');
  fs.writeFileSync(dumpPath, JSON.stringify(allRecords, null, 2), 'utf8');
  console.log(`Saved raw JSON dump to ${dumpPath}`);

  // Summary object
  const summary = {
    firebaseProject: firebaseConfig.projectId,
    totalCount: allRecords.length,
    publishedCount: 0,
    nonPublishedCount: 0,
    statusCounts: {},
    subjectCounts: {},
    difficultyCounts: {},
    sourceCounts: {},
    subjectsBreakdown: {},
    schemaValidation: {
      validCount: 0,
      missingMetadata: [],
      invalidMetadata: [],
      malformedRecords: []
    },
    duplicates: [],
    subjectContamination: [],
    chapterTopicIssues: [],
    suspiciousOrDemo: [],
    sourceIssues: [],
    seedComparison: {
      seededMatchesCount: 0,
      organicCount: 0
    }
  };

  const questionMap = new Map();

  for (const record of allRecords) {
    const docId = record._firestoreDocId || record.id || 'NO_ID';
    const rawStatus = (record.status || 'UNSPECIFIED').toUpperCase();
    summary.statusCounts[rawStatus] = (summary.statusCounts[rawStatus] || 0) + 1;

    const isPublished = rawStatus === 'PUBLISHED' || rawStatus === 'VERIFIED';
    if (isPublished) summary.publishedCount++;
    else summary.nonPublishedCount++;

    const rawSub = record.subject || 'UNKNOWN_SUBJECT';
    summary.subjectCounts[rawSub] = (summary.subjectCounts[rawSub] || 0) + 1;

    const diff = record.difficulty || 'UNSPECIFIED';
    summary.difficultyCounts[diff] = (summary.difficultyCounts[diff] || 0) + 1;

    const src = record.sourceType || record.source || 'UNSPECIFIED';
    summary.sourceCounts[src] = (summary.sourceCounts[src] || 0) + 1;

    if (!summary.subjectsBreakdown[rawSub]) {
      summary.subjectsBreakdown[rawSub] = {
        total: 0,
        published: 0,
        chapters: {},
        topics: {},
        difficulties: {},
        sources: {}
      };
    }
    const sb = summary.subjectsBreakdown[rawSub];
    sb.total++;
    if (isPublished) sb.published++;
    const chap = record.chapter || 'NO_CHAPTER';
    sb.chapters[chap] = (sb.chapters[chap] || 0) + 1;
    const top = record.topic || 'NO_TOPIC';
    sb.topics[top] = (sb.topics[top] || 0) + 1;
    sb.difficulties[diff] = (sb.difficulties[diff] || 0) + 1;
    sb.sources[src] = (sb.sources[src] || 0) + 1;

    // 1. Schema Integrity Checks
    const errors = [];
    const missing = [];

    if (!record.question || typeof record.question !== 'string' || record.question.trim().length === 0) {
      errors.push('Missing question text');
    }
    if (!Array.isArray(record.options) || record.options.length < 3) {
      errors.push(`Invalid options array (count: ${record.options ? record.options.length : 0})`);
    } else {
      if (record.options.some(o => !o || typeof o !== 'string' || o.trim().length === 0)) {
        errors.push('One or more option strings are empty');
      }
    }
    if (typeof record.correctIndex !== 'number' || record.correctIndex < 0 || (record.options && record.correctIndex >= record.options.length)) {
      errors.push(`correctIndex (${record.correctIndex}) out of option bounds (options count: ${record.options ? record.options.length : 0})`);
    }

    if (!record.subject) missing.push('Missing subject');
    if (!record.chapter) missing.push('Missing chapter');
    if (!record.topic) missing.push('Missing topic');
    if (!record.explanation) missing.push('Missing explanation');
    if (!record.difficulty) missing.push('Missing difficulty');

    if (errors.length > 0) {
      summary.schemaValidation.malformedRecords.push({
        id: docId,
        subject: record.subject,
        chapter: record.chapter,
        question: record.question ? record.question.slice(0, 80) : '',
        errors,
        classification: 'MALFORMED'
      });
    } else if (missing.length > 0) {
      summary.schemaValidation.missingMetadata.push({
        id: docId,
        subject: record.subject,
        chapter: record.chapter,
        topic: record.topic,
        question: record.question ? record.question.slice(0, 80) : '',
        missingFields: missing,
        classification: 'MISSING_METADATA'
      });
    } else {
      summary.schemaValidation.validCount++;
    }

    // 2. Duplicate Detection
    if (record.question && typeof record.question === 'string') {
      const normQ = record.question.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
      if (normQ.length > 10) {
        if (!questionMap.has(normQ)) questionMap.set(normQ, []);
        questionMap.get(normQ).push({ id: docId, fullQ: record.question });
      }
    }

    // 3. Subject Cross-Contamination
    const fullText = `${record.question || ''} ${record.explanation || ''} ${(record.options || []).join(' ')}`.toLowerCase();
    const subLower = (record.subject || '').toLowerCase();

    if (subLower.includes('logical') || subLower.includes('reasoning')) {
      if (fullText.includes('acceleration') || fullText.includes('velocity') || fullText.includes('resistor') || fullText.includes('electric field') || fullText.includes('momentum') || fullText.includes('wavelength') || fullText.includes('capacitance')) {
        summary.subjectContamination.push({
          id: docId,
          storedSubject: record.subject,
          storedChapter: record.chapter,
          storedTopic: record.topic,
          questionText: record.question ? record.question.slice(0, 100) : '',
          reason: 'Physics concepts/units found under Logical Reasoning',
          recommendedClassification: 'Physics',
          confidence: 'HIGH',
          action: 'REVIEW'
        });
      }
    } else if (subLower.includes('biology')) {
      if (fullText.includes('sp2 hybridization') || fullText.includes('oxidation state') || fullText.includes('electronegativity of fluorine') || fullText.includes('sn1 reaction')) {
        summary.subjectContamination.push({
          id: docId,
          storedSubject: record.subject,
          storedChapter: record.chapter,
          storedTopic: record.topic,
          questionText: record.question ? record.question.slice(0, 100) : '',
          reason: 'Organic/Physical Chemistry concepts found under Biology',
          recommendedClassification: 'Chemistry',
          confidence: 'HIGH',
          action: 'REVIEW'
        });
      }
    }

    // 4. Demo/Placeholder Detection
    const demoMatches = fullText.match(/\b(sample question|demo question|test question\s*#?\d*|placeholder|dummy data|fake test)\b/i);
    if (demoMatches) {
      summary.suspiciousOrDemo.push({
        id: docId,
        subject: record.subject,
        chapter: record.chapter,
        questionText: record.question ? record.question.slice(0, 100) : '',
        matchedPhrase: demoMatches[0],
        action: 'REVIEW'
      });
    }

    // 5. Source Integrity
    if ((record.sourceType === 'PAST_PAPER' || record.source === 'PAST_PAPER') && !record.pastPaperTag && !record.pastPaperYear && !record.sourceReference) {
      summary.sourceIssues.push({
        id: docId,
        subject: record.subject,
        question: record.question ? record.question.slice(0, 80) : '',
        issue: 'Marked as PAST_PAPER but missing pastPaperTag/year',
        action: 'REVIEW'
      });
    }
  }

  // Duplicates list
  for (const [normQ, items] of questionMap.entries()) {
    if (items.length > 1) {
      summary.duplicates.push({
        normalizedSnippet: normQ.slice(0, 50),
        count: items.length,
        docIds: items.map(i => i.id),
        sampleQuestion: items[0].fullQ
      });
    }
  }

  const summaryJsonPath = path.join(process.cwd(), 'scratch', 'firestore_audit_summary.json');
  fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Saved audit analysis summary to ${summaryJsonPath}`);

  console.log('\n================================================================');
  console.log('AUDIT SUMMARY:');
  console.log('Total Documents:', summary.totalCount);
  console.log('Published:', summary.publishedCount, '| Non-Published:', summary.nonPublishedCount);
  console.log('Status Counts:', JSON.stringify(summary.statusCounts));
  console.log('Subject Counts:', JSON.stringify(summary.subjectCounts));
  console.log('Difficulty Counts:', JSON.stringify(summary.difficultyCounts));
  console.log('Source Counts:', JSON.stringify(summary.sourceCounts));
  console.log('Valid Schema:', summary.schemaValidation.validCount);
  console.log('Malformed:', summary.schemaValidation.malformedRecords.length);
  console.log('Missing Metadata:', summary.schemaValidation.missingMetadata.length);
  console.log('Duplicate Groups:', summary.duplicates.length);
  console.log('Subject Contamination:', summary.subjectContamination.length);
  console.log('Suspicious / Demo:', summary.suspiciousOrDemo.length);
  console.log('Source Issues:', summary.sourceIssues.length);
  console.log('================================================================\n');
}

auditDatabase().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
