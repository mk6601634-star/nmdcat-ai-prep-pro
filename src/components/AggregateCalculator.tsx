import React, { useState } from 'react';
import { PAKISTAN_MEDICAL_COLLEGES } from '../data/nmdcatData';
import NMDCAT_CONFIG from '../constants/nmdcatConfig';
import { Calculator, Award, Building2, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export const AggregateCalculator: React.FC = () => {
  const [matricObtained, setMatricObtained] = useState<number>(1040);
  const [matricTotal, setMatricTotal] = useState<number>(1100);
  const [fscObtained, setFscObtained] = useState<number>(1010);
  const [fscTotal, setFscTotal] = useState<number>(1100);
  const [nmdcatScore, setNmdcatScore] = useState<number>(NMDCAT_CONFIG.TOTAL_MCQS);
  const [nmdcatTotal, setNmdcatTotal] = useState<number>(200);

  const [provinceFilter, setProvinceFilter] = useState<string>('All');

  // Calculations according to PMDC formula (10% Matric, 40% FSc, 50% NMDCAT)
  const matricPct = matricTotal > 0 ? (matricObtained / matricTotal) * 10 : 0;
  const fscPct = fscTotal > 0 ? (fscObtained / fscTotal) * 40 : 0;
  const nmdcatPct = nmdcatTotal > 0 ? (nmdcatScore / nmdcatTotal) * 50 : 0;

  const totalAggregate = Math.min(100, Math.max(0, matricPct + fscPct + nmdcatPct));

  const filteredColleges = PAKISTAN_MEDICAL_COLLEGES.filter(col => {
    return provinceFilter === 'All' || col.province === provinceFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
          <Calculator className="w-4 h-4" />
          <span>PMDC Official 10-40-50 Merit Formula</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Pakistani Medical Merit Aggregate Calculator
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Calculate your exact merit percentage and view admission eligibility across top Pakistani public and private medical universities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Input Form */}
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2">
            Enter Your Academic Marks
          </h2>

          {/* SSC / Matric */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex justify-between">
              <span>SSC / Matriculation (10% Weightage)</span>
              <span className="text-indigo-400 font-bold">{matricPct.toFixed(2)}%</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Obtained</span>
                <input
                  type="number"
                  value={matricObtained}
                  onChange={(e) => setMatricObtained(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Total</span>
                <input
                  type="number"
                  value={matricTotal}
                  onChange={(e) => setMatricTotal(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* HSSC / FSc */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex justify-between">
              <span>HSSC / FSc Pre-Medical (40% Weightage)</span>
              <span className="text-indigo-400 font-bold">{fscPct.toFixed(2)}%</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Obtained</span>
                <input
                  type="number"
                  value={fscObtained}
                  onChange={(e) => setFscObtained(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Total</span>
                <input
                  type="number"
                  value={fscTotal}
                  onChange={(e) => setFscTotal(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* NMDCAT */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex justify-between">
              <span>Expected / Actual NMDCAT (50% Weightage)</span>
              <span className="text-indigo-400 font-bold">{nmdcatPct.toFixed(2)}%</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Score</span>
                <input
                  type="number"
                  value={nmdcatScore}
                  onChange={(e) => setNmdcatScore(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Total</span>
                <input
                  type="number"
                  value={nmdcatTotal}
                  onChange={(e) => setNmdcatTotal(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Final Result Card */}
          <div className="bg-gradient-to-tr from-indigo-950 via-slate-900 to-slate-900 p-5 rounded-xl border border-indigo-500/30 text-center space-y-1">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Total Merit Aggregate</span>
            <div className="text-4xl font-black text-emerald-400">{totalAggregate.toFixed(3)}%</div>
            <p className="text-[11px] text-slate-400">Formula: (Matric*10%) + (FSc*40%) + (NMDCAT*50%)</p>
          </div>
        </div>

        {/* Column 2 & 3: Medical College Cutoff Matches */}
        <div className="lg:col-span-2 bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                Medical College Eligibility Matcher
              </h2>
              <p className="text-xs text-slate-400">Comparing your aggregate ({totalAggregate.toFixed(2)}%) with last year cutoffs</p>
            </div>

            {/* Province Filter */}
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none w-full sm:w-auto"
            >
              <option value="All">All Provinces</option>
              <option value="Punjab">Punjab</option>
              <option value="Sindh">Sindh</option>
              <option value="KPK">KPK</option>
              <option value="Balochistan">Balochistan</option>
              <option value="Federal">Federal</option>
              <option value="Private">Private Colleges</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredColleges.map((college, idx) => {
              const diff = totalAggregate - college.lastYearAggregate;
              let chanceTag = 'Safe Admission Chance';
              let badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

              if (diff < -2) {
                chanceTag = 'High Target / Reach';
                badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
              } else if (diff < 0) {
                chanceTag = 'Competitive Borderline';
                badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
              }

              return (
                <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {college.province} &bull; {college.type}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeStyle}`}>
                        {chanceTag}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-100 text-sm mt-2">{college.name}</h3>
                    <p className="text-xs text-slate-400">{college.city}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Last Year Cutoff:</span>
                    <span className="font-bold text-white">{college.lastYearAggregate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
