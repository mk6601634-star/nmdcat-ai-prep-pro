const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('================================================================');
console.log('PRODUCTION FIRESTORE MCQ DATABASE AUDIT VIA ADMIN SDK');
console.log('Target Firebase Project:', firebaseConfig.projectId);
console.log('================================================================\n');

const app = !getApps().length ? initializeApp({ projectId: firebaseConfig.projectId }) : getApps()[0];
const db = getFirestore(app);

async function runAdminAudit() {
  try {
    console.log('Fetching documents from mcqs collection...');
    const snapshot = await db.collection('mcqs').get();
    console.log(`TOTAL DOCUMENTS IN mcqs COLLECTION: ${snapshot.size}`);

    const allRecords = [];
    snapshot.forEach(docSnap => {
      allRecords.push({
        _firestoreDocId: docSnap.id,
        ...docSnap.data()
      });
    });

    const dumpPath = path.join(process.cwd(), 'scratch', 'firestore_mcqs_dump.json');
    fs.writeFileSync(dumpPath, JSON.stringify(allRecords, null, 2), 'utf8');
    console.log(`Saved ${allRecords.length} records to ${dumpPath}`);

    // Breakdowns
    const statusCounts = {};
    const subjectCounts = {};
    const diffCounts = {};
    const sourceCounts = {};
    const subjectsBreakdown = {};

    let publishedCount = 0;
    let nonPublishedCount = 0;

    const malformed = [];
    const missingMetadata = [];
    let validCount = 0;
    const questionTextMap = new Map();
    const duplicates = [];
    const subjectContamination = [];
    const suspiciousOrDemo = [];
    const sourceIssues = [];

    for (const record of allRecords) {
      const docId = record._firestoreDocId || record.id || 'NO_ID';
      const status = (record.status || 'UNSPECIFIED').toUpperCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const isPublished = status === 'PUBLISHED' || status === 'VERIFIED';
      if (isPublished) publishedCount++;
      else nonPublishedCount++;

      const rawSub = record.subject || 'UNKNOWN_SUBJECT';
      subjectCounts[rawSub] = (subjectCounts[rawSub] || 0) + 1;

      const diff = record.difficulty || 'UNSPECIFIED';
      diffCounts[diff] = (diffCounts[diff] || 0) + 1;

      const src = record.sourceType || record.source || 'UNSPECIFIED';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;

      if (!subjectsBreakdown[rawSub]) {
        subjectsBreakdown[rawSub] = {
          total: 0,
          published: 0,
          chapters: {},
          topics: {},
          difficulties: {},
          sources: {}
        };
      }
      const sb = subjectsBreakdown[rawSub];
      sb.total++;
      if (isPublished) sb.published++;
      const chap = record.chapter || 'NO_CHAPTER';
      sb.chapters[chap] = (sb.chapters[chap] || 0) + 1;
      const top = record.topic || 'NO_TOPIC';
      sb.topics[top] = (sb.topics[top] || 0) + 1;
      sb.difficulties[diff] = (sb.difficulties[diff] || 0) + 1;
      sb.sources[src] = (sb.sources[src] || 0) + 1;

      // Schema Checks
      const errors = [];
      const warnings = [];

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
        errors.push(`correctIndex (${record.correctIndex}) out of option bounds`);
      }
      if (!record.subject) warnings.push('Missing subject');
      if (!record.chapter) warnings.push('Missing chapter');
      if (!record.topic) warnings.push('Missing topic');
      if (!record.explanation) warnings.push('Missing explanation');

      if (errors.length > 0) {
        malformed.push({ id: docId, subject: record.subject, chapter: record.chapter, errors });
      } else if (warnings.length > 0) {
        missingMetadata.push({ id: docId, subject: record.subject, chapter: record.chapter, topic: record.topic, warnings });
      } else {
        validCount++;
      }

      // Duplicates
      if (record.question && typeof record.question === 'string') {
        const normQ = record.question.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
        if (normQ.length > 10) {
          if (!questionTextMap.has(normQ)) questionTextMap.set(normQ, []);
          questionTextMap.get(normQ).push(docId);
        }
      }

      // Contamination
      const fullText = `${record.question || ''} ${record.explanation || ''} ${(record.options || []).join(' ')}`.toLowerCase();
      const subLower = (record.subject || '').toLowerCase();
      if (subLower.includes('logical') || subLower.includes('reasoning')) {
        if (fullText.includes('acceleration') || fullText.includes('velocity') || fullText.includes('resistor') || fullText.includes('electric field') || fullText.includes('momentum') || fullText.includes('wavelength')) {
          subjectContamination.push({
            id: docId,
            storedSubject: record.subject,
            storedChapter: record.chapter,
            storedTopic: record.topic,
            questionText: record.question ? record.question.slice(0, 100) : '',
            reason: 'Physics concepts found under Logical Reasoning',
            recommendedClassification: 'Physics',
            confidence: 'HIGH',
            action: 'REVIEW'
          });
        }
      }

      // Demo/Placeholder
      const demoMatches = fullText.match(/\b(sample question|demo question|test question #?\d*|placeholder|dummy data|fake test)\b/i);
      if (demoMatches) {
        suspiciousOrDemo.push({
          id: docId,
          subject: record.subject,
          questionText: record.question ? record.question.slice(0, 100) : '',
          matchedPhrase: demoMatches[0],
          action: 'REVIEW'
        });
      }

      // Source integrity
      if ((record.sourceType === 'PAST_PAPER' || record.source === 'PAST_PAPER') && !record.pastPaperTag && !record.pastPaperYear && !record.sourceReference) {
        sourceIssues.push({
          id: docId,
          subject: record.subject,
          question: record.question ? record.question.slice(0, 80) : '',
          issue: 'Marked as PAST_PAPER but missing pastPaperTag/year',
          action: 'REVIEW'
        });
      }
    }

    for (const [normQ, ids] of questionTextMap.entries()) {
      if (ids.length > 1) {
        duplicates.push({
          snippet: normQ.slice(0, 50),
          count: ids.length,
          docIds: ids
        });
      }
    }

    const fullSummary = {
      firebaseProject: firebaseConfig.projectId,
      totalMCQs: allRecords.length,
      publishedCount,
      nonPublishedCount,
      statusCounts,
      subjectCounts,
      diffCounts,
      sourceCounts,
      subjectsBreakdown,
      schemaSummary: {
        validCount,
        malformedCount: malformed.length,
        missingMetadataCount: missingMetadata.length,
        malformedList: malformed,
        missingMetadataList: missingMetadata
      },
      duplicatesCount: duplicates.length,
      duplicatesList: duplicates,
      subjectContaminationCount: subjectContamination.length,
      subjectContaminationList: subjectContamination,
      suspiciousOrDemoCount: suspiciousOrDemo.length,
      suspiciousOrDemoList: suspiciousOrDemo,
      sourceIssuesCount: sourceIssues.length,
      sourceIssuesList: sourceIssues
    };

    const summaryPath = path.join(process.cwd(), 'scratch', 'firestore_audit_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(fullSummary, null, 2), 'utf8');
    console.log(`Saved detailed audit summary to ${summaryPath}`);

    console.log('\n================================================================');
    console.log('AUDIT FINDINGS SUMMARY:');
    console.log('Total Documents:', allRecords.length);
    console.log('Published:', publishedCount, '| Non-Published:', nonPublishedCount);
    console.log('Status Breakdown:', JSON.stringify(statusCounts));
    console.log('Subject Breakdown:', JSON.stringify(subjectCounts));
    console.log('Difficulty Breakdown:', JSON.stringify(diffCounts));
    console.log('Source Breakdown:', JSON.stringify(sourceCounts));
    console.log('Schema Valid:', validCount, '| Malformed:', malformed.length, '| Missing Metadata:', missingMetadata.length);
    console.log('Duplicate Groups:', duplicates.length);
    console.log('Subject Contamination Candidates:', subjectContamination.length);
    console.log('Suspicious/Demo Candidates:', suspiciousOrDemo.length);
    console.log('Source Integrity Issues:', sourceIssues.length);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Admin SDK audit error:', err);
    process.exit(1);
  }
}

runAdminAudit();
