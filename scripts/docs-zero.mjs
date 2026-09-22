import fs from "node:fs";

function edit(file, from, to, label) {
  let t = fs.readFileSync(file, "utf8");
  if (!t.includes(from)) {
    console.error(`NICHT GEFUNDEN [${label}] in ${file}`);
    process.exit(1);
  }
  fs.writeFileSync(file, t.split(from).join(to));
  console.log(`ok: ${label}`);
}

// ── README: Demo → Initialer Zugang ──
edit(
  "README.md",
  `## Demo-Zugangsdaten

> ⚠️ Nur für Entwicklung/Demo – im Produktivbetrieb unbedingt ändern!

| Rolle | Benutzername | Passwort |
| --- | --- | --- |
| Admin | \`admin\` | \`admin123\` |
| Mitarbeiter | \`max\` | \`demo123\` |
| Mitarbeiter | \`john\` | \`demo123\` |
| Mitarbeiter | \`sarah\` | \`demo123\` |
| Mitarbeiter (Kasse + Küche) | \`koch\` | \`kueche123\` |`,
  `## Initialer Zugang

> Das System startet bei 0 – es gibt keine Demo-Daten. Der Seed legt nur den
> Admin-Zugang an; Produkte, Kategorien, Menüs und Mitarbeiter erstellst du im
> Admin-Panel.

| Rolle | Benutzername | Passwort |
| --- | --- | --- |
| Admin | \`admin\` | \`admin123\` (Initial-Passwort – nach dem ersten Login ändern) |`,
  "README-Demo-Tabelle"
);

edit(
  "README.md",
  "Login (admin/max/koch)",
  "Login (admin)",
  "README-Ablauf-Login"
);

edit(
  "README.md",
  "npm run db:seed         # Demo-Daten",
  "npm run db:seed         # erzeugt nur den initialen Admin-Zugang",
  "README-db:seed"
);

edit(
  "README.md",
  "## Produktions-Hinweise",
  "## Betrieb auf 0 setzen\n\n```bash\nnpm run db:clean   # löscht alle Geschäftsdaten + nicht-Admin-Benutzer (Admin bleibt)\n```\n\n## Produktions-Hinweise",
  "README-db:clean"
);

// ── DEPLOYMENT.md: Demo-Passwort-Hinweis anpassen ──
edit(
  "DEPLOYMENT.md",
  "- **Demo-Zugangsdaten zwingend ändern** (`admin/admin123` u. a., siehe README).",
  "- **Initial-Passwort ändern**: Es gibt keine Demo-Daten; der Zugang `admin/admin123`\n  ist ein Initial-Passwort und sollte nach dem ersten Login geändert werden.",
  "DEPLOYMENT-Demo-Hinweis"
);

// ── package.json: db:clean ├ün ──
const pkgFile = "package.json";
const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
if (!pkg.scripts["db:clean"]) {
  pkg.scripts["db:clean"] = "node scripts/reset-data.mjs";
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
  console.log("ok: package.json db:clean");
} else {
  console.log("ok: db:clean existiert bereits");
}

console.log("FERTIG");