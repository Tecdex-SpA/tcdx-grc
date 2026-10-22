import {sql,type Kysely} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import type {CoreActor} from '../core-grc/model.js';
import {readEffectiveConfiguration} from './effective-read.js';
import {concealed,invariant} from '../normative-library/authorization.js';

/** Prepared specialization of the existing persisted GET. No resolve/materialize side effect. */
export async function readEffectiveControlConfiguration(database:Kysely<FoundationDatabase>,actor:CoreActor,id:string){
 return database.transaction().setIsolationLevel('repeatable read').execute(async tx=>{
  await sql`SET TRANSACTION READ ONLY`.execute(tx);
  const result=await readEffectiveConfiguration(tx,actor,id);
  const target=await sql<{control_version_id:string|null;valid:boolean}>`SELECT ec.control_version_id,
    (ec.control_version_id IS NULL OR (cv.control_version_id IS NOT NULL AND ec.resolved_for_subject_id IS NULL))
    AND NOT EXISTS(SELECT 1 FROM config.effective_configuration_layers l JOIN config.configuration_overrides o ON o.configuration_override_id=l.configuration_override_id
      WHERE l.effective_configuration_id=ec.effective_configuration_id AND o.scope_level='control_version' AND (o.tenant_id<>ec.tenant_id OR o.control_version_id IS DISTINCT FROM ec.control_version_id OR o.configuration_definition_id<>ec.configuration_definition_id)) AS valid
    FROM config.effective_configurations ec LEFT JOIN controls.control_versions cv ON cv.control_version_id=ec.control_version_id AND cv.tenant_id=ec.tenant_id AND cv.ownership_class='TENANT_OWNED'
    WHERE ec.effective_configuration_id=${id}::uuid AND ec.tenant_id=${actor.tenantId}::uuid`.execute(tx);
  const row=target.rows[0];if(!row)concealed();if(!row.valid)invariant('Effective configuration control lineage conflict');
  return {...result,control_version_id:row.control_version_id};
 });
}
