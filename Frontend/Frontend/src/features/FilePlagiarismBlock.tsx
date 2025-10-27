import { useState } from "react";
import { FilePlagiarismItem } from "../types/analysis";
import { PlagiarismTable } from "./PlagiarismTable";

export function FilePlagiarismBlock({
  results,
}: {
  results: FilePlagiarismItem[];
}) {
  const [tab, setTab] = useState(0);

  if (!results.length) return null;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {results.map((it, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`px-3 py-1.5 rounded-xl border text-sm ${
              tab === i
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            {it.fileName || `File ${i + 1}`}
          </button>
        ))}
      </div>

      <PlagiarismTable
        data={{
          score: results[tab].score,
          potentialSources: results[tab].potentialSources,
        }}
        title={`Plagiarism — ${results[tab].fileName || `File ${tab + 1}`}`}
      />
    </div>
  );
}
