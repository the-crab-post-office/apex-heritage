export const SETUP_STEPS = ["mode", "era", "track", "team"];
export function nextSetupScreen(screen) {
  const i = SETUP_STEPS.indexOf(screen);
  return i >= 0 && i < 3 ? SETUP_STEPS[i + 1] : screen;
}
export function previousSetupScreen(screen) {
  const i = SETUP_STEPS.indexOf(screen);
  return i > 0 ? SETUP_STEPS[i - 1] : "home";
}
export class MenuFlow {
  constructor({ getConfig, eras, tracks, onProfile }) {
    Object.assign(this, { getConfig, eras, tracks, onProfile });
    this.screen = "home";
    const $ = (s) => document.querySelector(s);
    this.$ = $;
    $("#play-button").onclick = () => this.show("mode");
    $("#setup-next").onclick = () => this.show(nextSetupScreen(this.screen));
    $("#setup-back").onclick = () =>
      this.show(previousSetupScreen(this.screen));
    $("#setup-cancel").onclick = () => this.show("home");
    $("#garage-settings").onclick = () => $("#settings-button").click();
    $("#profile-records").onclick = onProfile;
    document
      .querySelectorAll("[data-nav]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            this.show(
              {
                drive: "mode",
                garage: "garage",
                records: "profile",
                cars: "cars",
              }[b.dataset.nav],
            )),
      );
    $(".brand").onclick = (e) => {
      e.preventDefault();
      this.show("home");
    };
    try {
      $("#driver-name").value =
        localStorage.getItem("apex-driver-name") || "Driver";
    } catch {}
    $("#driver-name").oninput = (e) => {
      try {
        localStorage.setItem("apex-driver-name", e.target.value.trim());
      } catch {}
    };
    this.show("home", false);
  }
  show(screen, focus = true) {
    if (!["home", "garage", "profile", "cars", ...SETUP_STEPS].includes(screen))
      return;
    this.screen = screen;
    const $ = this.$,
      setup = SETUP_STEPS.includes(screen);
    $("#app").dataset.screen = screen;
    document
      .querySelectorAll("section[data-screen]")
      .forEach((el) => (el.hidden = el.dataset.screen !== screen));
    $("#setup-navigation").hidden = !setup;
    $("#setup-actions").hidden = !setup;
    $("#setup-next").hidden = screen === "team";
    $("#start-race").hidden = screen !== "team";
    const heroHost =
      screen === "team"
        ? "team-preview"
        : screen === "cars"
          ? "cars-preview"
          : "home-preview";
    $("#" + heroHost).append($("#hero"));
    $(screen === "cars" ? "#cars-eras" : "#era-picker-host").append(
      $("#era-choices"),
    );
    $(screen === "cars" ? "#cars-teams" : "#team-picker-host").append(
      $(".team-collection"),
    );
    document
      .querySelectorAll("[data-nav]")
      .forEach((b) =>
        b.classList.toggle(
          "active",
          b.dataset.nav ===
            (setup || screen === "home"
              ? "drive"
              : screen === "profile"
                ? "records"
                : screen),
        ),
      );
    document.querySelectorAll("[data-step]").forEach((b) => {
      const index = SETUP_STEPS.indexOf(b.dataset.step),
        current = SETUP_STEPS.indexOf(screen);
      b.classList.toggle("current", index === current);
      b.classList.toggle("complete", index < current);
      if (index === current) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
    this.sync();
    if (focus) {
      window.scrollTo({ top: 0, behavior: "instant" });
      const heading = $(`section[data-screen="${screen}"] h1`);
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    }
  }
  sync() {
    const $ = this.$,
      c = this.getConfig(),
      era = this.eras[c.era],
      team = era.teams[c.team],
      track = this.tracks[c.track];
    const mode = {
      time: "Time trial",
      practice: "Practice",
      race: "Quick race",
    }[c.mode];
    $("#session-summary").textContent =
      `${mode} / ${era.year} / ${track.name} / ${c.weather.toUpperCase()}`;
    $("#setup-selection").textContent =
      this.screen === "mode"
        ? `${mode} · ${c.racingLine !== false ? "Racing line on" : "Racing line off"}`
        : this.screen === "era"
          ? `${era.year} · ${era.name}`
          : this.screen === "track"
            ? `${track.name} · ${(track.length / 1000).toFixed(3)} km`
            : `${team.name} ${team.car} · ${track.name}`;
    $("#loading-track").textContent = track.name;
    $("#loading-car").textContent =
      `${era.year} / ${team.name} ${team.car} / ${mode}`;
    try {
      $("#profile-laps").textContent = JSON.parse(
        localStorage.getItem("apex-records-v16-brake-priority") || "[]",
      ).length;
    } catch {}
  }
}
