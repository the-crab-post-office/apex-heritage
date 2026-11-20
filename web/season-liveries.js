import database from "../data/liveries-2026.json" with { type: "json" };
export const specialLiveries = database.specials;
export function liveriesFor(team) { return specialLiveries.filter(l => l.team_id === team.id); }
export function paintedTeam(team, id) {
 const special = liveriesFor(team).find(l => l.id === id);
 return special ? { ...team, ...special, constructor_id: team.id } : team;
}
