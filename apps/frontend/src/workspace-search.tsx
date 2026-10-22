import { useId, useState } from "react";

/** Navigation over the same authorized destinations as the sidebar. No data search. */
export function WorkspaceSearch({ destinations, navigate }: {
  destinations: ReadonlyArray<{ route: string; label: string }>;
  navigate(route: string): void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  return <form className="workspace-search" role="search" aria-label="Buscar módulo" onSubmit={event => {
    event.preventDefault();
    const selected = destinations.find(item => item.label.toLocaleLowerCase("es") === query.trim().toLocaleLowerCase("es"));
    if (selected) { setMessage(""); setQuery(""); navigate(selected.route); }
    else setMessage("Selecciona un módulo de las sugerencias.");
  }}>
    <label className="search"><span className="sr-only">Buscar módulo</span>
      <svg className="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg>
      <input type="search" list={id} placeholder="Ir a un módulo…" value={query} aria-describedby={message ? id + "-message" : undefined}
        onChange={event => { setQuery(event.target.value); setMessage(""); }}/>
      <datalist id={id}>{destinations.map(item => <option key={item.route} value={item.label}/>)}</datalist>
    </label>
    <button className="link-button" type="submit">Ir</button>
    {message && <span id={id + "-message"} className="search-feedback" role="status">{message}</span>}
  </form>;
}

export function ContractingDocuments() {
  return <section className="commercial-guidance" aria-label="Contratación asistida">
    <div><p className="eyebrow">Contratación asistida</p><h3>Del ticket al marco activo</h3>
      <p>Gerencia autoriza la solicitud y entrega el ticket a Operaciones. Operaciones verifica la versión y activa los marcos elegibles en la empresa autorizada.</p>
      <p className="form-guidance">En QA se utiliza el mismo procedimiento, sin cobro. Descargar la plantilla no crea una solicitud ni una aprobación.</p></div>
    <div className="commercial-documents"><a className="button secondary" href="/commercial/ticket-creacion-tenant-qa.pdf" download>Descargar ticket QA</a>
      <a href="/commercial/terminos-comerciales-grc-v2-qa.pdf" target="_blank" rel="noreferrer">Consultar términos GRC V2</a></div>
  </section>;
}
