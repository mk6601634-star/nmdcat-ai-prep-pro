import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Atom, 
  FlaskConical, 
  FileText, 
  Network, 
  Search, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Tag, 
  TrendingUp, 
  BookmarkPlus, 
  Loader2, 
  X, 
  Dna, 
  Zap, 
  Languages, 
  Brain, 
  Trash2, 
  LogIn, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  BrainCircuit, 
  Calculator, 
  BookMarked,
  Share2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { 
  subscribeToPublishedFormulas, 
  subscribeToPublishedReactions, 
  subscribeToPublishedNotes, 
  subscribeToPublishedMindMaps, 
  subscribeToPublishedMnemonics, 
  saveUserMindMap, 
  saveUserMnemonic, 
  saveUserFormula,
  saveUserReaction,
  saveUserDefinition,
  subscribeToUserMindMaps, 
  subscribeToUserMnemonics, 
  subscribeToUserFormulas,
  subscribeToUserReactions,
  subscribeToUserDefinitions,
  deleteUserContent 
} from '../lib/firestoreService';
import { aiFetch, getAiFriendlyMessage } from '../lib/aiRequest';
import { 
  FormulaItem, 
  ReactionItem, 
  DefinitionItem, 
  ConceptMindMap, 
  MindMapNode, 
  SubjectType, 
  Flashcard,
  KnowledgeGraphNode
} from '../types';
import { 
  FORMULA_DATABASE, 
  REACTION_DATABASE, 
  DEFINITION_DATABASE,
  CONCEPT_MINDMAPS, 
  INITIAL_KNOWLEDGE_GRAPH 
} from '../data/nmdcatData';
import type { User } from '../lib/firebase';

interface ReferenceLibrariesProps {
  onAddFlashcard?: (card: Flashcard) => void;
  firebaseUser?: User | null;
  activeSubTab?: string;
  onSignIn?: () => void;
}

export const ReferenceLibraries: React.FC<ReferenceLibrariesProps> = ({ 
  onAddFlashcard, 
  firebaseUser, 
  activeSubTab: parentActiveSubTab, 
  onSignIn 
}) => {
  const getInternalTab = (tab: string): 'formulas' | 'reactions' | 'definitions' | 'mindmaps' | 'mnemonics' | 'knowledge_graph' => {
    switch (tab) {
      case 'formula_lib': return 'formulas';
      case 'reaction_lib': return 'reactions';
      case 'definitions': return 'definitions';
      case 'mind_maps': return 'mindmaps';
      case 'mnemonics': return 'mnemonics';
      case 'knowledge_graph': return 'knowledge_graph';
      default: return 'formulas';
    }
  };

  const [activeSubTab, setActiveSubTab] = useState<'formulas' | 'reactions' | 'definitions' | 'mindmaps' | 'mnemonics' | 'knowledge_graph'>(() => 
    parentActiveSubTab ? getInternalTab(parentActiveSubTab) : 'formulas'
  );

  useEffect(() => {
    if (parentActiveSubTab) {
      setActiveSubTab(getInternalTab(parentActiveSubTab));
    }
  }, [parentActiveSubTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');

  const effectiveSubjectFilter = parentActiveSubTab ? (() => {
    switch (parentActiveSubTab) {
      case 'formula_lib':
      case 'reaction_lib':
      case 'definitions':
      case 'mind_maps':
      case 'mnemonics':
      case 'knowledge_graph':
        return 'All';
      default:
        return 'All';
    }
  })() : subjectFilter;

  const [selectedMindMap, setSelectedMindMap] = useState<ConceptMindMap | null>(null);

  const [publishedFormulas, setPublishedFormulas] = useState<Array<FormulaItem & { id: string; status?: string }>>([]);
  const [publishedReactions, setPublishedReactions] = useState<Array<ReactionItem & { id: string; status?: string }>>([]);
  const [publishedDefinitions, setPublishedDefinitions] = useState<Array<DefinitionItem & { id: string; status?: string }>>([]);
  const [publishedMindMaps, setPublishedMindMaps] = useState<Array<ConceptMindMap & { id: string; status?: string }>>([]);
  const [publishedMnemonics, setPublishedMnemonics] = useState<Array<Flashcard & { id: string; status?: string }>>([]);

  const [userFormulas, setUserFormulas] = useState<Array<FormulaItem & { id: string }>>(() => {
    try {
      const saved = localStorage.getItem('nmdcat_user_formulas');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userReactions, setUserReactions] = useState<Array<ReactionItem & { id: string }>>(() => {
    try {
      const saved = localStorage.getItem('nmdcat_user_reactions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userDefinitions, setUserDefinitions] = useState<Array<DefinitionItem & { id: string }>>(() => {
    try {
      const saved = localStorage.getItem('nmdcat_user_definitions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userMindMaps, setUserMindMaps] = useState<Array<ConceptMindMap & { id: string }>>(() => {
    try {
      const saved = localStorage.getItem('nmdcat_user_mindmaps');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userMnemonics, setUserMnemonics] = useState<Array<Flashcard & { id: string }>>(() => {
    try {
      const saved = localStorage.getItem('nmdcat_user_mnemonics');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userKnowledgeGraphs, setUserKnowledgeGraphs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('nmdcat_user_knowledge_graphs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedKnowledgeGraph, setSelectedKnowledgeGraph] = useState<any | null>(null);

  useEffect(() => {
    try { localStorage.setItem('nmdcat_user_formulas', JSON.stringify(userFormulas)); } catch {}
  }, [userFormulas]);

  useEffect(() => {
    try { localStorage.setItem('nmdcat_user_reactions', JSON.stringify(userReactions)); } catch {}
  }, [userReactions]);

  useEffect(() => {
    try { localStorage.setItem('nmdcat_user_definitions', JSON.stringify(userDefinitions)); } catch {}
  }, [userDefinitions]);

  useEffect(() => {
    try { localStorage.setItem('nmdcat_user_mindmaps', JSON.stringify(userMindMaps)); } catch {}
  }, [userMindMaps]);

  useEffect(() => {
    try { localStorage.setItem('nmdcat_user_mnemonics', JSON.stringify(userMnemonics)); } catch {}
  }, [userMnemonics]);

  useEffect(() => {
    try { localStorage.setItem('nmdcat_user_knowledge_graphs', JSON.stringify(userKnowledgeGraphs)); } catch {}
  }, [userKnowledgeGraphs]);

  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({});
  const [addedToast, setAddedToast] = useState<string | null>(null);

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodeIds(prev => ({
      ...prev,
      [nodeId]: prev[nodeId] === undefined ? false : !prev[nodeId]
    }));
  };

  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiConcept, setAiConcept] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<'NORMAL' | 'ADVANCED' | 'ULTRA_ADVANCED'>('NORMAL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubFormulas = subscribeToPublishedFormulas(setPublishedFormulas);
    const unsubReactions = subscribeToPublishedReactions(setPublishedReactions);
    const unsubDefinitions = subscribeToPublishedNotes(setPublishedDefinitions);
    const unsubMindMaps = subscribeToPublishedMindMaps((items) => {
      setPublishedMindMaps(items);
    });
    const unsubMnemonics = subscribeToPublishedMnemonics((items) => {
      setPublishedMnemonics(items);
    });

    let unsubUserMindMaps: () => void = () => {};
    let unsubUserMnemonics: () => void = () => {};
    let unsubUserFormulas: () => void = () => {};
    let unsubUserReactions: () => void = () => {};
    let unsubUserDefinitions: () => void = () => {};

    if (firebaseUser) {
      unsubUserFormulas = subscribeToUserFormulas(firebaseUser.uid, (remote) => {
        if (remote && remote.length > 0) {
          setUserFormulas(prev => {
            const map = new Map();
            [...prev, ...remote].forEach(m => map.set(m.id, m));
            return Array.from(map.values());
          });
        }
      });

      unsubUserReactions = subscribeToUserReactions(firebaseUser.uid, (remote) => {
        if (remote && remote.length > 0) {
          setUserReactions(prev => {
            const map = new Map();
            [...prev, ...remote].forEach(m => map.set(m.id, m));
            return Array.from(map.values());
          });
        }
      });

      unsubUserDefinitions = subscribeToUserDefinitions(firebaseUser.uid, (remote) => {
        if (remote && remote.length > 0) {
          setUserDefinitions(prev => {
            const map = new Map();
            [...prev, ...remote].forEach(m => map.set(m.id, m));
            return Array.from(map.values());
          });
        }
      });

      unsubUserMindMaps = subscribeToUserMindMaps(firebaseUser.uid, (remoteItems) => {
        if (remoteItems && remoteItems.length > 0) {
          setUserMindMaps(prev => {
            const map = new Map();
            [...prev, ...remoteItems].forEach(m => map.set(m.id, m));
            return Array.from(map.values());
          });
        }
      });

      unsubUserMnemonics = subscribeToUserMnemonics(firebaseUser.uid, (remoteItems) => {
        if (remoteItems && remoteItems.length > 0) {
          setUserMnemonics(prev => {
            const map = new Map();
            [...prev, ...remoteItems].forEach(m => map.set(m.id, m));
            return Array.from(map.values());
          });
        }
      });
    }

    if (!selectedMindMap) {
      if (userMindMaps.length > 0) {
        setSelectedMindMap(userMindMaps[0]);
      } else if (CONCEPT_MINDMAPS.length > 0) {
        setSelectedMindMap(CONCEPT_MINDMAPS[0]);
      }
    }

    return () => {
      unsubFormulas();
      unsubReactions();
      unsubDefinitions();
      unsubMindMaps();
      unsubMnemonics();
      unsubUserFormulas();
      unsubUserReactions();
      unsubUserDefinitions();
      unsubUserMindMaps();
      unsubUserMnemonics();
    };
  }, [firebaseUser]);

  const showToast = (msg: string) => {
    setAddedToast(msg);
    setTimeout(() => setAddedToast(null), 2500);
  };

  const allFormulas = [
    ...userFormulas,
    ...(publishedFormulas.length > 0 ? publishedFormulas : FORMULA_DATABASE)
  ];
  const filteredFormulas = allFormulas.filter(f => {
    const matchSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        f.formula.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        f.chapter.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = effectiveSubjectFilter === 'All' || f.subject === effectiveSubjectFilter;
    return matchSearch && matchSubject;
  });

  const allReactions = [
    ...userReactions,
    ...(publishedReactions.length > 0 ? publishedReactions : REACTION_DATABASE)
  ];
  const filteredReactions = allReactions.filter(r => {
    const matchSearch = r.reactionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.chemicalEquation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.chapter.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = effectiveSubjectFilter === 'All' || r.category === effectiveSubjectFilter;
    return matchSearch && matchCategory;
  });

  const allDefinitions = [
    ...userDefinitions,
    ...(publishedDefinitions.length > 0 ? publishedDefinitions : (DEFINITION_DATABASE || []))
  ];
  const filteredDefinitions = allDefinitions.filter(d => {
    const matchSearch = (d.term || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (d.textbookDefinition || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (d.nmdcatShortDefinition || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = effectiveSubjectFilter === 'All' || d.subject === effectiveSubjectFilter;
    return matchSearch && matchSubject;
  });

  const allMnemonics = [...userMnemonics, ...publishedMnemonics];
  const filteredMnemonics = allMnemonics.filter(m => {
    const matchSearch = (m.mnemonic || m.front || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (m.topic || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = effectiveSubjectFilter === 'All' || m.subject === effectiveSubjectFilter;
    return matchSearch && matchSubject;
  });

  const allMindMaps = [
    ...userMindMaps,
    ...(publishedMindMaps.length > 0 ? publishedMindMaps : CONCEPT_MINDMAPS)
  ];

  const handleGenerateFormulas = async () => {
    if (!aiTopic.trim()) {
      setAiError('Please enter a topic for formula generation');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setGeneratedContent(null);

    try {
      const data = await aiFetch('/api/generate-formulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: effectiveSubjectFilter === 'All' ? 'Physics' : effectiveSubjectFilter,
          chapter: aiConcept.trim() || 'General',
          topic: aiTopic,
          difficultyMode: aiDifficulty
        })
      });

      setGeneratedContent(data);
    } catch (err: any) {
      setAiError(getAiFriendlyMessage(err) || err.message || 'Failed to generate formulas. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveFormula = async () => {
    if (!generatedContent?.formulas || generatedContent.formulas.length === 0) return;

    setIsSaving(true);
    try {
      const formulasToSave: Array<FormulaItem & { id: string }> = generatedContent.formulas.map((f: any, idx: number) => ({
        id: `formula_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        subject: (effectiveSubjectFilter === 'All' ? 'Physics' : effectiveSubjectFilter) as SubjectType,
        chapter: aiConcept || 'High-Yield Revision',
        title: f.title || aiTopic,
        formula: f.formula || '',
        variables: f.variables || [],
        unitsAndDimensions: f.unitsAndDimensions || '',
        applications: f.applications || '',
        commonMistakes: f.commonMistakes || '',
        isHighYield: true,
        createdAt: new Date().toISOString()
      }));

      setUserFormulas(prev => [...formulasToSave, ...prev]);

      if (firebaseUser) {
        formulasToSave.forEach((f) => {
          saveUserFormula(firebaseUser.uid, f).catch(e => {
            console.warn('[Firestore] Background save formula error:', e);
          });
        });
      }

      showToast(`Saved ${formulasToSave.length} formula(s) to your library!`);
      setGeneratedContent(null);
      setShowAiPanel(false);
      setAiTopic('');
      setAiConcept('');
    } catch (err: any) {
      setAiError(err.message || 'Failed to save formula');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateReactions = async () => {
    if (!aiTopic.trim()) {
      setAiError('Please enter a reaction topic or mechanism name');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setGeneratedContent(null);

    try {
      const data = await aiFetch('/api/generate-reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'Organic',
          chapter: aiConcept.trim() || 'General Chemistry',
          topic: aiTopic,
          difficultyMode: aiDifficulty
        })
      });

      setGeneratedContent(data);
    } catch (err: any) {
      setAiError(getAiFriendlyMessage(err) || err.message || 'Failed to generate reactions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveReaction = async () => {
    if (!generatedContent?.reactions || generatedContent.reactions.length === 0) return;

    setIsSaving(true);
    try {
      const reactionsToSave: Array<ReactionItem & { id: string }> = generatedContent.reactions.map((r: any, idx: number) => ({
        id: `reaction_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        category: (r.category || 'Organic') as 'Organic' | 'Inorganic' | 'Physical' | 'Biochemistry',
        chapter: aiConcept || 'General Chemistry',
        reactionName: r.reactionName || aiTopic,
        chemicalEquation: r.chemicalEquation || '',
        mechanism: r.mechanism || '',
        catalysts: r.catalysts || '',
        conditions: r.conditions || '',
        importantExceptions: r.importantExceptions || '',
        relatedExamQuestions: r.relatedExamQuestions || [],
        createdAt: new Date().toISOString()
      }));

      setUserReactions(prev => [...reactionsToSave, ...prev]);

      if (firebaseUser) {
        reactionsToSave.forEach((r) => {
          saveUserReaction(firebaseUser.uid, r).catch(e => {
            console.warn('[Firestore] Background save reaction error:', e);
          });
        });
      }

      showToast(`Saved ${reactionsToSave.length} reaction(s) to your library!`);
      setGeneratedContent(null);
      setShowAiPanel(false);
      setAiTopic('');
      setAiConcept('');
    } catch (err: any) {
      setAiError(err.message || 'Failed to save reaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateDefinitions = async () => {
    if (!aiTopic.trim()) {
      setAiError('Please enter a term or concept to define');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setGeneratedContent(null);

    try {
      const data = await aiFetch('/api/generate-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: effectiveSubjectFilter === 'All' ? 'Biology' : effectiveSubjectFilter,
          chapter: aiConcept.trim() || 'General PMDC Syllabus',
          topic: aiTopic,
          difficultyMode: aiDifficulty
        })
      });

      setGeneratedContent(data);
    } catch (err: any) {
      setAiError(getAiFriendlyMessage(err) || err.message || 'Failed to generate definitions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDefinition = async () => {
    if (!generatedContent?.definitions || generatedContent.definitions.length === 0) return;

    setIsSaving(true);
    try {
      const defsToSave: Array<DefinitionItem & { id: string }> = generatedContent.definitions.map((d: any, idx: number) => ({
        id: `def_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        subject: (effectiveSubjectFilter === 'All' ? 'Biology' : effectiveSubjectFilter) as SubjectType,
        chapter: aiConcept || 'High-Yield Terms',
        term: d.term || aiTopic,
        nmdcatShortDefinition: d.nmdcatShortDefinition || '',
        textbookDefinition: d.textbookDefinition || '',
        relatedTerms: d.relatedTerms || [],
        examNotes: d.examNotes || d.distinction || 'High-Yield PMDC distinction',
        createdAt: new Date().toISOString()
      }));

      setUserDefinitions(prev => [...defsToSave, ...prev]);

      if (firebaseUser) {
        defsToSave.forEach((d) => {
          saveUserDefinition(firebaseUser.uid, d).catch(e => {
            console.warn('[Firestore] Background save definition error:', e);
          });
        });
      }

      showToast(`Saved ${defsToSave.length} definition(s) to your library!`);
      setGeneratedContent(null);
      setShowAiPanel(false);
      setAiTopic('');
      setAiConcept('');
    } catch (err: any) {
      setAiError(err.message || 'Failed to save definition');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateMindMap = async () => {
    if (!aiTopic.trim()) {
      setAiError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setGeneratedContent(null);

    try {
      const data = await aiFetch('/api/generate-mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: effectiveSubjectFilter === 'All' ? 'Biology' : effectiveSubjectFilter,
          topic: aiTopic,
          difficultyMode: aiDifficulty
        })
      });

      setGeneratedContent(data.mindMap);
    } catch (err: any) {
      setAiError(getAiFriendlyMessage(err) || err.message || 'Failed to generate mind map. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMindMap = async () => {
    if (!generatedContent) return;

    setIsSaving(true);
    try {
      const rawBranches = Array.isArray(generatedContent)
        ? generatedContent
        : (generatedContent.branches || generatedContent.nodes || generatedContent.subtopics || generatedContent.children || generatedContent.mindMap?.branches || []);

      const mappedNodes: MindMapNode[] = rawBranches.map((b: any, idx: number) => {
        const subList = b.subnodes || b.subNodes || b.children || b.subtopics || b.details || [];
        const mappedSubNodes = Array.isArray(subList)
          ? subList.map((s: any, sIdx: number) => {
              if (typeof s === 'string') {
                return {
                  id: `sub_${idx}_${sIdx}`,
                  label: s,
                  detail: ''
                };
              }
              return {
                id: `sub_${idx}_${sIdx}`,
                label: s.label || s.title || s.name || s.concept || `Detail ${sIdx + 1}`,
                detail: s.details || s.detail || s.description || s.explanation || (s.relationships ? s.relationships.join(', ') : '') || ''
              };
            })
          : [];

        return {
          id: `node_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          label: b.label || b.title || b.name || b.topic || `Branch ${idx + 1}`,
          description: b.description || b.details || b.summary || (mappedSubNodes.length > 0 ? `${mappedSubNodes.length} key concept mechanisms` : ''),
          category: b.category || 'High-Yield Core',
          subNodes: mappedSubNodes
        };
      });

      const centerConcept = (typeof generatedContent === 'object' && !Array.isArray(generatedContent))
        ? (generatedContent.centralConcept || generatedContent.centralTopic || generatedContent.centerConcept || generatedContent.topic || aiTopic)
        : aiTopic;

      const newMindMap: ConceptMindMap & { id: string } = {
        id: `mindmap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        subject: (effectiveSubjectFilter === 'All' ? 'Biology' : effectiveSubjectFilter) as SubjectType,
        title: aiTopic,
        topic: aiTopic,
        centerConcept: centerConcept || aiTopic,
        nodes: mappedNodes,
        createdAt: new Date().toISOString()
      };

      setUserMindMaps(prev => [newMindMap, ...prev]);
      setSelectedMindMap(newMindMap);

      if (firebaseUser) {
        saveUserMindMap(firebaseUser.uid, newMindMap).catch(e => {
          console.warn('[Firestore] Background save mind map error:', e);
        });
      }

      setGeneratedContent(null);
      setShowAiPanel(false);
      setAiTopic('');
    } catch (err: any) {
      setAiError(err.message || 'Failed to save mind map');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateMnemonics = async () => {
    if (!aiTopic.trim() || !aiConcept.trim()) {
      setAiError('Please enter a topic and concept');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setGeneratedContent(null);

    try {
      const data = await aiFetch('/api/generate-mnemonics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: effectiveSubjectFilter === 'All' ? 'Biology' : effectiveSubjectFilter,
          topic: aiTopic,
          concept: aiConcept,
          difficultyMode: aiDifficulty
        })
      });

      setGeneratedContent(data.mnemonicData);
    } catch (err: any) {
      setAiError(getAiFriendlyMessage(err) || err.message || 'Failed to generate mnemonics. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMnemonic = async () => {
    if (!generatedContent) return;

    setIsSaving(true);
    try {
      const mnemonic = generatedContent.mnemonics?.[0] || {};
      const newMnemonic: Flashcard & { id: string } = {
        id: `mnemonic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        subject: (effectiveSubjectFilter === 'All' ? 'Biology' : effectiveSubjectFilter) as SubjectType,
        topic: aiTopic,
        front: mnemonic.mnemonic || '',
        back: mnemonic.explanation || '',
        mnemonic: mnemonic.mnemonic,
        cardType: 'standard' as const,
        createdAt: new Date().toISOString()
      };

      setUserMnemonics(prev => [newMnemonic, ...prev]);

      if (firebaseUser) {
        saveUserMnemonic(firebaseUser.uid, newMnemonic).catch(e => {
          console.warn('[Firestore] Background save mnemonic error:', e);
        });
      }

      setGeneratedContent(null);
      setShowAiPanel(false);
      setAiTopic('');
      setAiConcept('');
    } catch (err: any) {
      setAiError(err.message || 'Failed to save mnemonic');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateKnowledgeGraph = async () => {
    if (!aiTopic.trim()) {
      setAiError('Please enter a core topic for knowledge graph generation');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setGeneratedContent(null);

    try {
      const data = await aiFetch('/api/generate-knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: effectiveSubjectFilter === 'All' ? 'Biology' : effectiveSubjectFilter,
          topic: aiTopic,
          difficultyMode: aiDifficulty
        })
      });

      setGeneratedContent(data);
    } catch (err: any) {
      setAiError(getAiFriendlyMessage(err) || err.message || 'Failed to generate knowledge graph. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveKnowledgeGraph = () => {
    if (!generatedContent?.knowledgeGraph) return;
    const kg = generatedContent.knowledgeGraph;
    const newKg = {
      id: `kg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: kg.centralConcept || aiTopic,
      subject: kg.subject || (effectiveSubjectFilter === 'All' ? 'Biology' : effectiveSubjectFilter),
      nodes: kg.nodes || [],
      edges: kg.edges || [],
      highYieldTips: kg.highYieldTips || [],
      createdAt: new Date().toISOString()
    };

    setUserKnowledgeGraphs(prev => [newKg, ...prev]);
    setSelectedKnowledgeGraph(newKg);
    showToast('Knowledge graph saved to your library!');
    setGeneratedContent(null);
    setShowAiPanel(false);
    setAiTopic('');
  };

  const handleDeleteFormula = async (id: string) => {
    if (!confirm('Delete this formula?')) return;
    setUserFormulas(prev => prev.filter(f => f.id !== id));
    if (firebaseUser) {
      deleteUserContent('userFormulas', id).catch(e => console.warn(e));
    }
  };

  const handleDeleteReaction = async (id: string) => {
    if (!confirm('Delete this reaction?')) return;
    setUserReactions(prev => prev.filter(r => r.id !== id));
    if (firebaseUser) {
      deleteUserContent('userReactions', id).catch(e => console.warn(e));
    }
  };

  const handleDeleteDefinition = async (id: string) => {
    if (!confirm('Delete this definition?')) return;
    setUserDefinitions(prev => prev.filter(d => d.id !== id));
    if (firebaseUser) {
      deleteUserContent('userDefinitions', id).catch(e => console.warn(e));
    }
  };

  const handleDeleteMindMap = async (mindMapId: string) => {
    if (!confirm('Are you sure you want to delete this mind map?')) return;
    setUserMindMaps(prev => prev.filter(m => m.id !== mindMapId));
    if (selectedMindMap?.id === mindMapId) {
      setSelectedMindMap(null);
    }
    if (firebaseUser) {
      deleteUserContent('userMindMaps', mindMapId).catch(e => console.warn(e));
    }
  };

  const handleDeleteMnemonic = async (mnemonicId: string) => {
    if (!confirm('Are you sure you want to delete this mnemonic?')) return;
    setUserMnemonics(prev => prev.filter(m => m.id !== mnemonicId));
    if (firebaseUser) {
      deleteUserContent('userMnemonics', mnemonicId).catch(e => console.warn(e));
    }
  };

  const handleDeleteKnowledgeGraph = (id: string) => {
    if (!confirm('Delete this knowledge graph?')) return;
    setUserKnowledgeGraphs(prev => prev.filter(kg => kg.id !== id));
    if (selectedKnowledgeGraph?.id === id) {
      setSelectedKnowledgeGraph(null);
    }
  };

  const handleConvertDefToFlashcard = (def: DefinitionItem) => {
    if (onAddFlashcard) {
      onAddFlashcard({
        id: `fc-def-${Date.now()}`,
        subject: def.subject,
        topic: def.chapter,
        front: `What is the NMDCAT definition of "${def.term}"?`,
        back: `${def.nmdcatShortDefinition}\n\nFull: ${def.textbookDefinition}`,
        keyFormulaOrConcept: def.examNotes
      });
      showToast(`Added "${def.term}" to Flashcards!`);
    }
  };

  return (
    <div className="space-y-6">
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{addedToast}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 overflow-hidden rounded-[28px] border border-indigo-500/20 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 shadow-[0_24px_80px_-32px_rgba(99,102,241,0.4)]">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-300">
              NMDCAT Knowledge Vault
            </span>
            <span className="text-xs text-slate-400">&bull; PMDC High-Yield Syllabus</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Reference Libraries & Visual Concept Diagrams
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Quick-access formula derivations, organic reaction mechanisms, PMDC textbook definitions, and interactive visual concept graphs with unified AI generation.
          </p>
        </div>

        {!parentActiveSubTab && (
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('formulas')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === 'formulas' ? 'bg-indigo-500 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Atom className="w-4 h-4" />
              <span>Formulas ({filteredFormulas.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('reactions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === 'reactions' ? 'bg-indigo-500 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              <span>Reactions ({filteredReactions.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('definitions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === 'definitions' ? 'bg-indigo-500 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Definitions ({filteredDefinitions.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('mindmaps')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === 'mindmaps' ? 'bg-indigo-500 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>Mind Maps ({allMindMaps.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('mnemonics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === 'mnemonics' ? 'bg-indigo-500 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span>Mnemonics ({allMnemonics.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('knowledge_graph')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === 'knowledge_graph' ? 'bg-indigo-500 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Knowledge Graph</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[24px] border border-slate-800/80 bg-slate-900/80 p-4 shadow-inner">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeSubTab}...`}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Physics', 'Chemistry', 'Biology', 'English'].map((subj) => (
              <button
                key={subj}
                onClick={() => setSubjectFilter(subj)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  subjectFilter === subj
                    ? 'bg-slate-800 text-indigo-400 border border-indigo-500/30 font-semibold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setShowAiPanel(!showAiPanel);
              setGeneratedContent(null);
              setAiError(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate with AI</span>
          </button>
        </div>
      </div>

      {showAiPanel && (
        <div className="bg-slate-900/95 p-6 rounded-3xl border border-indigo-500/30 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-base">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span>
                {activeSubTab === 'formulas' && 'AI Formula & Derivation Generator'}
                {activeSubTab === 'reactions' && 'AI Chemical Reaction Mechanism Generator'}
                {activeSubTab === 'definitions' && 'AI Textbook Definition & Distinction Generator'}
                {activeSubTab === 'mindmaps' && 'AI Visual Mind Map Generator'}
                {activeSubTab === 'mnemonics' && 'AI Mnemonic & Memory Hook Generator'}
                {activeSubTab === 'knowledge_graph' && 'AI Cross-Subject Knowledge Graph Generator'}
              </span>
            </div>
            <button
              onClick={() => setShowAiPanel(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {activeSubTab === 'definitions' ? 'Term or Concept to Define' : 'Topic / Core Subject Area'}
              </label>
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder={
                  activeSubTab === 'formulas' ? 'e.g. Coulomb Law, Projectile Motion, Carnot Engine' :
                  activeSubTab === 'reactions' ? 'e.g. Aldol Condensation, Lucas Test, Cannizzaro Reaction' :
                  activeSubTab === 'definitions' ? 'e.g. Action Potential, Buffer Solution, Enantiomers' :
                  activeSubTab === 'mindmaps' ? 'e.g. Mitochondria, Cell Respiration, Enzyme Kinetics' :
                  activeSubTab === 'knowledge_graph' ? 'e.g. Thermodynamics, Enzyme Catalysis, Bioenergetics' :
                  'e.g. Cell division, Mitosis phases'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {activeSubTab === 'reactions' ? 'Chapter / Unit' : activeSubTab === 'mnemonics' ? 'Specific Sub-Concept' : 'Chapter / Syllabus Context'}
              </label>
              <input
                type="text"
                value={aiConcept}
                onChange={(e) => setAiConcept(e.target.value)}
                placeholder={
                  activeSubTab === 'mnemonics' ? 'e.g. Mitosis Phases (PMAT)' :
                  activeSubTab === 'reactions' ? 'e.g. Aldehydes & Ketones' :
                  activeSubTab === 'formulas' ? 'e.g. Electrostatics & Capacitance' :
                  'e.g. Cell Biology (Optional)'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Difficulty Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {(['NORMAL', 'ADVANCED', 'ULTRA_ADVANCED'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAiDifficulty(mode)}
                  className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                    aiDifficulty === mode
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              if (activeSubTab === 'formulas') handleGenerateFormulas();
              else if (activeSubTab === 'reactions') handleGenerateReactions();
              else if (activeSubTab === 'definitions') handleGenerateDefinitions();
              else if (activeSubTab === 'mindmaps') handleGenerateMindMap();
              else if (activeSubTab === 'mnemonics') handleGenerateMnemonics();
              else if (activeSubTab === 'knowledge_graph') handleGenerateKnowledgeGraph();
            }}
            disabled={isGenerating || !aiTopic.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing with Dual AI (Gemini / Groq)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Content</span>
              </>
            )}
          </button>

          {aiError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {generatedContent && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>AI Material generated successfully ({generatedContent.provider || 'Dual-AI'})</span>
              </div>

              {generatedContent.formulas && (
                <div className="space-y-3">
                  {generatedContent.formulas.map((f: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2">
                      <div className="font-bold text-white text-sm">{f.title}</div>
                      <code className="text-sm font-mono font-bold text-indigo-300 block bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">{f.formula}</code>
                      <p className="text-xs text-slate-300">{f.unitsAndDimensions}</p>
                      <p className="text-xs text-rose-300 font-medium">⚠️ Trap: {f.commonMistakes}</p>
                    </div>
                  ))}
                  <button
                    onClick={handleSaveFormula}
                    disabled={isSaving}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Save to My Formula Library</span>
                  </button>
                </div>
              )}

              {generatedContent.reactions && (
                <div className="space-y-3">
                  {generatedContent.reactions.map((r: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-teal-500/30 space-y-2">
                      <div className="font-bold text-white text-sm">{r.reactionName}</div>
                      <code className="text-sm font-mono font-bold text-emerald-300 block bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">{r.chemicalEquation}</code>
                      <p className="text-xs text-slate-300"><strong>Mechanism:</strong> {r.mechanism}</p>
                      <p className="text-xs text-amber-300"><strong>Exceptions:</strong> {r.importantExceptions}</p>
                    </div>
                  ))}
                  <button
                    onClick={handleSaveReaction}
                    disabled={isSaving}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Save to My Reaction Library</span>
                  </button>
                </div>
              )}

              {generatedContent.definitions && (
                <div className="space-y-3">
                  {generatedContent.definitions.map((d: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2">
                      <div className="font-bold text-white text-sm">{d.term}</div>
                      <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                        "{d.nmdcatShortDefinition}"
                      </div>
                      <p className="text-xs text-slate-300">{d.textbookDefinition}</p>
                      {d.distinction && <p className="text-xs text-amber-300">💡 {d.distinction}</p>}
                    </div>
                  ))}
                  <button
                    onClick={handleSaveDefinition}
                    disabled={isSaving}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Save to My Definitions</span>
                  </button>
                </div>
              )}

              {activeSubTab === 'mindmaps' && generatedContent && (
                <div className="space-y-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-sm font-semibold text-white">
                      {generatedContent.centralConcept || generatedContent.centralTopic || aiTopic}
                    </div>
                    {(() => {
                      const bList = Array.isArray(generatedContent)
                        ? generatedContent
                        : (generatedContent.branches || generatedContent.nodes || generatedContent.mindMap?.branches || []);
                      return bList && bList.length > 0 ? (
                        <div className="text-xs text-slate-400">
                          {bList.length} concept branches generated ({bList.map((b: any) => b.label || b.title || 'Branch').join(', ')})
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <button
                    onClick={handleSaveMindMap}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save to My Mind Maps</span>}
                  </button>
                </div>
              )}

              {activeSubTab === 'mnemonics' && generatedContent?.mnemonics && (
                <div className="space-y-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    {generatedContent.mnemonics.map((m: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <div className="text-sm font-semibold text-white">{m.mnemonic}</div>
                        {m.explanation && <div className="text-xs text-slate-400">{m.explanation}</div>}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleSaveMnemonic}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save to My Mnemonics</span>}
                  </button>
                </div>
              )}

              {generatedContent.knowledgeGraph && (
                <div className="space-y-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-sm font-bold text-white">{generatedContent.knowledgeGraph.centralConcept}</div>
                    <div className="text-xs text-slate-400">
                      {generatedContent.knowledgeGraph.nodes?.length || 0} cross-subject concept nodes mapped
                    </div>
                  </div>
                  <button
                    onClick={handleSaveKnowledgeGraph}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save to Knowledge Graphs</span>
                  </button>
                </div>
              )}

              {!firebaseUser && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-slate-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-emerald-400">Local Deck Saving Active</p>
                    <p className="text-slate-400 mt-0.5">Saves to local browser storage. Sign in with Google to sync across devices.</p>
                  </div>
                  {onSignIn && (
                    <button
                      onClick={onSignIn}
                      className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold rounded-lg text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {((!parentActiveSubTab && activeSubTab === 'formulas') || parentActiveSubTab === 'formula_lib') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFormulas.map((f) => {
            const isUserGenerated = userFormulas.some(uf => uf.id === f.id);
            return (
              <div key={f.id} className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        f.subject === 'Physics' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {f.subject}
                      </span>
                      <span className="text-xs text-slate-400">{f.chapter}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{f.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.isHighYield && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <TrendingUp className="w-3 h-3" /> High Yield
                      </span>
                    )}
                    {isUserGenerated && (
                      <button
                        onClick={() => handleDeleteFormula(f.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors"
                        title="Delete formula"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/20 text-center">
                  <code className="text-base font-mono font-bold text-indigo-300 tracking-wide">
                    {f.formula}
                  </code>
                </div>

                {f.variables && f.variables.length > 0 && (
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Variables:</span>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300">
                      {f.variables.map((v, idx) => (
                        <li key={idx}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800">
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-indigo-400 font-semibold block mb-1">Units & Dimension</span>
                    <span className="text-slate-300">{f.unitsAndDimensions}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-amber-400 font-semibold block mb-1">Exam Application</span>
                    <span className="text-slate-300">{f.applications}</span>
                  </div>
                </div>

                {f.commonMistakes && (
                  <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Common Exam Trap:</span>
                      <span>{f.commonMistakes}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {((!parentActiveSubTab && activeSubTab === 'reactions') || parentActiveSubTab === 'reaction_lib') && (
        <div className="space-y-4">
          {filteredReactions.map((r) => {
            const isUserGenerated = userReactions.some(ur => ur.id === r.id);
            return (
              <div key={r.id} className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {r.category} Chemistry
                      </span>
                      <span className="text-xs text-slate-400">{r.chapter}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{r.reactionName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      PMDC Exam Mechanism
                    </span>
                    {isUserGenerated && (
                      <button
                        onClick={() => handleDeleteReaction(r.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors"
                        title="Delete reaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/20">
                  <span className="text-xs text-slate-400 block mb-1 font-semibold">Equation:</span>
                  <code className="text-sm sm:text-base font-mono font-bold text-emerald-400">
                    {r.chemicalEquation}
                  </code>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-indigo-400 font-bold block">Mechanism Type</span>
                    <p className="text-slate-300">{r.mechanism}</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-cyan-400 font-bold block">Conditions & Catalyst</span>
                    <p className="text-slate-300">{r.catalysts} ({r.conditions})</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-amber-400 font-bold block">Exceptions & Traps</span>
                    <p className="text-slate-300">{r.importantExceptions}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {((!parentActiveSubTab && activeSubTab === 'definitions') || parentActiveSubTab === 'definitions') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDefinitions.map((d) => {
            const isUserGenerated = userDefinitions.some(ud => ud.id === d.id);
            return (
              <div key={d.id} className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-lg flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {d.subject} &bull; {d.chapter}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1">{d.term}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConvertDefToFlashcard(d)}
                        className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        title="Convert to Flashcard"
                      >
                        <BookmarkPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">+ Flashcard</span>
                      </button>
                      {isUserGenerated && (
                        <button
                          onClick={() => handleDeleteDefinition(d.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors"
                          title="Delete definition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 block mb-1">
                      NMDCAT High-Yield Short Def
                    </span>
                    <p className="text-xs font-medium text-emerald-200">
                      "{d.nmdcatShortDefinition}"
                    </p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                    <span className="text-slate-400 font-semibold block">Full Textbook Definition:</span>
                    <p className="leading-relaxed">{d.textbookDefinition}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                  {d.relatedTerms && d.relatedTerms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-500 text-[10px] font-bold uppercase">Related:</span>
                      {d.relatedTerms.map((rt, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[10px]">
                          {rt}
                        </span>
                      ))}
                    </div>
                  )}
                  {d.examNotes && (
                    <div className="flex items-center gap-1.5 text-amber-400 text-[11px] bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                      <span>{d.examNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {((!parentActiveSubTab && activeSubTab === 'mindmaps') || parentActiveSubTab === 'mind_maps') && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {allMindMaps.map((mm) => {
              const isSelected = selectedMindMap?.id === mm.id;
              const isUserGenerated = userMindMaps.some(um => um.id === mm.id);
              return (
                <div key={mm.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedMindMap(mm);
                      setExpandedNodeIds({});
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>{mm.subject}: {mm.title}</span>
                  </button>
                  {isUserGenerated && (
                    <button
                      onClick={() => handleDeleteMindMap(mm.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg border border-rose-500/20"
                      title="Delete mind map"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {selectedMindMap ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="text-center mb-8">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Visual Concept Diagram &bull; {selectedMindMap.subject}
                </span>
                <h2 className="text-xl font-bold text-white mt-2">{selectedMindMap.title}</h2>
                <p className="text-xs text-slate-400 mt-1">Click nodes to toggle detailed PMDC subtopics</p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white font-extrabold text-sm sm:text-base px-6 py-4 rounded-2xl shadow-xl border-2 border-indigo-300 text-center max-w-xs animate-pulse">
                  {selectedMindMap.centerConcept}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 w-full">
                  {selectedMindMap.nodes.map((node) => {
                    const isExpanded = expandedNodeIds[node.id] ?? true;
                    return (
                      <div
                        key={node.id}
                        onClick={() => toggleNodeExpand(node.id)}
                        className={`cursor-pointer bg-slate-950 p-5 rounded-2xl border transition-all shadow-lg select-none ${
                          isExpanded
                            ? 'border-emerald-500/80 bg-slate-950/90 ring-2 ring-emerald-500/20'
                            : 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/50'
                        }`}
                      >
                        <h4 className="text-sm font-bold text-white mb-1">{node.label}</h4>
                        <p className="text-xs text-slate-400">{node.description}</p>
                        {isExpanded && node.subNodes?.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                            {node.subNodes.map((sub) => (
                              <div key={sub.id} className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/90 text-xs shadow-inner">
                                <span className="font-bold text-emerald-400 block">{sub.label}</span>
                                <span className="text-slate-300 block text-[11px] mt-1">{sub.detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
              Select a mind map to visualize its concept structure
            </div>
          )}
        </div>
      )}

      {((!parentActiveSubTab && activeSubTab === 'mnemonics') || parentActiveSubTab === 'mnemonics') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMnemonics.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 col-span-2">
              No mnemonics yet. Click "Generate with AI" above to generate high-yield memory hooks!
            </div>
          ) : (
            filteredMnemonics.map((m) => {
              const isUserGenerated = userMnemonics.some(um => um.id === m.id);
              return (
                <div key={m.id} className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{m.subject}</span>
                      <h3 className="text-lg font-bold text-white mt-1">{m.front || m.mnemonic || m.topic}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUserGenerated && (
                        <button
                          onClick={() => handleDeleteMnemonic(m.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                          title="Delete mnemonic"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/20">
                    <p className="text-sm font-bold text-indigo-300 leading-relaxed font-mono">{m.mnemonic || m.front}</p>
                  </div>

                  {m.back && (
                    <div className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                      <span className="font-semibold text-slate-400 block mb-1">What each part means:</span>
                      <p>{m.back}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {((!parentActiveSubTab && activeSubTab === 'knowledge_graph') || parentActiveSubTab === 'knowledge_graph') && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Cross-Subject Concept Nexus
              </span>
              <h2 className="text-xl font-bold text-white mt-2">Interconnected NMDCAT Knowledge Graph</h2>
              <p className="text-xs text-slate-400">Discover how Biology, Chemistry, Physics, and Reasoning concepts interlink in the PMDC exam</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(selectedKnowledgeGraph?.nodes || INITIAL_KNOWLEDGE_GRAPH).map((node: any, idx: number) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {node.subject}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400">{node.mastery || 85}% Mastery</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{node.name || node.label}</h4>
                  <p className="text-xs text-slate-400">{node.details || `Retention decay: ${node.retentionDecayPercent || 90}%`}</p>
                  
                  {node.connectedTopics && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block mb-1 font-semibold uppercase">Linked Topics:</span>
                      <div className="flex flex-wrap gap-1">
                        {node.connectedTopics.map((ct: string, cIdx: number) => (
                          <span key={cIdx} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] border border-slate-800">
                            {ct}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedKnowledgeGraph?.edges && selectedKnowledgeGraph.edges.length > 0 && (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Concept Bridges & Exam Synergies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedKnowledgeGraph.edges.map((e: any, idx: number) => (
                    <div key={idx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{e.relationship}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
