//! One editable roster shared with the web catalog; tuning is illustrative, not dyno telemetry.
use serde::Deserialize;
use std::sync::OnceLock;
#[derive(Deserialize)]
pub struct Team {
    pub id: String,
    #[serde(default)]
    pub helmet_color: Option<String>,
    #[serde(default)]
    pub rim_color: Option<String>,
    #[serde(default)]
    pub endplate_color: Option<String>,
    #[serde(default)]
    pub front_endplate_color: Option<String>,
    pub name: String,
    pub car: String,
    pub number: u32,
    pub color: String,
    pub secondary: String,
    pub accent: String,
    pub style: String,
    pub engine: String,
    pub turbo: bool,
    pub power: f32,
    pub grip: f32,
    pub brake: f32,
}
#[derive(Deserialize)]
pub struct Era {
    pub year: String,
    pub teams: Vec<Team>,
}
#[derive(Deserialize)]
struct Database {
    eras: Vec<Era>,
}
pub fn eras() -> &'static [Era] {
    static DATA: OnceLock<Database> = OnceLock::new();
    &DATA
        .get_or_init(|| {
            serde_json::from_str(include_str!("../data/roster.json")).expect("valid season roster")
        })
        .eras
}
pub fn era_index(era: usize) -> usize {
    if era < eras().len() {
        era
    } else {
        3
    }
}
pub fn teams(era: usize) -> &'static [Team] {
    &eras()[era_index(era)].teams
}
pub fn team(era: usize, index: usize) -> &'static Team {
    let list = teams(era);
    &list[index.min(list.len() - 1)]
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn full_constructor_rosters_are_unique_and_have_distinct_handling() {
        let mut ids = std::collections::HashSet::new();
        for (e, count) in [9, 18, 10, 10, 10, 11].into_iter().enumerate() {
            assert_eq!(teams(e).len(), count);
            let mut powers = std::collections::HashSet::new();
            for (i, t) in teams(e).iter().enumerate() {
                assert!(ids.insert(&t.id));
                let s = crate::car_spec(e, i);
                assert!(s.power.is_finite() && s.power > 100000.);
                assert!(powers.insert(s.power.to_bits()) || e == 5); // 2026 baseline deliberately does not invent rankings
                assert_eq!(s.lag > 0.5, e == 1 && t.turbo);
                assert!(!t.engine.is_empty());
            }
        }
    }
    #[test]
    fn invalid_team_and_era_indices_have_safe_bounded_fallbacks() {
        assert_eq!(team(usize::MAX, usize::MAX).id, "2023-haas");
        assert!(crate::car_spec(999, 999).power.is_finite());
    }
    #[test]
    fn naturally_aspirated_1988_teams_do_not_inherit_honda_turbo_lag() {
        for t in ["Williams", "Benetton", "March", "Tyrrell"] {
            let i = teams(1).iter().position(|x| x.name == t).unwrap();
            assert_eq!(crate::car_spec(1, i).lag, 0.);
            let mut sim = crate::Simulation::new(0, 1, i, false, true);
            for _ in 0..120 {
                sim.step(1., 0., 0., 1. / 60.);
            }
            assert_eq!(sim.state.boost, 0.);
        }
        assert!(crate::car_spec(1, 0).lag > 1.);
    }
}
