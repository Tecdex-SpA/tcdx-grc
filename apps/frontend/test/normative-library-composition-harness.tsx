// Synthetic test harness only; never imported by the product bootstrap.
import React,{useState,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {ApiClient} from '../src/api-client.js';
import {ConnectedKnowledgeContent} from '../src/normative-library-hooks.js';
import '../src/styles.css';
const first='018f47f2-6170-7000-8000-000000000001',second='018f47f2-6170-7000-8000-000000000002';
function Harness(){const [tenant,setTenant]=useState(first);const api=useMemo(()=>new ApiClient(location.origin,{getAccessToken:async()=> 'synthetic-browser-fixture',clearSession:async()=>{}},()=>({tenantId:tenant})),[tenant]);return <main className="workspace"><h1>Biblioteca — composición aislada</h1><button onClick={()=>setTenant(second)}>Cambiar contexto de test</button><ConnectedKnowledgeContent api={api} versionId="018f47f2-6170-7000-8000-000000000003"/></main>;}
createRoot(document.getElementById('root')!).render(<Harness/>);
