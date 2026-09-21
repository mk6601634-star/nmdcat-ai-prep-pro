const apiKey = 'AIzaSyBv2XUZS-idpYic_47zXCRbrBNhAUNoGQo';
async function audit() {
  const authRes = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true })
  });
  const { idToken } = await authRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken };
  const baseUrl = 'https://nmdcat-ai-prep-pro.vercel.app';

  const tests = [
    ['1. Simple AI Quiz', '/api/generate-quiz-simple', { subject: 'Biology', topic: 'Cell Division', difficultyMode: 'NORMAL', quantity: 3 }],
    ['2. Specification AI Quiz', '/api/generate-quiz', { subject: 'Chemistry', chapter: 'Thermodynamics', topic: 'Enthalpy', quantity: 3 }],
    ['3. Wrong Answer Analysis', '/api/analyze-wrong-answer', { question: 'Glycolysis site?', options: ['A','B','C','D'], correctAnswer: 'A', userAnswer: 'B', explanation: 'Cytoplasm', topic: 'Respiration', subject: 'Biology' }],
    ['4. Deep AI Insights', '/api/deep-ai-insights', { questions: [{ question: 'Q1', concept: 'Cell', correctAnswer: 'A' }], userAnswers: { 0: 'A' }, subject: 'Biology', topic: 'Cell', difficultyMode: 'NORMAL' }],
    ['5. Flashcards Generator', '/api/generate-flashcards', { subject: 'Biology', topic: 'Enzymes', difficultyMode: 'NORMAL', quantity: 3 }],
    ['6. Mind Map Generator', '/api/generate-mindmap', { subject: 'Biology', topic: 'Heart Circulation', difficultyMode: 'NORMAL' }],
    ['7. Mnemonics Generator', '/api/generate-mnemonics', { subject: 'Chemistry', topic: 'Periodic Table', concept: 'Electronegativity', difficultyMode: 'NORMAL' }],
    ['8. Quick Mnemonic', '/api/generate-mnemonic', { subject: 'Biology', topic: 'Essential Amino Acids' }],
    ['9. Formula Generator', '/api/generate-formulas', { subject: 'Physics', chapter: 'Electrostatics', topic: 'Coulombs Law', difficultyMode: 'NORMAL' }],
    ['10. Reaction Hub Generator', '/api/generate-reactions', { subject: 'Chemistry', chapter: 'Aldehydes', topic: 'Nucleophilic Addition', difficultyMode: 'NORMAL' }],
    ['11. Definition Master', '/api/generate-definitions', { subject: 'Biology', chapter: 'Genetics', topic: 'Transcription', difficultyMode: 'NORMAL' }],
    ['12. Knowledge Graph', '/api/generate-knowledge-graph', { subject: 'Biology', topic: 'Immune System', difficultyMode: 'NORMAL' }],
    ['13. Multi-Level Notes', '/api/multilevel-notes', { topicName: 'Action Potential', subject: 'Biology', unit: 'Nervous System' }],
    ['14. AI Tutor Chat', '/api/ai-tutor', { question: 'Explain Km in enzymes', subject: 'Biology', mode: 'standard' }],
    ['15. Question Explainer', '/api/explain-question', { questionText: 'Unit of magnetic flux?', options: ['Tesla', 'Weber', 'Henry', 'Farad'], correctAnswer: 'Weber', userChoice: 'Tesla', subject: 'Physics' }],
    ['16. PRISM Research Queries', '/api/prism/research-queries', { topic: 'DKA vs HHS', subject: 'Biology' }],
    ['17. PRISM Synthesizer', '/api/prism/synthesize', { topic: 'DKA', subject: 'Biology', sources: [{ title: 'DKA', snippet: 'Insulin deficiency' }] }]
  ];

  let passCount = 0;
  for (const [name, url, body] of tests) {
    const t0 = Date.now();
    try {
      const res = await fetch(baseUrl + url, { method: 'POST', headers, body: JSON.stringify(body) });
      const elapsed = Date.now() - t0;
      const json = await res.json().catch(() => null);
      if (res.status === 200 && json && !json.error) {
        console.log('[PASS] ' + name + ' (' + elapsed + 'ms) -> Status: 200');
        passCount++;
      } else {
        const errStr = JSON.stringify(json || {}).slice(0, 120);
        console.log('[FAIL] ' + name + ' (' + elapsed + 'ms) -> Status: ' + res.status + ' | Error: ' + errStr);
      }
    } catch (e) {
      const elapsed = Date.now() - t0;
      console.log('[FAIL] ' + name + ' (' + elapsed + 'ms) -> Error: ' + e.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('\n=== AUDIT SUMMARY: ' + passCount + ' / ' + tests.length + ' PASSED ===');
}
audit().catch(console.error);
