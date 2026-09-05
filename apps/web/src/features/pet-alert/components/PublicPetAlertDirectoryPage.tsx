"use client";

import type { PetAlertPublicDirectoryView, PublicPetAlertDirectoryEvent } from "@pet/types";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { getBrowserPetAlertApiClient } from "../../core/services/supabase-browser";

const PublicPetAlertMap = dynamic(
  () => import("./PublicPetAlertMap").then((module) => module.PublicPetAlertMap),
  { loading: () => <div className="state">Preparando mapa comunitario...</div>, ssr: false }
);

const PAGE_SIZE = 18;
const views: Array<{ id: PetAlertPublicDirectoryView; label: string; help: string }> = [
  { id: "lost", label: "Extraviadas", help: "Mascotas registradas por sus familias" },
  { id: "seen", label: "Mascotas vistas", help: "Reportes compartidos por la comunidad" },
  { id: "found", label: "Encontradas", help: "Reencuentros confirmados" }
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeZone: "America/Panama"
  }).format(new Date(value));
}

function statusLabel(item: PublicPetAlertDirectoryEvent) {
  if (item.statusGroup === "found") return "Encontrada";
  if (item.eventType === "community_sighting") return "Vista recientemente";
  if (item.status === "possible_match") return "Posible coincidencia";
  if (item.status === "sighting_received") return "Con avistamientos";
  return "Extraviada";
}

export function PublicPetAlertDirectoryPage() {
  const [view, setView] = useState<PetAlertPublicDirectoryView>("lost");
  const [queryInput, setQueryInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [speciesInput, setSpeciesInput] = useState("");
  const [filters, setFilters] = useState({ query: "", city: "", species: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resultsMode, setResultsMode] = useState<"list" | "map">("list");
  const [items, setItems] = useState<PublicPetAlertDirectoryEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (offset = 0) => {
    if (offset) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const page = await getBrowserPetAlertApiClient().listPublicPetAlertDirectory({
        view,
        query: filters.query || null,
        city: filters.city || null,
        species: filters.species || null,
        limit: PAGE_SIZE,
        offset
      });
      setItems((current) => offset ? [...current, ...page.items] : page.items);
      setTotal(page.total);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "No fue posible cargar los boletines.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, view]);

  useEffect(() => { void load(); }, [load]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setFilters({ query: queryInput.trim(), city: cityInput.trim(), species: speciesInput.trim() });
  }

  function clearFilters() {
    setQueryInput("");
    setCityInput("");
    setSpeciesInput("");
    setFilters({ query: "", city: "", species: "" });
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <span className="eyebrow">PET ALERT COMUNIDAD</span>
          <h1>Boletines de mascotas</h1>
          <p>Consulta reportes públicos y ayuda a que más mascotas vuelvan a casa.</p>
        </div>
        <div className="headerActions">
          <a className="primary" href="/pet-alert/reportar-mascota-vista">Vi una mascota perdida</a>
          <a className="secondary" href="/pet-alert/reportar-mi-mascota">Reportar mi mascota</a>
        </div>
      </header>

      <section className="directory" aria-label="Centro comunitario PET ALERT">
        <nav className="tabs" aria-label="Tipos de boletín">
          {views.map((option) => (
            <button
              aria-pressed={view === option.id}
              className={view === option.id ? "tab active" : "tab"}
              key={option.id}
              onClick={() => setView(option.id)}
              type="button"
            >
              <strong>{option.label}</strong><small>{option.help}</small>
            </button>
          ))}
        </nav>

        <form className="search" onSubmit={applyFilters}>
          <label>
            <span className="srOnly">Buscar boletines</span>
            <input onChange={(event) => setQueryInput(event.target.value)} placeholder="Buscar por nombre, especie, raza o zona" value={queryInput} />
          </label>
          <button className="searchButton" type="submit">Buscar</button>
          <button className="filterButton" onClick={() => setFiltersOpen((current) => !current)} type="button">Filtros</button>
          {filtersOpen ? (
            <div className="filters">
              <label>Ciudad<input onChange={(event) => setCityInput(event.target.value)} placeholder="Ej. Panamá" value={cityInput} /></label>
              <label>Especie<input onChange={(event) => setSpeciesInput(event.target.value)} placeholder="Ej. Perro" value={speciesInput} /></label>
              <button onClick={clearFilters} type="button">Limpiar</button>
            </div>
          ) : null}
        </form>

        <div className="mode" aria-label="Vista de resultados">
          <button aria-pressed={resultsMode === "list"} onClick={() => setResultsMode("list")} type="button">Lista</button>
          <button aria-pressed={resultsMode === "map"} onClick={() => setResultsMode("map")} type="button">Mapa</button>
        </div>

        {resultsMode === "map" ? <PublicPetAlertMap city={filters.city} query={filters.query} species={filters.species} view={view}/> : <><div className="resultsHeader">
          <div><span className="eyebrow">RESULTADOS</span><h2>{views.find((option) => option.id === view)?.label}</h2></div>
          <span>{total} {total === 1 ? "boletín" : "boletines"}</span>
        </div>

        {loading ? <div className="state">Cargando boletines públicos...</div> : null}
        {error ? <div className="state error"><strong>No pudimos cargar PET ALERT.</strong><p>{error}</p><button onClick={() => void load()} type="button">Reintentar</button></div> : null}
        {!loading && !error && !items.length ? (
          <div className="state"><strong>No hay boletines con estos filtros.</strong><p>Prueba otra especie, ciudad o palabra de búsqueda.</p>{filters.query || filters.city || filters.species ? <button onClick={clearFilters} type="button">Limpiar búsqueda</button> : null}</div>
        ) : null}

        {!loading && !error && items.length ? (
          <div className="grid">
            {items.map((item) => (
              <article className="card" key={`${item.eventType}-${item.publicSlug}`}>
                <a className="media" href={item.publicPath} aria-label={`Ver boletín de ${item.title}`}>
                  {item.photoUrl ? <img alt={item.title} src={item.photoUrl} /> : <span className="noPhoto">Sin fotografía disponible</span>}
                  <small className={item.statusGroup === "found" ? "status found" : "status"}>{statusLabel(item)}</small>
                </a>
                <div className="cardBody">
                  <small>{item.eventType === "lost_pet" ? "REPORTE DE FAMILIA" : "REPORTE COMUNITARIO"}</small>
                  <h3>{item.title}</h3>
                  <p className="meta">{item.species}{item.breed ? ` · ${item.breed}` : ""}</p>
                  <strong>{item.city}{item.region ? `, ${item.region}` : ""}</strong>
                  <p className="summary">{item.summary}</p>
                  <div className="cardFooter"><span>Actualizado {formatDate(item.updatedAt)}</span><a href={item.publicPath}>Ver boletín</a></div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {items.length < total ? <button className="more" disabled={loadingMore} onClick={() => void load(items.length)} type="button">{loadingMore ? "Cargando..." : "Ver más boletines"}</button> : null}</>}
      </section>
      <footer className="safety"><strong>Ayuda con responsabilidad.</strong><span>No publiques direcciones exactas ni datos personales. Ante riesgo inmediato, contacta a las autoridades o rescatistas locales.</span></footer>
      <style jsx>{`.mode{background:#eef4f2;border-radius:8px;display:grid;gap:4px;grid-template-columns:1fr 1fr;margin:0 0 16px;padding:4px}.mode button{background:transparent;border:0;border-radius:6px;color:#53635f;font:inherit;font-size:12px;font-weight:900;padding:9px}.mode button[aria-pressed="true"]{background:#fff;color:#116e65;box-shadow:0 1px 4px rgba(20,60,54,.12)}`}</style>
      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .page{background:#f8faf9;color:#17211f;min-height:100vh;padding:24px 18px 48px}.header,.directory,.safety{margin:0 auto;max-width:1180px}.header{align-items:end;background:#146c63;border-radius:8px;color:#fff;display:flex;justify-content:space-between;padding:30px}.eyebrow{font-size:11px;font-weight:900}.header h1{font-size:38px;letter-spacing:0;line-height:1.05;margin:8px 0}.header p{color:#dff7f1;margin:0;max-width:620px}.headerActions{display:flex;flex-wrap:wrap;gap:8px}.headerActions a,.cardFooter a{border-radius:999px;font-weight:800;text-decoration:none}.primary{background:#fff;color:#146c63;padding:11px 15px}.secondary{border:1px solid #9bd4cb;color:#fff;padding:10px 15px}.directory{padding-top:20px}.tabs{display:grid;gap:8px;grid-template-columns:repeat(3,1fr)}.tab{background:#fff;border:1px solid #d6e5e1;border-radius:8px;color:#41514e;display:grid;gap:3px;padding:12px;text-align:left}.tab small{font-size:12px}.tab.active{background:#e6f7f3;border-color:#16897d;color:#0d6f66}.search{display:grid;gap:8px;grid-template-columns:1fr auto auto;margin:16px 0;position:relative}.search input,.filters input{border:1px solid #cddbd7;border-radius:8px;font:inherit;padding:12px;width:100%}.searchButton,.filterButton,.filters button,.state button,.more{border-radius:8px;font-weight:800;padding:11px 16px}.searchButton,.more{background:#15877c;border:1px solid #15877c;color:#fff}.filterButton,.filters button,.state button{background:#fff;border:1px solid #9dc9c2;color:#116e65}.filters{background:#fff;border:1px solid #d6e5e1;border-radius:8px;display:grid;gap:10px;grid-column:1/-1;grid-template-columns:1fr 1fr auto;padding:14px}.filters label{display:grid;font-size:12px;font-weight:800;gap:5px}.resultsHeader{align-items:end;display:flex;justify-content:space-between;margin:24px 0 12px}.resultsHeader h2{font-size:26px;margin:3px 0 0}.resultsHeader>span{background:#eef3f2;border-radius:999px;padding:7px 11px}.grid{display:grid;gap:14px;grid-template-columns:repeat(3,minmax(0,1fr))}.card{background:#fff;border:1px solid #d6e5e1;border-radius:8px;overflow:hidden}.media{aspect-ratio:16/10;background:#e4f1ee;display:grid;overflow:hidden;place-items:center;position:relative;text-decoration:none}.media img{box-sizing:border-box;height:100%;object-fit:contain;object-position:center;padding:8px;width:100%}.media .noPhoto{color:#47706b;font-size:13px;font-weight:800;text-align:center}.status{background:#fff0e6;border:1px solid #f3b78c;border-radius:999px;bottom:10px;color:#a64412;font-size:11px;font-weight:900;padding:6px 9px;position:absolute;right:10px}.status.found{background:#e4f7ed;border-color:#9ad5b3;color:#167244}.cardBody{display:grid;gap:6px;padding:15px}.cardBody>small{color:#17786f;font-size:10px;font-weight:900}.card h3{font-size:21px;margin:0}.meta,.summary{color:#60706d;margin:0}.summary{-webkit-box-orient:vertical;-webkit-line-clamp:2;display:-webkit-box;line-height:1.4;min-height:40px;overflow:hidden}.cardFooter{align-items:center;border-top:1px solid #edf1f0;display:flex;font-size:11px;justify-content:space-between;margin-top:6px;padding-top:10px}.cardFooter a{background:#e4f5f1;color:#116e65;padding:7px 10px}.state{background:#fff;border:1px dashed #b9cfca;border-radius:8px;padding:34px;text-align:center}.state p{color:#65736f}.state.error{border-color:#e5aaa3;color:#9e2f25}.more{display:block;margin:18px auto}.safety{border-top:1px solid #d6e5e1;display:flex;gap:10px;margin-top:28px;padding-top:18px}.safety span{color:#60706d}.srOnly{height:1px;overflow:hidden;position:absolute;width:1px}@media(max-width:780px){.page{padding:10px 10px 34px}.header{align-items:start;display:grid;gap:18px;padding:22px}.header h1{font-size:30px}.tabs{grid-template-columns:1fr}.search{grid-template-columns:1fr auto}.filterButton{grid-column:1/-1}.filters{grid-template-columns:1fr}.grid{grid-template-columns:1fr}.safety{display:grid}.resultsHeader h2{font-size:23px}}@media(min-width:781px) and (max-width:1020px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.page,.header,.directory,.safety{box-sizing:border-box;min-width:0}.search{grid-template-columns:minmax(0,1fr) auto auto}.search label{min-width:0}.search input,.filters input{box-sizing:border-box;min-width:0}@media(max-width:780px){.search{grid-template-columns:minmax(0,1fr) auto}}
`;
