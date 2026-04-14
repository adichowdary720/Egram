import { formatDistanceToNow } from "date-fns";
import { Award, Image as ImageIcon } from "lucide-react";

export interface Certificate {
    id: string;
    userId: string;
    title: string;
    description: string;
    imageUrl?: string;
    timestamp: any;
}

export function CertificateCard({ certificate }: { certificate: Certificate }) {
    return (
        <div className="glass rounded-xl overflow-hidden hover:border-zinc-700 transition-all group flex flex-col h-full">
            {certificate.imageUrl ? (
                <div className="w-full h-40 bg-zinc-900 border-b border-zinc-800/50 overflow-hidden relative">
                    <img
                        src={certificate.imageUrl}
                        alt={certificate.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-xs text-white/80 font-medium">View Image</span>
                    </div>
                </div>
            ) : (
                <div className="w-full h-24 bg-gradient-to-br from-zinc-800 to-zinc-900 border-b border-zinc-800/50 flex flex-col items-center justify-center shrink-0">
                    <Award className="w-8 h-8 text-zinc-600 mb-1" />
                    <span className="text-xs text-zinc-500 font-medium tracking-widest uppercase">Egram</span>
                </div>
            )}

            <div className="p-4 flex flex-col flex-1">
                <h3 className="text-white font-semibold text-base mb-1 line-clamp-2 leading-tight flex-1">
                    {certificate.title}
                </h3>

                {certificate.description && (
                    <p className="text-zinc-400 text-sm line-clamp-2 mb-3 leading-relaxed">
                        {certificate.description}
                    </p>
                )}

                <div className="mt-auto pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                        {certificate.timestamp?.toDate()
                            ? new Date(certificate.timestamp.toDate()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                            : 'Recently added'}
                    </span>
                    <Award className="w-3.5 h-3.5 text-[var(--primary)] opacity-70" />
                </div>
            </div>
        </div>
    );
}
