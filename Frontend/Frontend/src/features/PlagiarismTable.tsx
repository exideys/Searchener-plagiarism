import { PlagiarismResponse } from "../types/analysis";
import { StatBadge } from "../components/StatBadge";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function PlagiarismTable({
  data,
  title,
}: {
  data: PlagiarismResponse;
  title?: string;
}) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 flex-wrap">
        <h3 className="text-base font-semibold">
          {title ?? "Plagiarism check"}
        </h3>
        <StatBadge
          label="Sources"
          value={String(data.potentialSources.length)}
        />
        <StatBadge label="Score" value={pct(data.score)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-y">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-[60px]">
                #
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-[200px]">
                Source URL
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Matched shingles
              </th>
            </tr>
          </thead>
          <tbody>
            {data.potentialSources.length ? (
              data.potentialSources.map((src, i) => (
                <tr key={i} className="border-b last:border-0 align-top">
                  <td className="px-4 py-3 text-gray-500 tabular-nums">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 break-words text-[13px] text-indigo-700">
                    {src.url}
                  </td>
                  <td className="px-4 py-3 text-[13px] whitespace-pre-wrap break-words">
                    {src.matchedShingles && src.matchedShingles.length
                      ? src.matchedShingles.join("\n• ")
                      : "(no exact shingles provided)"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-gray-500 text-sm" colSpan={3}>
                  No plagiarism detected
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
