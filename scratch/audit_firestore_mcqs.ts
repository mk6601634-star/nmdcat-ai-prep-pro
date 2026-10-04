import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import * as fs from 'fs';
import * as path from 'path';

// Load config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('================================================================');
console.log('PRODUCTION FIRESTORE MCQ DATABASE AUDIT (READ-ONLY)');
console.log('Target Firebase Project:', firebaseConfig.projectId);
console.log('Target Collection: mcqs');
console.log('================================================================\n');

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

async function runAudit() {
  try {
    console.log('Authenticating anonymously for Firestore security rule compliance...');
    try {
      const userCred = await signInAnonymously(auth);
      console.log('Authenticated successfully as:', userCred.user.uid);
    } catch (authErr: any) {
      console.warn('Anonymous auth note (proceeding):', authErr.message);
    }

    const docMap = new Map<string, any>();
    const mcqsRef = collection(db, 'mcqs');

    // 1. Fetch by status queries (matching firestore.rules)
    const statusesToQuery = ['PUBLISHED', 'VERIFIED', 'AI_GENERATED', 'DRAFT', 'ARCHIVED', 'REJECTED'];
    console.log('\n--- QUERYING FIRESTORE BY STATUS ---');
    for (const st of statusesToQuery) {
      try {
        const q = query(mcqsRef, where('status', '==', st));
        const snap = await getDocs(q);
        console.log(`Status [${st}]: Found ${snap.size} documents in Firestore`);
        snap.forEach(d => {
          docMap.set(d.id, { _firestoreDocId: d.id, ...d.data() });
        });
      } catch (e: any) {
        console.warn(`Query for status [${st}] failed:`, e.message);
      }
    }

    // 2. Fetch by subject queries
    const subjectsToQuery = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'];
    console.log('\n--- QUERYING FIRESTORE BY SUBJECT ---');
    for (const sub of subjectsToQuery) {
      try {
        const q = query(mcqsRef, where('subject', '==', sub));
        const snap = await getDocs(q);
        console.log(`Subject [${sub}]: Found ${snap.size} documents in Firestore`);
        snap.forEach(d => {
          docMap.set(d.id, { _firestoreDocId: d.id, ...d.data() });
        });
      } catch (e: any) {
        console.warn(`Query for subject [${sub}] failed:`, e.message);
      }
    }

    // 3. Fallback unconstrained collection scan
    try {
      const allSnap = await getDocs(mcqsRef);
      console.log(`Unconstrained getDocs(mcqs): ${allSnap.size} documents`);
      allSnap.forEach(d => {
        docMap.set(d.id, { _firestoreDocId: d.id, ...d.data() });
      });
    } catch (e: any) {
      console.log(`Unconstrained scan note (enforcing status security rules): ${e.message}`);
    }

    const allRecords = Array.from(docMap.values());
    console.log(`\nTOTAL UNIQUE FIRESTORE DOCUMENTS RETRIEVED: ${allRecords.length}`);

    // Save full JSON dump to scratch
    const dumpPath = path.join(process.cwd(), 'scratch', 'firestore_mcqs_dump.json');
    fs.writeFileSync(dumpPath, JSON.stringify(allRecords, null, 2), 'utf8');
    console.log(`Saved raw database snapshot to: ${dumpPath}`);

    // Comprehensive Audit Logic
    const summary = {
      firebaseProject: firebaseConfig.projectId,
      totalMCQs: allRecords.length,
      publishedCount: 0,
      nonPublishedCount: 0,
      statusCounts: {} as Record<string, number>,
      subjectCounts: {} as Record<string, number>,
      difficultyCounts: {} as Record<string, number>,
      sourceCounts: {} as Record<string, number>,
      subjectsBreakdown: {} as Record<string, {
        totalPublished: number;
        chapters: Record<string, number>;
        topics: Record<string, number>;
        difficulties: Record<string, number>;
        sources: Record<string, number>;
      }>,
      schemaIntegrity: {
        validCount: 0,
        missingMetadata: [] as any[],
        invalidMetadata: [] as any[],
        malformedRecords: [] as any[]
      },
      duplicates: [] as any[],
      subjectContamination: [] as any[],
      chapterTopicIssues: [] as any[],
      suspiciousOrDemo: [] as any[],
      sourceIntegrityIssues: [] as any[]
    };

    const questionMap = new Map<string, string[]>();

    for (const record of allRecords) {
      const docId = record._firestoreDocId || record.id || 'NO_ID';
      const status = (record.status || 'UNSPECIFIED').toUpperCase();
      summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;

      const isPublished = status === 'PUBLISHED' || status === 'VERIFIED';
      if (isPublished) summary.publishedCount++;
      else summary.nonPublishedCount++;

      const rawSub = record.subject || 'UNKNOWN_SUBJECT';
      summary.subjectCounts[rawSub] = (summary.subjectCounts[rawSub] || 0) + 1;

      const diff = record.difficulty || 'UNSPECIFIED';
      summary.difficultyCounts[diff] = (summary.difficultyCounts[diff] || 0) + 1;

      const src = record.sourceType || record.source || 'UNSPECIFIED';
      summary.sourceCounts[src] = (summary.sourceCounts[src] || 0) + 1;

      if (isPublished) {
        if (!summary.subjectsBreakdown[rawSub]) {
          summary.subjectsBreakdown[rawSub] = {
            totalPublished: 0,
            chapters: {},
            topics: {},
            difficulties: {},
            sources: {}
          };
        }
        const sb = summary.subjectsBreakdown[rawSub];
        sb.totalPublished++;
        const chap = record.chapter || 'NO_CHAPTER';
        sb.chapters[chap] = (sb.chapters[chap] || 0) + 1;
        const top = record.topic || 'NO_TOPIC';
        sb.topics[top] = (sb.topics[top] || 0) + 1;
        sb.difficulties[diff] = (sb.difficulties[diff] || 0) + 1;
        sb.sources[src] = (sb.sources[src] || 0) + 1;
      }

      // Schema Checks
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!record.question || typeof record.question !== 'string' || record.question.trim().length === 0) {
        errors.push('Missing question text');
      }
      if (!Array.isArray(record.options) || record.options.length < 3) {
        errors.push(`Invalid options array (count: ${record.options ? record.options.length : 0})`);
      } else {
        if (record.options.some((o: any) => !o || typeof o !== 'string' || o.trim().length === 0)) {
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
        summary.schemaIntegrity.malformedRecords.push({
          id: docId,
          subject: record.subject,
          chapter: record.chapter,
          question: record.question?.slice(0, 80),
          errors
        });
      } else if (warnings.length > 0) {
        summary.schemaIntegrity.missingMetadata.push({
          id: docId,
          subject: record.subject,
          chapter: record.chapter,
          topic: record.topic,
          question: record.question?.slice(0, 80),
          warnings
        });
      } else {
        summary.schemaIntegrity.validCount++;
      }

      // Duplicate Check
      if (record.question && typeof record.question === 'string') {
        const normQ = record.question.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
        if (normQ.length > 10) {
          if (!questionMap.has(normQ)) questionMap.set(normQ, []);
          questionMap.get(normQ)!.push(docId);
        }
      }

      // Subject Cross-Contamination Check
      const fullText = `${record.question || ''} ${record.explanation || ''} ${(record.options || []).join(' ')}`.toLowerCase();
      const subLower = (record.subject || '').toLowerCase();

      if (subLower.includes('logical') || subLower.includes('reasoning')) {
        if (fullText.includes('acceleration') || fullText.includes('velocity') || fullText.includes('resistor') || fullText.includes('electric field') || fullText.includes('momentum') || fullText.includes('wavelength')) {
          summary.subjectContamination.push({
            id: docId,
            storedSubject: record.subject,
            storedChapter: record.chapter,
            storedTopic: record.topic,
            questionText: record.question?.slice(0, 100),
            reason: 'Physics terminology found under Logical Reasoning subject',
            recommendedClassification: 'Physics',
            confidence: 'HIGH',
            action: 'REVIEW'
          });
        }
      } else if (subLower.includes('biology')) {
        if (fullText.includes('sp2 hybridization') || fullText.includes('oxidation state') || fullText.includes('gibbs free energy') || fullText.includes('electronegativity of fluorine')) {
          summary.subjectContamination.push({
            id: docId,
            storedSubject: record.subject,
            storedChapter: record.chapter,
            storedTopic: record.topic,
            questionText: record.question?.slice(0, 100),
            reason: 'Chemistry terminology found under Biology subject',
            recommendedClassification: 'Chemistry',
            confidence: 'HIGH',
            action: 'REVIEW'
          });
        }
      }

      // Demo/Placeholder Detection
      const demoMatches = fullText.match(/\b(sample question|demo question|test question #?\d*|placeholder|dummy data|fake test)\b/i);
      if (demoMatches) {
        summary.suspiciousOrDemo.push({
          id: docId,
          subject: record.subject,
          chapter: record.chapter,
          topic: record.topic,
          questionText: record.question?.slice(0, 100),
          matchedPhrase: demoMatches[0],
          action: 'REVIEW'
        });
      }

      // Source Integrity Check
      if ((record.sourceType === 'PAST_PAPER' || record.source === 'PAST_PAPER') && !record.pastPaperTag && !record.pastPaperYear && !record.sourceReference) {
        summary.sourceIntegrityIssues.push({
          id: docId,
          subject: record.subject,
          question: record.question?.slice(0, 80),
          issue: 'Marked as PAST_PAPER but missing pastPaperTag/year reference',
          action: 'REVIEW'
        });
      }
    }

    // Process duplicates
    for (const [normQ, ids] of questionMap.entries()) {
      if (ids.length > 1) {
        summary.duplicates.push({
          normalizedSnippet: normQ.slice(0, 50),
          count: ids.length,
          docIds: ids,
          classification: 'EXACT_DUPLICATE'
        });
      }
    }

    // Write summary report JSON
    const summaryPath = path.join(process.cwd(), 'scratch', 'firestore_audit_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`Saved audit analysis to: ${summaryPath}`);

    console.log('\n================================================================');
    console.log('AUDIT EXECUTION COMPLETE');
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('Audit execution error:', err);
    process.exit(1);
  }
}

runAudit();
