import assetStatus from "../data/car-asset-status.json";
import { referenceCar } from "./reference-car.js";
import { eras } from "./catalog.js";
export function makeCar(era = 2, color = "#e53c2f", selectedTeam = null) {
  const team =
    selectedTeam ||
    eras[era].teams.find((t) => t.color === color) ||
    eras[era].teams[0];
  const car = referenceCar(era, team);
  car.userData.assetProvenance = assetStatus.cars.find((c) => c.id === (team.constructor_id || team.id));
  return car;
}
