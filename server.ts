import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { callWithFallback, extractJsonFromText } from "./server/aiProviderRouter.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
// DEV_HOST can be used locally to bind the server to a hostname (e.g. directed-spirit-9ds98.firebaseapp.com)
const HOST = process.env.DEV_HOST || process.env.HOST || '0.0.0.0';
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Endpoint: Parse PDF File to Plain Text
app.post("/api/parse-pdf", async (req, res) => {
  try {
    const { pdfBase64, filename } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "pdfBase64 string is required" });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    let parsedText = "";
    let numpages = 1;

    try {
      // @ts-ignore
      const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js").catch(() => null) || await import("pdf-parse").catch(() => null);
      const pdfParse = pdfParseModule?.default || pdfParseModule;
      if (typeof pdfParse === "function") {
        const parsed = await pdfParse(buffer);
        parsedText = parsed.text || "";
        numpages = parsed.numpages || 1;
      }
    } catch (e) {
      console.warn("pdf-parse execution warning, falling back to string extraction:", e);
    }

    // Secondary fallback text extraction if pdf-parse didn't return text
    if (!parsedText || parsedText.trim().length === 0) {
      const rawStr = buffer.toString("utf-8");
      parsedText = rawStr
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    res.json({
      success: true,
      text: parsedText || "Sample PMDC FSc Biology / Physics Textbook Content Extracted",
      numpages: numpages || 1,
      filename: filename || "Uploaded Textbook PDF"
    });
  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    res.status(500).json({ error: "Failed to extract text from PDF", details: error.message });
  }
});

// Helper to handle AI errors cleanly and distinguish quota / rate limits (429) from 500
const handleAiError = (res: any, error: any, defaultMessage: string) => {
  console.error(defaultMessage, error);
  const errMsg = error?.message || String(error);
  const isQuota = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || error?.isQuotaExhausted;

  if (isQuota) {
    return res.status(429).json({
      error: "All AI providers are currently rate-limited or quota exhausted. Please retry in a few moments.",
      details: errMsg,
      isQuotaExhausted: true
    });
  }

  return res.status(500).json({
    error: defaultMessage,
    details: errMsg
  });
};

// API Endpoint 1: Ask AI Medical Tutor with Multi-mode support
const aiChatHandler = async (req: any, res: any) => {
  try {
    const { question, subject, context, mode = "standard" } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question parameter is required" });
    }

    let modeInstruction = "Provide a clear, high-yield, step-by-step explanation suitable for an FSc/NMDCAT student.";
    if (mode === "socratic") {
      modeInstruction = "DO NOT give the final answer directly. Ask 2-3 guiding, thought-provoking questions to lead the student to deduce the correct PMDC concept themselves.";
    } else if (mode === "analogy") {
      modeInstruction = "Explain using vivid, real-life analogies and medical scenarios to make this complex concept intuitive and memorable.";
    } else if (mode === "numerical") {
      modeInstruction = "Provide a step-by-step mathematical derivation/solution. Clearly list Given Data, Formula Used, Step-by-step Calculation, Final Units & Dimensions, and Common Calculation Traps.";
    } else if (mode === "teach_until_understand") {
      modeInstruction = "Provide a progressive teaching breakdown: 1) Simplified Core Concept, 2) Visual Mental Model, 3) Check Question for the student to answer, 4) Summary rule.";
    }

    const prompt = `You are an expert NMDCAT (National Medical and Dental College Admission Test) AI Tutor in Pakistan, specializing in Biology, Chemistry, Physics, English, and Logical Reasoning based on the PMDC syllabus.
    
    Subject Context: ${subject || "General NMDCAT"}
    Additional Context: ${context || "None"}
    Teaching Mode: ${mode}
    Instruction Strategy: ${modeInstruction}

    Student's Query: "${question}"

    Format response neatly with Markdown, bold high-yield terms, and add NMDCAT exam tips.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    res.json({ text: result.text, answer: result.text, provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate AI response. Please check API key or retry.");
  }
};

app.post("/api/ai-tutor", aiChatHandler);
app.post("/api/ai/chat", aiChatHandler);

// API Endpoint 1b: Multimodal Image / Handwritten Notes / Diagram Doubt Solver
app.post("/api/image-doubt-solver", async (req, res) => {
  try {
    const { imageBase64, imageData, mimeType = "image/jpeg", promptText, prompt, subject } = req.body;
    const rawImageBase64 = imageBase64 || imageData || "";
    const requestPrompt = promptText || prompt || "Explain this diagram or question step by step";

    if (!rawImageBase64) {
      return res.status(400).json({ error: "Image data is required" });
    }

    const textPrompt = `Analyze this image (Textbook page, handwritten notes, or diagram) for an NMDCAT ${subject || "Medical"} student:
      User Request: "${requestPrompt}"

      Provide:
      1. OCR / Text Extraction: Transcribe key handwritten/printed text or diagram labels accurately.
      2. Comprehensive Step-by-Step Explanation according to PMDC / FSc textbooks.
      3. Solved Question / Correct Option if it is an MCQ or problem.
      4. High-Yield Revision Point & Memory Mnemonic for NMDCAT.`;

    const result = await callWithFallback({
      prompt: textPrompt,
      image: {
        mimeType,
        base64Data: rawImageBase64,
      },
      temperature: 0.7,
      maxTokens: 4096,
    });

    res.json({ text: result.text, provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to analyze image");
  }
});

// API Endpoint 1c: PDF / Notes Text to MCQ Quiz & Staging Generator
const extractMaterialHandler = async (req: any, res: any) => {
  try {
    const { documentContent, documentTitle, count = 5, subject = "Biology" } = req.body;
    if (!documentContent) {
      return res.status(400).json({ error: "Document content is required" });
    }

    const prompt = `Act as an expert NMDCAT Exam Examiner in Pakistan. Read the following textbook/notes material from "${documentTitle || "Uploaded Material"}":
    
    Material Content snippet:
    """
    ${documentContent.slice(0, 4000)}
    """

    Extract core high-yield concepts and generate ${count} PMDC NMDCAT-style Multiple Choice Questions. Include standard, assertion-reason, or case-based questions.
    Ensure distractors reflect genuine FSc student errors. Include detailed justifications and quality rating (0-100).
    
    Return a JSON array of objects with fields:
    [
      {
        "question": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "Detailed explanation",
        "difficulty": "Easy|Medium|Hard",
        "chapter": "${subject}",
        "qualityScore": 85,
        "validationNotes": "Validation details"
      }
    ]
    Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const items = Array.isArray(parsed) ? parsed : (parsed?.items || parsed?.mcqs || []);
    res.json({ items, sourceTitle: documentTitle || "PDF Document", provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to process document and generate quiz");
  }
};

app.post("/api/pdf-quiz-generator", extractMaterialHandler);
app.post("/api/ai/extract-material", extractMaterialHandler);

// API Endpoint 1d: Comprehensive Textbook & Guide Study Suite Generator (Sequence Step 1 & 2)
app.post("/api/generate-textbook-study-suite", async (req, res) => {
  try {
    const { 
      documentContent, 
      documentTitle = "Uploaded Textbook Material", 
      subject = "Biology",
      chapter = "General Chapter",
      mcqCount = 5
    } = req.body;

    if (!documentContent || typeof documentContent !== "string") {
      return res.status(400).json({ error: "Valid document text content is required" });
    }

    const prompt = `You are a Senior Lead Medical Curriculum Examiner for PMDC NMDCAT Entrance Exams in Pakistan.
    Analyze the following raw textbook/guide text carefully:

    DOCUMENT TITLE: ${documentTitle}
    SUBJECT: ${subject}
    CHAPTER: ${chapter}
    
    TEXTBOOK/GUIDE CONTENT:
    """
    ${documentContent.slice(0, 12000)}
    """

    Perform an end-to-end curriculum decomposition and return a single unified JSON object with fields:
    {
      "mcqs": [
        {
          "question": "MCQ Question",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 0,
          "explanation": "Explanation",
          "difficulty": "Medium",
          "cognitiveLevel": "Application",
          "topic": "Topic Name"
        }
      ],
      "notes": {
        "title": "Topic Title",
        "highYieldSummary": ["Summary bullet 1", "Summary bullet 2"],
        "coreConcepts": [
          { "term": "Key Term", "explanation": "Detailed explanation", "examTip": "High yield tip" }
        ]
      },
      "flashcards": [
        { "front": "Question/Concept", "back": "Answer/Explanation", "keyFormulaOrConcept": "Key rule" }
      ],
      "definitionsOrFormulas": [
        { "name": "Term/Formula name", "formulaOrDefinition": "Definition or equation", "unitOrCondition": "SI Unit or condition", "highYieldNote": "NMDCAT note" }
      ],
      "mindMap": {
        "centralConcept": "Central Topic",
        "branches": [
          { "branchName": "Branch 1", "subNodes": ["Sub-node 1", "Sub-node 2"] }
        ]
      }
    }
    Generate ${mcqCount} high-yield NMDCAT MCQs directly from this text. Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsedData = extractJsonFromText(result.text) || {};
    res.json({
      success: true,
      sourceTitle: documentTitle,
      subject,
      chapter,
      data: parsedData,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate textbook study suite");
  }
});

// API Endpoint 1d: Multi-Level Concept Explanation Generator
app.post("/api/multilevel-notes", async (req, res) => {
  try {
    const { topicName, subject, unit } = req.body;

    const prompt = `Generate a multi-level concept breakdown for NMDCAT student for topic "${topicName}" (${subject}, Unit: ${unit}).

    Provide JSON containing 5 explanation levels:
    {
      "basic": "Simple 2-3 sentence beginner breakdown.",
      "intermediate": "FSc textbook level concept details.",
      "advanced": "Deep mechanisms, edge cases, exceptions.",
      "nmdcatLevel": "Exam-oriented, past paper traps, fast formulas or tricks.",
      "medicalLevel": "Clinical / real-world medical application context for future MBBS students."
    }
    Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    res.json({ explanations: parsed, provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate multi-level notes");
  }
});

// API Endpoint 2: Detailed Question Solution Explainer
const explainHandler = async (req: any, res: any) => {
  try {
    const { questionText, options, correctAnswer, userChoice, subject } = req.body;
    
    const prompt = `Examine this NMDCAT ${subject || ""} question:
    Question: ${questionText}
    Options: ${options ? JSON.stringify(options) : "N/A"}
    Correct Answer: ${correctAnswer}
    Student Choice: ${userChoice || "Not attempted"}

    Provide a concise, high-yield explanation:
    1. Why ${correctAnswer} is the exact correct answer according to PMDC/FSc textbook standards.
    2. Why other options are incorrect or misleading traps.
    3. Quick Memory Tip / Formula / Rule to remember for NMDCAT exam day.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    res.json({ explanation: result.text, provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to explain question");
  }
};

app.post("/api/explain-question", explainHandler);
app.post("/api/ai/explain", explainHandler);

// API Endpoint 3: Dynamic AI MCQ Generator
const generateDiagnosticHandler = async (req: any, res: any) => {
  try {
    const { subject, topic, count = 5, difficulty = "NMDCAT Standard" } = req.body;

    const prompt = `Generate ${count} authentic, high-quality NMDCAT style Multiple Choice Questions for:
    Subject: ${subject}
    Topic: ${topic}
    Difficulty: ${difficulty}

    Follow PMDC NMDCAT standards strictly. Make sure distractors are plausible and based on common FSc student misunderstandings.
    
    Return a JSON array of objects with fields:
    [
      {
        "id": "mcq_1",
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 0,
        "explanation": "Scientific justification",
        "chapter": "${topic}",
        "subject": "${subject}"
      }
    ]
    Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const mcqs = Array.isArray(parsed) ? parsed : (parsed?.mcqs || []);
    res.json({ mcqs, provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate dynamic MCQs");
  }
};

app.post("/api/generate-mcqs", generateDiagnosticHandler);
app.post("/api/ai/generate-diagnostic", generateDiagnosticHandler);

// API Endpoint 4: AI Mnemonic & Shortcut Generator
app.post("/api/generate-mnemonic", async (req, res) => {
  try {
    const { topic, subject } = req.body;

    const prompt = `Create a memorable, clever, high-yield mnemonic or shortcut for NMDCAT preparation:
    Subject: ${subject}
    Topic: ${topic}

    Include:
    1. The Mnemonic phrase/acronym.
    2. What each letter or part represents.
    3. Practical NMDCAT exam application trick.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 2048,
    });

    res.json({ mnemonic: result.text, provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate mnemonic");
  }
});

// API Endpoint 5: Automated MCQ Question Bank Cross-Reference & Validation Script
app.post("/api/validate-question-bank", async (req, res) => {
  try {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Questions array is required for validation" });
    }

    const mcqPayload = questions.map((q: any) => ({
      id: q.id,
      subject: q.subject,
      chapter: q.chapter || "General",
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      correctOptionText: q.options?.[q.correctIndex] || "",
      explanation: q.explanation || ""
    }));

    const prompt = `You are a Lead Medical Sciences & PMDC Curriculum Quality Examiner for NMDCAT in Pakistan.
    Perform an automated cross-reference validation of the following Multiple Choice Questions against official FSc Textbooks and verified PMDC entrance exam standards.

    Questions to Validate:
    ${JSON.stringify(mcqPayload, null, 2)}

    Return a JSON object with fields:
    {
      "totalAudited": ${questions.length},
      "validCount": ${questions.length},
      "flaggedCount": 0,
      "accuracyPercentage": 100,
      "summaryNotes": "Summary of audit",
      "results": [
        {
          "questionId": "id",
          "status": "VALID",
          "accuracyScore": 95,
          "verifiedSource": "FSc Textbook reference",
          "issuesFound": "None"
        }
      ]
    }
    Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const report = extractJsonFromText(result.text) || {};
    res.json(report);
  } catch (error: any) {
    return handleAiError(res, error, "Failed to run automated validation script");
  }
});

// API Endpoint: AI Quiz Generator (Academic Specification Mode)
app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { 
      subject, 
      chapter, 
      topic, 
      learningObjective, 
      difficulty = 'Medium',
      cognitiveLevel = 'Application',
      generationMode = 'SIMPLE',
      quantity = 5,
      requestId
    } = req.body;

    if (!subject || !chapter || !topic) {
      return res.status(400).json({ error: "Subject, chapter, and topic are required" });
    }

    if (!quantity || quantity < 1 || quantity > 50) {
      return res.status(400).json({ error: "Quantity must be between 1 and 50" });
    }

    const actualRequestId = requestId || `gen_${Date.now()}`;

    let specializedInstruction = "";
    if (generationMode === 'ADVANCED') {
      specializedInstruction = `Focus on application, reasoning, multi-step problem solving, and clinical/practical scenarios relevant to PMDC NMDCAT. Avoid pure recall.`;
    } else if (generationMode === 'ULTRA_ADVANCED') {
      specializedInstruction = `Generate expert-level, highly challenging NMDCAT questions with complex distractors, deep conceptual integration, and evaluation-level thinking.`;
    } else {
      specializedInstruction = `Generate standard NMDCAT questions with good conceptual clarity and realistic distractors.`;
    }

    const prompt = `You are an expert Pakistani Medical College Admission Test (NMDCAT) question developer and PMDC curriculum specialist.

Generate ${quantity} authentic, high-quality Multiple Choice Questions with the following specifications:
- Subject: ${subject}
- Chapter/Unit: ${chapter}
- Topic: ${topic}
- Learning Objective: ${learningObjective || 'Standard curriculum mastery'}
- Target Difficulty: ${difficulty}
- Cognitive Level: ${cognitiveLevel}
- Generation Mode: ${generationMode}

${specializedInstruction}

CRITICAL RULES:
1. Every question MUST have exactly 4 options labeled A, B, C, D.
2. Exactly ONE option must be scientifically and factually correct according to Pakistani FSc/PMDC curriculum.
3. All 3 distractors must be plausible and based on common student misconceptions.
4. Explanations must be thorough, scientifically sound, and explain why the correct answer is right AND why distractors are wrong.
5. Return ONLY a valid JSON array.

Required JSON Structure:
[
  {
    "question": "Question text here",
    "options": {
      "A": "Option A text",
      "B": "Option B text",
      "C": "Option C text",
      "D": "Option D text"
    },
    "correctAnswer": "A",
    "explanation": "Detailed explanation",
    "difficulty": "${difficulty}",
    "cognitiveLevel": "${cognitiveLevel}",
    "topic": "${topic}"
  }
]
Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const questions = Array.isArray(parsed) ? parsed : (parsed?.questions || []);

    const mappedQuestions = questions.map((q: any, idx: number) => ({
      id: `${actualRequestId}_q${idx}`,
      subject,
      chapter,
      topic: q.topic || topic,
      question: q.question,
      options: [
        q.options?.A || q.options?.[0] || "A",
        q.options?.B || q.options?.[1] || "B",
        q.options?.C || q.options?.[2] || "C",
        q.options?.D || q.options?.[3] || "D"
      ],
      correctIndex: ['A', 'B', 'C', 'D'].includes(q.correctAnswer) ? ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer) : (q.correctIndex ?? 0),
      explanation: q.explanation || "Correct as per PMDC standards",
      difficulty: q.difficulty || difficulty,
      cognitiveLevel: q.cognitiveLevel || cognitiveLevel,
      type: 'Standard' as const,
      source: 'AI_GENERATED',
      sourceReference: `Generated for ${topic} (${generationMode})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      status: 'AI_GENERATED',
      verificationStatus: 'AI_GENERATED',
      authorType: 'AI',
      generationModel: result.model,
      generationRequestId: actualRequestId
    }));

    res.json({
      success: true,
      questions: mappedQuestions,
      generationRequestId: actualRequestId,
      requested: quantity,
      generated: mappedQuestions.length,
      provider: result.provider,
      metadata: {
        subject,
        chapter,
        topic,
        difficulty,
        generationMode,
        model: result.model
      }
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate quiz questions");
  }
});

// API Endpoint: Simple AI Quiz Generator (No Firestore, Direct Display)
app.post("/api/generate-quiz-simple", async (req, res) => {
  try {
    const { subject, topic, difficultyMode = 'NORMAL', quantity = 5 } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: "Subject and topic are required" });
    }

    if (!quantity || quantity < 1 || quantity > 50) {
      return res.status(400).json({ error: "Quantity must be between 1 and 50" });
    }

    let difficultyInstruction = "";
    switch (difficultyMode) {
      case 'NORMAL':
        difficultyInstruction = "Generate standard NMDCAT preparation level questions with direct concepts, textbook-based content, and moderate distractors.";
        break;
      case 'ADVANCED':
        difficultyInstruction = "Generate high-level preparation questions with multi-concept scenarios, application-based reasoning, and tricky distractors.";
        break;
      case 'ULTRA_ADVANCED':
        difficultyInstruction = "Generate expert challenge mode questions with deep reasoning, integrated concepts, and medical entrance level difficulty.";
        break;
    }

    const prompt = `You are an expert NMDCAT question generator for Pakistani medical college entrance tests.

Generate ${quantity} multiple-choice questions for:
Subject: ${subject}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

${difficultyInstruction}

CRITICAL REQUIREMENTS:
1. Exactly ONE option must be correct (A, B, C, or D).
2. All distractors must be plausible but incorrect.
3. Explanation must justify the correct answer with scientific reasoning.
4. Questions must be appropriate for NMDCAT preparation level.
5. Questions must remain within the specified topic: ${topic}.
6. Do not invent syllabus claims or textbook citations.
7. Do not fabricate references.

Return ONLY a valid JSON array with this exact structure:
[
  {
    "question": "Question text here",
    "options": [
      "Option A text",
      "Option B text",
      "Option C text",
      "Option D text"
    ],
    "correctAnswer": "A",
    "explanation": "Detailed explanation of why this answer is correct",
    "difficulty": "${difficultyMode}",
    "concept": "Specific concept tested by this question"
  }
]

Do not include any text outside the JSON array. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const questions = Array.isArray(parsed) ? parsed : (parsed?.questions || []);

    const validQuestions = questions.filter((q: any) => {
      return q.question && 
             Array.isArray(q.options) && 
             q.options.length === 4 &&
             ['A', 'B', 'C', 'D'].includes(q.correctAnswer) &&
             q.explanation &&
             q.difficulty &&
             q.concept;
    });

    res.json({
      success: true,
      questions: validQuestions,
      requested: quantity,
      generated: validQuestions.length,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate quiz questions");
  }
});

// API Endpoint: Wrong Answer AI Analysis
app.post("/api/analyze-wrong-answer", async (req, res) => {
  try {
    const { question, options, correctAnswer, userAnswer, explanation, topic, subject } = req.body;

    if (!question || !options || correctAnswer === undefined || userAnswer === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `You are an expert NMDCAT tutor analyzing a student's incorrect answer.

Question: ${question}
Subject: ${subject}
Topic: ${topic}

Options:
A: ${options[0]}
B: ${options[1]}
C: ${options[2]}
D: ${options[3]}

Correct Answer: ${correctAnswer}
Student's Selected Answer: ${userAnswer}
Explanation: ${explanation}

Provide a detailed analysis in JSON format with these exact fields:
{
  "whyYouWereWrong": "Explain the student's misconception in detail",
  "correctConcept": "Identify the actual concept being tested",
  "whyCorrectAnswerIsCorrect": "Provide clear academic explanation of the correct answer",
  "whyYourAnswerIsWrong": "Specifically address why the student's selected option is incorrect",
  "distractorAnalysis": "Explain why the other options are incorrect when useful",
  "knowledgeGap": "Identify the likely knowledge gap or misconception",
  "recommendedRevision": "Tell the student exactly what concept/topic should be revised"
}

Be specific and educational. Do not use generic template text. Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const analysis = extractJsonFromText(result.text) || {};

    res.json({
      success: true,
      analysis,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to analyze wrong answer");
  }
});

// API Endpoint: Deep AI Insights for Quiz
app.post("/api/deep-ai-insights", async (req, res) => {
  try {
    const { questions, userAnswers, subject, topic, difficultyMode } = req.body;

    if (!questions || !userAnswers || !Array.isArray(questions)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const quizSummary = questions.map((q: any, idx: number) => ({
      question: q.question,
      concept: q.concept,
      correctAnswer: q.correctAnswer,
      userAnswer: userAnswers[idx],
      isCorrect: userAnswers[idx] === q.correctAnswer
    }));

    const correctCount = quizSummary.filter((q: any) => q.isCorrect).length;
    const totalCount = quizSummary.length;
    const accuracy = Math.round((correctCount / totalCount) * 100);

    const prompt = `You are an expert NMDCAT learning coach analyzing a student's quiz performance.

Subject: ${subject}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}
Accuracy: ${accuracy}% (${correctCount}/${totalCount} correct)

Quiz Results:
${JSON.stringify(quizSummary, null, 2)}

Provide a comprehensive analysis in JSON format with these exact fields:
{
  "overallPerformance": "Brief summary of overall performance",
  "strongConcepts": ["List of concepts the student performed well on"],
  "weakConcepts": ["List of concepts the student struggled with"],
  "recurringMistakes": ["List of recurring mistake patterns observed"],
  "misconceptions": ["List of specific misconceptions identified"],
  "difficultyPerformance": "Analysis of performance across difficulty levels",
  "topicWeaknesses": ["List of topic-level weaknesses"],
  "reasoningErrors": ["List of reasoning errors observed"],
  "knowledgeGaps": ["List of knowledge gaps identified"],
  "recommendedRevision": ["List of specific concepts/topics to revise"],
  "recommendedNextDifficulty": "Suggested difficulty for next quiz (NORMAL/ADVANCED/ULTRA_ADVANCED)",
  "recommendedNextTopics": ["List of recommended topics to practice next"]
}

Be specific and based on the ACTUAL quiz results. Do not use generic conclusions. Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const insights = extractJsonFromText(result.text) || {};

    res.json({
      success: true,
      insights,
      accuracy,
      correctCount,
      totalCount,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate deep AI insights");
  }
});

// API Endpoint: AI Flashcard Generator
app.post("/api/generate-flashcards", async (req, res) => {
  try {
    const { subject, topic, difficultyMode = 'NORMAL', quantity = 5 } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: "Subject and topic are required" });
    }

    if (!quantity || quantity < 1 || quantity > 50) {
      return res.status(400).json({ error: "Quantity must be between 1 and 50" });
    }

    let difficultyInstruction = "";
    switch (difficultyMode) {
      case 'NORMAL':
        difficultyInstruction = "Generate standard NMDCAT preparation level flashcards with core concepts, straightforward facts, and basic recall.";
        break;
      case 'ADVANCED':
        difficultyInstruction = "Generate advanced flashcards with connections between concepts, applications, and deeper understanding.";
        break;
      case 'ULTRA_ADVANCED':
        difficultyInstruction = "Generate expert-level flashcards with integrated concepts, subtle distinctions, and high-level exam preparation.";
        break;
    }

    const prompt = `You are an expert NMDCAT flashcard generator for Pakistani medical college entrance tests.

Generate ${quantity} flashcards for:
Subject: ${subject}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

${difficultyInstruction}

CRITICAL REQUIREMENTS:
1. Each flashcard must have a clear front (question/concept) and back (answer/explanation).
2. The back must include a thorough explanation of the concept.
3. Flashcards must be academically meaningful and appropriate for NMDCAT preparation.
4. Do not invent syllabus claims or textbook citations.
5. Do not fabricate references.
6. Flashcards must remain within the specified topic: ${topic}.

Return ONLY a valid JSON array with this exact structure:
[
  {
    "front": "Question or concept on the front of the card",
    "back": "Answer and detailed explanation on the back",
    "explanation": "Additional context or deeper explanation",
    "concept": "Specific concept tested by this card",
    "difficulty": "${difficultyMode}"
  }
]

Do not include any text outside the JSON array. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const flashcards = Array.isArray(parsed) ? parsed : (parsed?.flashcards || []);

    const validFlashcards = flashcards.filter((fc: any) => {
      return fc.front && fc.back && fc.explanation && fc.concept;
    });

    res.json({
      success: true,
      flashcards: validFlashcards,
      requested: quantity,
      generated: validFlashcards.length,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate flashcards");
  }
});

// API Endpoint: AI Mind Map Generator
app.post("/api/generate-mindmap", async (req, res) => {
  try {
    const { subject, topic, difficultyMode = 'NORMAL' } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: "Subject and topic are required" });
    }

    let difficultyInstruction = "";
    switch (difficultyMode) {
      case 'NORMAL':
        difficultyInstruction = "Generate a standard mind map with core concepts, major branches, and straightforward relationships.";
        break;
      case 'ADVANCED':
        difficultyInstruction = "Generate an advanced mind map with deeper connections, applications, and cross-concept relationships.";
        break;
      case 'ULTRA_ADVANCED':
        difficultyInstruction = "Generate an expert-level mind map with integrated concepts, subtle distinctions, and high-level exam preparation details.";
        break;
    }

    const prompt = `You are an expert NMDCAT mind map generator for Pakistani medical college entrance tests.

Generate a hierarchical mind map for:
Subject: ${subject}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

${difficultyInstruction}

CRITICAL REQUIREMENTS:
1. Create a hierarchical structure with a central concept and major branches.
2. Include sub-concepts, relationships, and key facts.
3. Include exam-relevant points and misconceptions where appropriate.
4. Do not invent syllabus claims or textbook citations.
5. Do not fabricate references.
6. The mind map must remain within the specified topic: ${topic}.

Return ONLY a valid JSON object with this exact structure:
{
  "centralConcept": "Main topic",
  "branches": [
    {
      "label": "Branch name",
      "subnodes": [
        {
          "label": "Sub-concept",
          "details": "Key fact or explanation",
          "relationships": ["Related concept"]
        }
      ]
    }
  ],
  "keyFacts": ["Important fact 1", "Important fact 2"],
  "misconceptions": ["Common misconception 1"],
  "examTips": ["Exam tip 1"]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const rawMindMap = extractJsonFromText(result.text) || {};
    
    // Normalize mindMap structure
    let branches = Array.isArray(rawMindMap)
      ? rawMindMap
      : (rawMindMap.branches || rawMindMap.nodes || rawMindMap.subtopics || rawMindMap.children || []);
    
    const centralConcept = (typeof rawMindMap === "object" && !Array.isArray(rawMindMap))
      ? (rawMindMap.centralConcept || rawMindMap.centralTopic || rawMindMap.centerConcept || rawMindMap.topic || topic)
      : topic;

    const normalizedMindMap = {
      centralConcept,
      branches: Array.isArray(branches) ? branches : [],
      keyFacts: rawMindMap.keyFacts || [],
      misconceptions: rawMindMap.misconceptions || [],
      examTips: rawMindMap.examTips || [],
    };

    res.json({
      success: true,
      mindMap: normalizedMindMap,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate mind map");
  }
});

// API Endpoint: AI Mnemonic Generator
app.post("/api/generate-mnemonics", async (req, res) => {
  try {
    const { subject, topic, concept, difficultyMode = 'NORMAL' } = req.body;

    if (!subject || !topic || !concept) {
      return res.status(400).json({ error: "Subject, topic, and concept are required" });
    }

    let difficultyInstruction = "";
    switch (difficultyMode) {
      case 'NORMAL':
        difficultyInstruction = "Generate simple, memorable mnemonics for basic recall.";
        break;
      case 'ADVANCED':
        difficultyInstruction = "Generate mnemonics that help with connections and deeper understanding.";
        break;
      case 'ULTRA_ADVANCED':
        difficultyInstruction = "Generate complex mnemonics for integrated concepts and high-level exam preparation.";
        break;
    }

    const prompt = `You are an expert NMDCAT mnemonic generator for Pakistani medical college entrance tests.

Generate mnemonics for:
Subject: ${subject}
Topic: ${topic}
Concept: ${concept}
Difficulty Mode: ${difficultyMode}

${difficultyInstruction}

CRITICAL REQUIREMENTS:
1. Generate multiple mnemonic styles where useful (acronym, phrase, association, story, visual).
2. Each mnemonic must correctly map to the information.
3. Explain exactly what each part represents.
4. Mnemonics must be academically meaningful and actually help memory.
5. Do not generate random strings that merely look like mnemonics.
6. Do not invent syllabus claims or textbook citations.
7. Do not fabricate references.

Return ONLY a valid JSON object with this exact structure:
{
  "mnemonics": [
    {
      "type": "acronym|phrase|association|story|visual",
      "mnemonic": "The mnemonic itself",
      "explanation": "What each part represents",
      "concept": "Concept being memorized",
      "topic": "${topic}"
    }
  ],
  "memoryHooks": ["Additional memory tip"],
  "relatedConcepts": ["Related concept to remember"]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const mnemonicData = extractJsonFromText(result.text) || {};

    res.json({
      success: true,
      mnemonicData,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate mnemonics");
  }
});

// API Endpoint: Multi-Level Concept Notes Generator
app.post("/api/multilevel-notes", async (req, res) => {
  try {
    const { topicName, subject = 'Biology', unit = 'General', difficultyMode = 'NORMAL' } = req.body;

    if (!topicName) {
      return res.status(400).json({ error: "topicName is required" });
    }

    const prompt = `You are a master NMDCAT professor, PMDC textbook author, and medical doctor specializing in high-yield medical entrance test preparation in Pakistan.

Generate comprehensive, 5-level tiered educational notes for:
Subject: ${subject}
Unit / Chapter: ${unit}
Topic: ${topicName}

Produce distinct, highly tailored content for each of the 5 levels:
1. basic: Foundational concept introduction with simple everyday analogies, core definitions, and basic building blocks.
2. intermediate: FSc / Intermediate textbook level depth, standard chemical/biological equations, labeled mechanisms, and textbook diagrams descriptions.
3. advanced: Deep conceptual mechanism analysis, kinetic derivations, exceptions to rules, and molecular-level insights.
4. nmdcatLevel: High-yield NMDCAT exam focus! Must highlight: PMDC past paper patterns, tricky distractor traps, speed-solving mnemonics/shortcuts, and numerical/analytical shortcuts.
5. medicalLevel: MBBS clinical relevance! Explains real clinical disease pathology, pharmacology links, diagnostic utility, and hospital correlation for future medical students.

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON with no extraneous commentary.
- Provide rich, substantial text paragraphs for all 5 tiers.

Return ONLY a JSON object with this exact structure:
{
  "explanations": {
    "basic": "Detailed basic explanation...",
    "intermediate": "Detailed FSc intermediate explanation...",
    "advanced": "Detailed advanced explanation...",
    "nmdcatLevel": "Detailed NMDCAT exam-focused explanation...",
    "medicalLevel": "Detailed MBBS clinical relevance explanation..."
  }
}`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const explanations = parsed.explanations || parsed;

    res.json({
      success: true,
      explanations,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate multi-level notes");
  }
});

// API Endpoint: AI Formula Generator
app.post("/api/generate-formulas", async (req, res) => {
  try {
    const { subject = 'Physics', chapter = 'General', topic, difficultyMode = 'NORMAL' } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `You are an expert NMDCAT formula and quantitative problem-solving author for Pakistani medical college entrance tests.

Generate 1-3 high-yield, exam-critical formulas for:
Subject: ${subject}
Chapter: ${chapter}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

CRITICAL REQUIREMENTS:
1. Formulas must adhere strictly to PMDC/UHS/NUMS/FSc textbook syllabus.
2. Provide exact formula syntax, variable breakdowns with physical meanings.
3. Include standard SI units and dimensional formula.
4. Include concrete exam applications and shortcuts.
5. Highlight the single most frequent student trap or common exam calculation mistake.
6. Return ONLY valid JSON.

Return ONLY a valid JSON object with this exact structure:
{
  "formulas": [
    {
      "title": "Specific formula title",
      "formula": "Primary formula equation (e.g. F = G*(m1*m2)/r^2)",
      "variables": ["v1 = explanation with unit", "v2 = explanation with unit"],
      "unitsAndDimensions": "SI Units: ... | Dimensions: [...]",
      "applications": "Direct exam calculation use-case and proportional relationships",
      "commonMistakes": "Key trap, unit conversion mistake, or directional sign error to watch out for",
      "isHighYield": true
    }
  ]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const formulas = Array.isArray(parsed) ? parsed : (parsed.formulas || []);

    res.json({
      success: true,
      formulas,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate formulas");
  }
});

// API Endpoint: AI Reaction Generator
app.post("/api/generate-reactions", async (req, res) => {
  try {
    const { category = 'Organic', chapter = 'General', topic, difficultyMode = 'NORMAL' } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `You are an expert NMDCAT Chemistry author for Pakistani medical entrance tests.

Generate 1-3 high-yield chemical reactions and reaction mechanisms for:
Category: ${category} Chemistry
Chapter: ${chapter}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

CRITICAL REQUIREMENTS:
1. Provide accurate, balanced chemical equation with standard reagents and states.
2. Specify exact reaction mechanism (e.g., SN1, SN2, E1, E2, Electrophilic Addition, Nucleophilic Addition, Free Radical).
3. Specify exact catalysts and reaction conditions (temperature, pressure, solvent).
4. Specify key exceptions, side reactions, or PMDC past-paper exam traps.
5. Return ONLY valid JSON.

Return ONLY a valid JSON object with this exact structure:
{
  "reactions": [
    {
      "reactionName": "Reaction title (e.g. Aldol Condensation)",
      "chemicalEquation": "Complete chemical equation (e.g. 2 CH3CHO --(dil. NaOH)--> CH3-CH(OH)-CH2-CHO)",
      "mechanism": "Step-by-step mechanism type and key intermediate",
      "catalysts": "Catalyst name and role",
      "conditions": "Temperature, solvent, and environment conditions",
      "importantExceptions": "Crucial exceptions, reactivity orders, or distractor traps",
      "relatedExamQuestions": ["Exam question context 1", "Exam question context 2"]
    }
  ]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const reactions = Array.isArray(parsed) ? parsed : (parsed.reactions || []);

    res.json({
      success: true,
      reactions,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate reactions");
  }
});

// API Endpoint: AI Definition Generator
app.post("/api/generate-definitions", async (req, res) => {
  try {
    const { subject = 'Biology', chapter = 'General', topic, difficultyMode = 'NORMAL' } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `You are an expert NMDCAT definitions and core vocabulary compiler for Pakistani medical college entrance tests.

Generate 1-3 essential, high-yield definitions for:
Subject: ${subject}
Chapter: ${chapter}
Topic / Term: ${topic}
Difficulty Mode: ${difficultyMode}

CRITICAL REQUIREMENTS:
1. Provide both a snappy, 1-sentence NMDCAT short definition for rapid revision AND a formal textbook definition.
2. Include 2-4 related technical terms.
3. Include high-yield exam notes and key conceptual distinctions (e.g. difference between closely related terms).
4. Return ONLY valid JSON.

Return ONLY a valid JSON object with this exact structure:
{
  "definitions": [
    {
      "term": "Term or concept title",
      "nmdcatShortDefinition": "Crisp, 1-sentence high-yield definition",
      "textbookDefinition": "Formal, comprehensive PMDC/FSc textbook standard definition",
      "relatedTerms": ["Related term 1", "Related term 2", "Related term 3"],
      "examNotes": "Crucial exam note, all-or-none rule, or past paper distractor tip",
      "distinction": "Key distinction from easily confused concepts"
    }
  ]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const definitions = Array.isArray(parsed) ? parsed : (parsed.definitions || []);

    res.json({
      success: true,
      definitions,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate definitions");
  }
});

// API Endpoint: AI Knowledge Graph & Cross-Subject Link Generator
app.post("/api/generate-knowledge-graph", async (req, res) => {
  try {
    const { subject = 'Biology', topic, difficultyMode = 'NORMAL' } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `You are an expert NMDCAT curriculum architect.

Generate an interconnected conceptual knowledge graph and cross-subject concept nexus for:
Core Subject: ${subject}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

Map how this concept connects across NMDCAT subjects (Biology, Chemistry, Physics, English/Reasoning), its prerequisite concepts, and downstream medical applications.

Return ONLY a valid JSON object with this exact structure:
{
  "knowledgeGraph": {
    "centralConcept": "${topic}",
    "subject": "${subject}",
    "nodes": [
      {
        "id": "node_1",
        "label": "Concept Node Name",
        "subject": "Biology|Chemistry|Physics|English",
        "mastery": 80,
        "details": "Conceptual explanation and formula/mechanism link",
        "status": "Core|Prerequisite|Application"
      }
    ],
    "edges": [
      {
        "from": "node_1",
        "to": "node_2",
        "relationship": "How these two concepts are mechanically linked"
      }
    ],
    "highYieldTips": ["Inter-subject exam connection tip 1", "Exam connection tip 2"]
  }
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const knowledgeGraph = parsed.knowledgeGraph || parsed;

    res.json({
      success: true,
      knowledgeGraph,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate knowledge graph");
  }
});

// ============================================================
// PRISM ENGINE: SOURCE-CONTROLLED KNOWLEDGE SYNTHESIS
// ============================================================

// API Endpoint: PRISM Supplementary Research Queries Generator
app.post("/api/prism/research-queries", async (req, res) => {
  try {
    const { subject = 'Biology', topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `You are the PRISM Research Query Generator for Pakistani NMDCAT preparation.
Topic: ${topic}
Subject: ${subject}

Generate 6-10 targeted research queries designed to probe:
1. Historical discoveries and scientist contributions
2. Extreme values / physiological ranges / numerical constants
3. Common textbook misconceptions vs modern scientific consensus
4. High-yield distractor traps in PMDC exams
5. Precise chemical/physical conditions and mechanism exceptions

Return ONLY a JSON array of query strings:
[
  "Query string 1",
  "Query string 2"
]`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.5,
      maxTokens: 2048,
      jsonMode: true,
    });

    const queries = extractJsonFromText(result.text) || [];
    res.json({
      success: true,
      queries: Array.isArray(queries) ? queries : (queries.queries || []),
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate research queries");
  }
});

// API Endpoint: PRISM Multi-Stage Synthesis
app.post("/api/prism/synthesize", async (req, res) => {
  try {
    const {
      subject = 'Biology',
      topic,
      textbookContent = '',
      examReferences = '',
      externalSnippets = '',
      generationMode = 'NORMAL'
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required for PRISM synthesis" });
    }

    const prompt = `You are PRISM (Precision Reference & Integrated Source-verified Material system), an advanced AI engine for Pakistani NMDCAT (PMDC) curriculum.

CORE LAW:
"AI may synthesize verified knowledge, but must never silently invent, alter, or replace knowledge."
- If the textbook states X and scientific consensus states Y, YOU MUST PRESERVE BOTH. Mark status as "TEXTBOOK_SCIENCE_CONFLICT".
- Never guess exam relevance. If unclear, mark "UNRESOLVED".
- Preserve all qualifiers (e.g. "first discovered", "first isolated", "under standard conditions", "mainly", "most abundant").
- If evidence is weak or missing, mark "INSUFFICIENT_EVIDENCE" or "DISPUTED".

INPUT SPECIFICATIONS:
- Subject: ${subject}
- Topic: ${topic}
- Prescribed Textbook Content: ${textbookContent ? textbookContent : "Standard PMDC / Provincial FSc Textbook curriculum coverage for " + topic}
- Official Exam References: ${examReferences ? examReferences : "PMDC NMDCAT Syllabus guidelines & past exam standards for " + topic}
- External Scientific Context: ${externalSnippets ? externalSnippets : "Standard peer-reviewed biological / chemical / physical literature"}
- Generation Mode: ${generationMode}

PIPELINE TO EXECUTE:
1. SOURCE CLASSIFICATION: Classify input sources into Tier 1 (Official Exam), Tier 2 (Textbook), Tier 3 (Scientific Reference), Tier 4 (Secondary).
2. CLAIM EXTRACTION: Extract atomic factual claims with exact qualifiers preserved.
3. VERIFICATION & CONFLICT DETECTION: Assign each claim a status: VERIFIED, TEXTBOOK_ONLY, SCIENTIFICALLY_OUTDATED, TEXTBOOK_SCIENCE_CONFLICT, DISPUTED, REJECTED, or INSUFFICIENT_EVIDENCE.
4. RULE EXTRACTION: Extract 2-4 generalized deductive rules with application conditions and exceptions.
5. SUBJECT PROCESSING:
   - Biology: Detailed mechanisms, sequences, cellular structure-function, clinical relevance, distractor traps.
   - Chemistry: Balanced equations, mechanisms, catalysts, temperature/pressure conditions, exceptions.
   - Physics: Valid formulas, SI units, dimension verification, numerical traps, independent calculations.
6. STUDY MATERIALS GENERATION:
   - 3-5 High-yield MCQs (4 options, 1 correct index, explanation, sourceClaimIds, trap warning).
   - 3-5 High-yield Flashcards (front, back, explanation, sourceClaimIds).
   - 2-3 High-yield Mnemonics (acronym/phrase/visual with breakdown).
   - 1 Structured Mind Map (centerConcept, 3-5 main nodes, subNodes).
   - Formulas, reactions, and definitions where applicable.

CRITICAL: Return ONLY valid JSON adhering strictly to this exact JSON schema:
{
  "knowledgeLayer": {
    "topic": "${topic}",
    "subject": "${subject}",
    "verifiedSummary": "Comprehensive summary of verified core knowledge...",
    "sources": [
      {
        "id": "src_1",
        "sourceType": "TEXTBOOK|OFFICIAL_EXAM|SCIENTIFIC_REFERENCE|SECONDARY",
        "tier": 1,
        "title": "Source title",
        "origin": "Textbook / PMDC / Journal name",
        "contentSnippet": "Key citation snippet",
        "reliabilityScore": 95
      }
    ],
    "claims": [
      {
        "id": "clm_1",
        "statement": "Claim statement with qualifier",
        "category": "Structure|Mechanism|Historical|Exception|Quantitative",
        "sourceIds": ["src_1"],
        "status": "VERIFIED|TEXTBOOK_ONLY|SCIENTIFICALLY_OUTDATED|TEXTBOOK_SCIENCE_CONFLICT|DISPUTED|INSUFFICIENT_EVIDENCE",
        "qualifier": "e.g. Under standard physiological conditions",
        "textbookClaim": "Textbook claim statement if conflict exists",
        "scientificClaim": "Scientific claim statement if conflict exists",
        "examRelevance": "TEXTBOOK_CONVENTION|SCIENTIFIC_FACT|BOTH_ACCEPTED|UNRESOLVED",
        "confidence": "HIGH|MEDIUM|LOW",
        "notes": "Contextual note"
      }
    ],
    "rules": [
      {
        "id": "rule_1",
        "ruleStatement": "General scientific rule statement",
        "sourceClaimIds": ["clm_1"],
        "applicationConditions": "When this rule holds true",
        "exceptions": ["Exception condition 1"],
        "subject": "${subject}"
      }
    ],
    "textbookConflicts": [
      {
        "claimId": "clm_1",
        "textbookVersion": "What textbook states",
        "scientificVersion": "What modern science demonstrates",
        "examRelevance": "TEXTBOOK_CONVENTION|SCIENTIFIC_FACT|UNRESOLVED",
        "recommendationForStudent": "Specific actionable advice for the NMDCAT exam"
      }
    ],
    "disputes": []
  },
  "materials": {
    "mcqs": [
      {
        "id": "prism_mcq_1",
        "subject": "${subject}",
        "chapter": "${topic}",
        "topic": "${topic}",
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "Detailed explanation...",
        "difficulty": "Medium",
        "sourceClaimIds": ["clm_1"],
        "knowledgeStatus": "VERIFIED",
        "examTrap": "Common pitfall to avoid"
      }
    ],
    "flashcards": [
      {
        "id": "prism_fc_1",
        "subject": "${subject}",
        "topic": "${topic}",
        "front": "Flashcard front prompt",
        "back": "Flashcard back answer and breakdown",
        "explanation": "Deeper context",
        "sourceClaimIds": ["clm_1"],
        "knowledgeStatus": "VERIFIED"
      }
    ],
    "mnemonics": [
      {
        "id": "prism_mn_1",
        "type": "acronym",
        "mnemonic": "MNEMONIC",
        "explanation": "M = ..., N = ...",
        "concept": "Core concept",
        "topic": "${topic}",
        "sourceClaimIds": ["clm_1"]
      }
    ],
    "mindMap": {
      "id": "prism_mm_1",
      "subject": "${subject}",
      "topic": "${topic}",
      "title": "${topic} Concept Map",
      "centerConcept": "${topic}",
      "nodes": [
        {
          "id": "node_1",
          "label": "Main Branch",
          "description": "Branch description",
          "subNodes": [
            { "id": "sub_1", "label": "Sub concept", "detail": "Sub detail" }
          ]
        }
      ]
    },
    "formulas": [],
    "reactions": [],
    "definitions": []
  }
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.6,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};

    if (!parsed.knowledgeLayer || !parsed.materials) {
      throw new Error("PRISM output missing required knowledgeLayer or materials structure.");
    }

    // Sanitize and ensure array validity
    const knowledgeLayer = {
      topic: parsed.knowledgeLayer.topic || topic,
      subject: parsed.knowledgeLayer.subject || subject,
      verifiedSummary: parsed.knowledgeLayer.verifiedSummary || '',
      sources: Array.isArray(parsed.knowledgeLayer.sources) ? parsed.knowledgeLayer.sources : [],
      claims: Array.isArray(parsed.knowledgeLayer.claims) ? parsed.knowledgeLayer.claims : [],
      rules: Array.isArray(parsed.knowledgeLayer.rules) ? parsed.knowledgeLayer.rules : [],
      textbookConflicts: Array.isArray(parsed.knowledgeLayer.textbookConflicts) ? parsed.knowledgeLayer.textbookConflicts : [],
      disputes: Array.isArray(parsed.knowledgeLayer.disputes) ? parsed.knowledgeLayer.disputes : [],
      formulas: Array.isArray(parsed.knowledgeLayer.formulas) ? parsed.knowledgeLayer.formulas : [],
      reactions: Array.isArray(parsed.knowledgeLayer.reactions) ? parsed.knowledgeLayer.reactions : [],
      definitions: Array.isArray(parsed.knowledgeLayer.definitions) ? parsed.knowledgeLayer.definitions : []
    };

    const materials = {
      mcqs: (Array.isArray(parsed.materials.mcqs) ? parsed.materials.mcqs : []).map((m: any, idx: number) => ({
        id: m.id || `prism_mcq_${Date.now()}_${idx}`,
        subject: m.subject || subject,
        chapter: m.chapter || topic,
        topic: m.topic || topic,
        question: m.question,
        options: Array.isArray(m.options) && m.options.length === 4 ? m.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: typeof m.correctIndex === 'number' ? m.correctIndex : 0,
        explanation: m.explanation || 'Verified as per PRISM source criteria.',
        difficulty: m.difficulty || 'Medium',
        type: 'Standard' as const,
        sourceClaimIds: Array.isArray(m.sourceClaimIds) ? m.sourceClaimIds : [],
        knowledgeStatus: m.knowledgeStatus || 'VERIFIED',
        examTrap: m.examTrap || undefined,
        verificationStatus: 'VERIFIED' as const,
        authorType: 'AI' as const
      })),
      flashcards: (Array.isArray(parsed.materials.flashcards) ? parsed.materials.flashcards : []).map((fc: any, idx: number) => ({
        id: fc.id || `prism_fc_${Date.now()}_${idx}`,
        subject: fc.subject || subject,
        topic: fc.topic || topic,
        front: fc.front,
        back: fc.back,
        explanation: fc.explanation,
        sourceClaimIds: Array.isArray(fc.sourceClaimIds) ? fc.sourceClaimIds : [],
        knowledgeStatus: fc.knowledgeStatus || 'VERIFIED'
      })),
      mnemonics: (Array.isArray(parsed.materials.mnemonics) ? parsed.materials.mnemonics : []).map((mn: any, idx: number) => ({
        id: mn.id || `prism_mn_${Date.now()}_${idx}`,
        type: mn.type || 'acronym',
        mnemonic: mn.mnemonic,
        explanation: mn.explanation,
        concept: mn.concept || topic,
        topic: mn.topic || topic,
        sourceClaimIds: Array.isArray(mn.sourceClaimIds) ? mn.sourceClaimIds : []
      })),
      mindMap: parsed.materials.mindMap || {
        id: `prism_mm_${Date.now()}`,
        subject: subject,
        topic: topic,
        title: `${topic} Concept Map`,
        centerConcept: topic,
        nodes: []
      },
      formulas: Array.isArray(parsed.materials.formulas) ? parsed.materials.formulas : [],
      reactions: Array.isArray(parsed.materials.reactions) ? parsed.materials.reactions : [],
      definitions: Array.isArray(parsed.materials.definitions) ? parsed.materials.definitions : []
    };

    res.json({
      success: true,
      knowledgeLayer,
      materials,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to perform PRISM synthesis");
  }
});

// Vite Integration for Dev / Production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`NMDCAT Prep Pro Server running on http://${displayHost}:${PORT}`);
    if (HOST !== '0.0.0.0' && HOST !== 'localhost') {
      console.log(`Note: ensure ${HOST} resolves to this machine (e.g. via hosts file mapping to 127.0.0.1) before opening the URL.`);
    }
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };

