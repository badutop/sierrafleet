// Données de démonstration pour Sierra Logistics
export const demoVehicles = [
  { immatriculation: "DK-7842-AA", marque: "Iveco", modele: "Stralis 420", type_vehicule: "camion", annee: 2019, couleur: "Blanc", statut: "disponible", km_actuel: 245000, capacite_charge_tonnes: 25, consommation_moyenne: 32, date_assurance: "2026-08-15", date_visite_technique: "2026-03-20", km_derniere_vidange: 240000, km_prochaine_vidange: 250000 },
  { immatriculation: "DK-3156-AB", marque: "Mercedes", modele: "Actros 1845", type_vehicule: "camion", annee: 2020, couleur: "Gris", statut: "en_mission", km_actuel: 198000, capacite_charge_tonnes: 28, consommation_moyenne: 30, date_assurance: "2026-06-10", date_visite_technique: "2026-01-15", km_derniere_vidange: 195000, km_prochaine_vidange: 205000 },
  { immatriculation: "DK-9281-AC", marque: "Renault", modele: "T480", type_vehicule: "camion", annee: 2018, couleur: "Bleu", statut: "en_maintenance", km_actuel: 310000, capacite_charge_tonnes: 24, consommation_moyenne: 34, date_assurance: "2026-09-01", date_visite_technique: "2025-12-01", km_derniere_vidange: 305000, km_prochaine_vidange: 315000 },
  { immatriculation: "DK-5634-AD", marque: "Toyota", modele: "HiLux", type_vehicule: "liaison", annee: 2022, couleur: "Noir", statut: "disponible", km_actuel: 45000, capacite_charge_tonnes: 1, consommation_moyenne: 10, date_assurance: "2026-11-20", date_visite_technique: "2026-07-15", km_derniere_vidange: 42000, km_prochaine_vidange: 52000 },
  { immatriculation: "DK-8127-AE", marque: "Mitsubishi", modele: "Canter", type_vehicule: "utilitaire", annee: 2021, couleur: "Blanc", statut: "en_mission", km_actuel: 89000, capacite_charge_tonnes: 5, consommation_moyenne: 14, date_assurance: "2026-04-30", date_visite_technique: "2026-02-28", km_derniere_vidange: 85000, km_prochaine_vidange: 95000 },
  { immatriculation: "DK-4490-AF", marque: "Iveco", modele: "Daily 70C", type_vehicule: "utilitaire", annee: 2020, couleur: "Orange", statut: "disponible", km_actuel: 120000, capacite_charge_tonnes: 7, consommation_moyenne: 16, date_assurance: "2026-07-25", date_visite_technique: "2026-05-10", km_derniere_vidange: 118000, km_prochaine_vidange: 128000 },
  { immatriculation: "DK-6713-AG", marque: "Mercedes", modele: "Sprinter", type_vehicule: "utilitaire", annee: 2021, couleur: "Blanc", statut: "hors_service", km_actuel: 156000, capacite_charge_tonnes: 3, consommation_moyenne: 12, date_assurance: "2025-12-31", date_visite_technique: "2025-10-15", km_derniere_vidange: 150000, km_prochaine_vidange: 160000 },
  { immatriculation: "DK-2098-AH", marque: "DAF", modele: "XF 480", type_vehicule: "camion", annee: 2019, couleur: "Rouge", statut: "disponible", km_actuel: 275000, capacite_charge_tonnes: 26, consommation_moyenne: 31, date_assurance: "2026-10-05", date_visite_technique: "2026-06-20", km_derniere_vidange: 270000, km_prochaine_vidange: 280000 },
];

export const demoDrivers = [
  { nom: "Diop", prenom: "Moussa", telephone: "+221 77 123 45 67", numero_permis: "SN-2019-45678", categorie_permis: "CE", date_expiration_permis: "2027-03-15", statut: "actif" },
  { nom: "Ndiaye", prenom: "Ibrahima", telephone: "+221 78 234 56 78", numero_permis: "SN-2020-12345", categorie_permis: "CE", date_expiration_permis: "2026-08-20", statut: "en_mission" },
  { nom: "Fall", prenom: "Ousmane", telephone: "+221 76 345 67 89", numero_permis: "SN-2018-98765", categorie_permis: "C", date_expiration_permis: "2026-01-10", statut: "actif" },
  { nom: "Sow", prenom: "Amadou", telephone: "+221 77 456 78 90", numero_permis: "SN-2021-55555", categorie_permis: "CE", date_expiration_permis: "2028-06-30", statut: "en_mission" },
  { nom: "Ba", prenom: "Aliou", telephone: "+221 78 567 89 01", numero_permis: "SN-2019-33333", categorie_permis: "B", date_expiration_permis: "2025-11-25", statut: "actif" },
  { nom: "Gueye", prenom: "Cheikh", telephone: "+221 76 678 90 12", numero_permis: "SN-2020-77777", categorie_permis: "CE", date_expiration_permis: "2027-09-05", statut: "actif" },
];

export function generateDemoTrips(vehicleIds, driverIds) {
  const destinations = ["Dakar", "Thiès", "Saint-Louis", "Kaolack", "Ziguinchor", "Tambacounda", "Mbour", "Rufisque", "Touba", "Louga"];
  const missions = ["Livraison marchandise", "Transport matériaux", "Approvisionnement", "Transfert", "Dépannage", "Livraison ciment", "Transport personnel", "Collecte"];
  const trips = [];
  const now = new Date();
  
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const vi = Math.floor(Math.random() * vehicleIds.length);
    const di = Math.floor(Math.random() * driverIds.length);
    const kmStart = 100000 + Math.floor(Math.random() * 200000);
    const kmDist = 50 + Math.floor(Math.random() * 500);
    const litres = Math.round(kmDist * (25 + Math.random() * 15) / 100);
    const cout = litres * (850 + Math.floor(Math.random() * 150));

    trips.push({
      vehicle_id: vehicleIds[vi],
      driver_id: driverIds[di],
      date_depart: date.toISOString(),
      date_retour: new Date(date.getTime() + (3 + Math.random() * 20) * 3600000).toISOString(),
      mission: missions[Math.floor(Math.random() * missions.length)],
      destination: destinations[Math.floor(Math.random() * destinations.length)],
      departement: ["Flotte", "Mecanique", "Chauffeurs", "Admin"][Math.floor(Math.random() * 4)],
      km_depart: kmStart,
      km_arrivee: kmStart + kmDist,
      km_parcourus: kmDist,
      litres_carburant: litres,
      cout_carburant: cout,
      consommation_l100: Math.round(litres / kmDist * 100 * 10) / 10,
      cout_par_km: Math.round(cout / kmDist),
      observations: "",
      statut: "termine",
    });
  }
  return trips;
}

export function generateDemoFuel(vehicleIds) {
  const stations = ["Total Dakar", "Shell Thiès", "OiLibya Rufisque", "Star Oil Mbour", "Elton Kaolack"];
  const entries = [];
  const now = new Date();

  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const vi = Math.floor(Math.random() * vehicleIds.length);
    const litres = 30 + Math.floor(Math.random() * 170);
    const prixLitre = 850 + Math.floor(Math.random() * 200);

    entries.push({
      vehicle_id: vehicleIds[vi],
      date: date.toISOString().split("T")[0],
      station: stations[Math.floor(Math.random() * stations.length)],
      litres,
      prix_litre: prixLitre,
      montant_total: litres * prixLitre,
      km_compteur: 100000 + Math.floor(Math.random() * 200000),
    });
  }
  return entries;
}

export function generateDemoMaintenance(vehicleIds) {
  const types = ["vidange", "revision", "pneus", "filtres", "freins", "controle_technique"];
  const prestataires = ["Garage Diallo", "Auto Service Dakar", "Mécanique Centrale", "Atelier Ndiaye"];
  const entries = [];
  const now = new Date();

  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const vi = Math.floor(Math.random() * vehicleIds.length);
    const type = types[Math.floor(Math.random() * types.length)];

    entries.push({
      vehicle_id: vehicleIds[vi],
      type_entretien: type,
      designation: type === "vidange" ? "Vidange moteur + filtre" : type === "pneus" ? "Remplacement 2 pneus" : "Entretien " + type,
      date_entretien: date.toISOString().split("T")[0],
      prestataire: prestataires[Math.floor(Math.random() * prestataires.length)],
      cout: 15000 + Math.floor(Math.random() * 300000),
      pieces_remplacees: type === "vidange" ? "Huile moteur, filtre huile" : type === "pneus" ? "2 pneus 315/80" : "",
      km_entretien: 100000 + Math.floor(Math.random() * 200000),
      statut: "realise",
    });
  }
  return entries;
}