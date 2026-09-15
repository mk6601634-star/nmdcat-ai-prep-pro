import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  Lightbulb, 
  Layers, 
  Network, 
  Filter, 
  Zap, 
  ArrowRight, 
  ExternalLink,
  Tag,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { SubjectType, MCQQuestion, Flashcard, UserDigitalNote } from '../types';

interface SearchResultItem {
  id: string;
  type: 'mcq' | 'note' | 'formula' | 'flashcard' | 'discrepancy';
  title: string;
  subject: SubjectType;
  topic: string;
  snippet: string;
  matchScore: number;
  prerequisites?: string[];
  relatedTopics?: string[];
}

export const SmartSearchEngine: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>('All');
  const [selectedResult, setSelectedResult] = useState<SearchResultItem | null>(null);

  // Sample Knowledge Repository for Smart Semantic Search
  const searchIndex: SearchResultItem[] = [
    {
      id: 'sr1',
      type: 'formula',
      title: 'Faraday’s Law of Electromagnetic Induction',
      subject: 'Physics',
      topic: 'Electromagnetic Induction',
      snippet: 'Induced EMF ε = -N (ΔΦ / Δt). The negative sign signifies Lenz’s Law indicating induced current opposes the flux change.',
      matchScore: 98,
      prerequisites: ['Magnetic Flux', 'Lenz Law', 'Magnetic Field Intensity'],
      relatedTopics: ['Transformers', 'AC Generators', 'Self Inductance']
    },
    {
      id: 'sr2',
      type: 'discrepancy',
      title: 'Enzyme Optimum Temperature - PTB vs STB',
      subject: 'Biology',
      topic: 'Enzymes',
      snippet: 'Punjab Textbook Board (PTB) states human enzyme optimum temperature is 37°C. Sindh Textbook Board (STB) states range 37°C - 40°C. PMDC Key usually accepts 37°C as precise human body standard.',
      matchScore: 95,
      prerequisites: ['Protein Structure', 'Activation Energy'],
      relatedTopics: ['Competitive Inhibition', 'Coenzymes']
    },
    {
      id: 'sr3',
      type: 'mcq',
      title: 'Aldehyde Reduction Reaction Mechanism MCQ',
      subject: 'Chemistry',
      topic: 'Aldehydes & Ketones',
      snippet: 'When Formaldehyde reacts with NaBH4 or LiAlH4 in dry ether, it forms Primary Alcohol (Methanol). Secondary alcohols are formed by Ketones.',
      matchScore: 92,
      prerequisites: ['Nucleophilic Addition', 'Hybridization of Carbonyl Carbon'],
      relatedTopics: ['Tollens Test', 'Fehlings Test', 'Grignard Reagent']
    },
    {
      id: 'sr4',
      type: 'note',
      title: 'Cell Membrane Fluid Mosaic Model Notes',
      subject: 'Biology',
      topic: 'Cell Structure & Function',
      snippet: 'Proposed by Singer and Nicolson in 1972. Phospholipid bilayer acts as fluid matrix while intrinsic and extrinsic proteins float like icebergs in sea.',
      matchScore: 90,
      prerequisites: ['Lipids & Fatty Acids', 'Diffusion & Osmosis'],
      relatedTopics: ['Active Transport', 'Endocytosis', 'Glycoproteins']
    },
    {
      id: 'sr5',
      type: 'flashcard',
      title: 'Speed of Sound in Air at 0°C',
      subject: 'Physics',
      topic: 'Waves & Sound',
      snippet: 'V0 = 332 m/s in dry air at 0°C. Increases by 0.61 m/s for every 1°C rise in temperature (Vt = 332 + 0.61t).',
      matchScore: 89,
      prerequisites: ['Newton Formula', 'Laplace Correction'],
      relatedTopics: ['Doppler Effect', 'Standing Waves']
    }
  ];

  const filteredResults = searchIndex.filter(item => {
    const matchesSubject = activeSubjectFilter === 'All' || item.subject === activeSubjectFilter;
    const matchesType = activeTypeFilter === 'all' || item.type === activeTypeFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      item.title.toLowerCase().includes(query) || 
      item.snippet.toLowerCase().includes(query) ||
      item.topic.toLowerCase().includes(query);

    return matchesSubject && matchesType && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
            <Search className="w-4 h-4" />
            <span>AI Knowledge & Semantic Search Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Universal NMDCAT Search & Concept Linking
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Natural language semantic search across 10,000+ MCQs, Textbook Notes, Formulas, Flashcards, and Multi-Board Discrepancies.
          </p>
        </div>

        {/* Search Bar Input */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts, e.g. 'Faraday Law', 'Enzyme Optimum Temp', 'Aldehyde NaBH4', 'Speed of Sound'..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-12 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-3.5 text-xs text-slate-500 hover:text-slate-300 font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Type Tabs */}
          <div className="flex flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs">
            {['all', 'mcq', 'formula', 'note', 'flashcard', 'discrepancy'].map(type => (
              <button
                key={type}
                onClick={() => setActiveTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all ${
                  activeTypeFilter === type ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type === 'all' ? 'All Content' : type === 'discrepancy' ? 'Textbook Conflicts' : type}
              </button>
            ))}
          </div>

          {/* Subject Filter */}
          <select
            value={activeSubjectFilter}
            onChange={(e) => setActiveSubjectFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="All">All Subjects</option>
            <option value="Biology">Biology</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Physics">Physics</option>
            <option value="English">English</option>
            <option value="Logical Reasoning">Logical Reasoning</option>
          </select>
        </div>
      </div>

      {/* Main Results Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-400 px-1">
            <span>Found {filteredResults.length} relevant entries</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Context Ranked</span>
            </span>
          </div>

          {filteredResults.length === 0 ? (
            <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-300">No matching search items found</p>
              <p className="text-xs text-slate-500">Try searching for broad terms like 'Enzyme', 'Faraday', 'Carboxylic', or 'Fluid Mosaic'.</p>
            </div>
          ) : (
            filteredResults.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedResult(item)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                  selectedResult?.id === item.id
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                      item.type === 'formula' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                      item.type === 'discrepancy' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      item.type === 'mcq' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {item.type}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{item.subject} &bull; {item.topic}</span>
                  </div>

                  <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                    {item.matchScore}% Match
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {item.snippet}
                </p>

                {/* Tags / Related Quick Links */}
                {item.prerequisites && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-semibold">Prerequisite Link:</span>
                    {item.prerequisites.map((pre, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                        {pre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Concept Linker & Prerequisite Tree Panel */}
        <div className="space-y-4">
          {selectedResult ? (
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-indigo-500/30 shadow-xl space-y-4 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Network className="w-4 h-4 text-indigo-400" />
                  <span>Concept Link Map</span>
                </h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded">
                  {selectedResult.subject}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-indigo-200">{selectedResult.title}</h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedResult.snippet}
                </p>
              </div>

              {/* Prerequisite Node Map */}
              {selectedResult.prerequisites && selectedResult.prerequisites.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 block">Prerequisite Foundational Concepts:</span>
                  <div className="space-y-1.5">
                    {selectedResult.prerequisites.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Downstream Topics */}
              {selectedResult.relatedTopics && selectedResult.relatedTopics.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 block">Downstream Exam Applications:</span>
                  <div className="space-y-1.5">
                    {selectedResult.relatedTopics.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/30 p-2 rounded-lg border border-indigo-500/20">
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 text-center space-y-3 text-slate-400">
              <Network className="w-8 h-8 text-indigo-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Concept Linker</h3>
              <p className="text-xs text-slate-500">
                Click on any search item to view its foundational prerequisites, prerequisite graph, and PMDC question links.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
