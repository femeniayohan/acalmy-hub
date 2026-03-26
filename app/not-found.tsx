import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f5f4f0] flex items-center justify-center">
      <div className="text-center max-w-sm">
        <p className="text-xs font-medium text-[rgba(0,0,0,0.35)] uppercase tracking-wider mb-4">
          Espace introuvable
        </p>
        <h1 className="text-2xl font-semibold text-[#0a0a0a] mb-2">
          Cette page n'existe pas
        </h1>
        <p className="text-sm text-[rgba(0,0,0,0.5)] mb-6">
          L'adresse que vous avez saisie est incorrecte ou cet espace client n'existe pas.
          Vérifiez l'URL ou contactez votre interlocuteur Acalmy.
        </p>
        <a
          href="https://acalmy.com"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
            bg-[#0a0a0a] text-white rounded-[8px] hover:bg-[#1a1a1a] transition-colors"
        >
          Retour au site Acalmy
        </a>
      </div>
    </div>
  )
}
