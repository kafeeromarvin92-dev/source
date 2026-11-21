import TournamentDetailPanel from "../../components/TournamentDetailPanel";

export default async function PlayerTournamentBracketPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TournamentDetailPanel tournamentId={id} />;
}
