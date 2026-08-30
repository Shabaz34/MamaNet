'use client';

/** Lightweight formatter for AI text: **bold** spans and "- " bullet lines. */
export default function FormattedText({ text, bulletColor = 'bg-violet-400' }: { text: string; bulletColor?: string }) {
  const lines = text.split('\n');
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((rawLine, i) => {
        const line = rawLine.trim();
        if (!line) return <div key={i} className="h-1.5" aria-hidden="true" />;

        const isBullet = /^[-•*]\s+/.test(line);
        const content = line.replace(/^[-•*]\s+/, '');
        const segments = content.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        const rendered = segments.map((seg, j) =>
          seg.startsWith('**') && seg.endsWith('**') ? (
            <strong key={j} className="font-bold text-slate-900">
              {seg.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{seg}</span>
          ),
        );

        return isBullet ? (
          <div key={i} className="flex items-start gap-2">
            <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${bulletColor}`} />
            <span className="leading-relaxed">{rendered}</span>
          </div>
        ) : (
          <div key={i} className="leading-relaxed">
            {rendered}
          </div>
        );
      })}
    </div>
  );
}
