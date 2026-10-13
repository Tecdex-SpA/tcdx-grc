import { readFileSync } from "node:fs";
export const phase6a3PermissionCodes=JSON.parse(readFileSync(new URL("../../docs/executable-contracts/29_PHASE6A3_RBAC_MANIFEST.json",import.meta.url),"utf8")).permission_codes;
// Successor inventory; historical migration generators and lineage remain unchanged.
export function extendPhase6a3Inventory(inventory) {
 return { ...inventory, phase6a3Amendment: "MACRO-STEP6A3-20261009-R1", tables: inventory.tables.map(table => {
 if (table.name === "config.effective_configurations") return {...table, uniqueConstraints: table.uniqueConstraints.filter(cols => !(cols.length===1 && cols[0]==="tenant_id")).concat([["tenant_id","configuration_definition_id","resolved_for_subject_id","effective_at","input_hash"]])};
 if (table.name === "config.effective_configuration_layers") return {...table, uniqueConstraints: table.uniqueConstraints.filter(cols => !(cols.length===1 && cols[0]==="ordinal")).concat([["effective_configuration_id","precedence_level","ordinal"]])};
 if (table.name === "config.configuration_definitions") return {...table, checks: table.checks.filter(key=>key!=="default_value_count").concat(["typed_default"])};
 return table;
 })};
}
