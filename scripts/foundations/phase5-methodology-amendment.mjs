export const methodologyTables = [
  {
    "name": "regulatory.compliance_methodologies",
    "profile": "MXI",
    "primaryKey": [
      "compliance_methodology_id"
    ],
    "columns": [
      {
        "name": "compliance_methodology_id",
        "type": "uuid",
        "nullable": false,
        "default": null
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "nullable": false,
        "default": "CURRENT_TIMESTAMP"
      },
      {
        "name": "created_by_user_identity_id",
        "type": "uuid",
        "nullable": true,
        "default": null
      },
      {
        "name": "created_by_service_principal_id",
        "type": "uuid",
        "nullable": true,
        "default": null
      },
      {
        "name": "ownership_class",
        "type": "varchar(24)",
        "nullable": false,
        "default": null
      },
      {
        "name": "tenant_id",
        "type": "uuid",
        "nullable": true,
        "default": null
      },
      {
        "name": "methodology_code",
        "type": "varchar(128)",
        "nullable": false,
        "default": null
      },
      {
        "name": "version_number",
        "type": "bigint",
        "nullable": false,
        "default": null
      },
      {
        "name": "name",
        "type": "text",
        "nullable": false,
        "default": null
      },
      {
        "name": "rector_source",
        "type": "text",
        "nullable": false,
        "default": null
      },
      {
        "name": "rector_version",
        "type": "varchar(128)",
        "nullable": false,
        "default": null
      },
      {
        "name": "formula_definition_id",
        "type": "uuid",
        "nullable": false,
        "default": null
      },
      {
        "name": "minimum_coverage",
        "type": "numeric(5,2)",
        "nullable": false,
        "default": null
      },
      {
        "name": "partial_compliance_factor",
        "type": "numeric(5,4)",
        "nullable": false,
        "default": null
      },
      {
        "name": "lifecycle_state",
        "type": "varchar(32)",
        "nullable": false,
        "default": null
      },
      {
        "name": "effective_from",
        "type": "timestamptz",
        "nullable": false,
        "default": null
      },
      {
        "name": "effective_to",
        "type": "timestamptz",
        "nullable": true,
        "default": null
      },
      {
        "name": "published_at",
        "type": "timestamptz",
        "nullable": true,
        "default": null
      }
    ],
    "checks": [],
    "uniqueConstraints": [
      [
        "tenant_id",
        "compliance_methodology_id"
      ],
      [
        "methodology_code",
        "version_number"
      ]
    ]
  },
  {
    "name": "controls.control_effectiveness_methodologies",
    "profile": "MXI",
    "primaryKey": [
      "control_effectiveness_methodology_id"
    ],
    "columns": [
      {
        "name": "control_effectiveness_methodology_id",
        "type": "uuid",
        "nullable": false,
        "default": null
      },
      {
        "name": "created_at",
        "type": "timestamptz",
        "nullable": false,
        "default": "CURRENT_TIMESTAMP"
      },
      {
        "name": "created_by_user_identity_id",
        "type": "uuid",
        "nullable": true,
        "default": null
      },
      {
        "name": "created_by_service_principal_id",
        "type": "uuid",
        "nullable": true,
        "default": null
      },
      {
        "name": "ownership_class",
        "type": "varchar(24)",
        "nullable": false,
        "default": null
      },
      {
        "name": "tenant_id",
        "type": "uuid",
        "nullable": true,
        "default": null
      },
      {
        "name": "methodology_code",
        "type": "varchar(128)",
        "nullable": false,
        "default": null
      },
      {
        "name": "version_number",
        "type": "bigint",
        "nullable": false,
        "default": null
      },
      {
        "name": "name",
        "type": "text",
        "nullable": false,
        "default": null
      },
      {
        "name": "rector_source",
        "type": "text",
        "nullable": false,
        "default": null
      },
      {
        "name": "rector_version",
        "type": "varchar(128)",
        "nullable": false,
        "default": null
      },
      {
        "name": "formula_definition_id",
        "type": "uuid",
        "nullable": false,
        "default": null
      },
      {
        "name": "minimum_coverage",
        "type": "numeric(5,2)",
        "nullable": false,
        "default": null
      },
      {
        "name": "lifecycle_state",
        "type": "varchar(32)",
        "nullable": false,
        "default": null
      },
      {
        "name": "effective_from",
        "type": "timestamptz",
        "nullable": false,
        "default": null
      },
      {
        "name": "effective_to",
        "type": "timestamptz",
        "nullable": true,
        "default": null
      },
      {
        "name": "published_at",
        "type": "timestamptz",
        "nullable": true,
        "default": null
      }
    ],
    "checks": [],
    "uniqueConstraints": [
      [
        "tenant_id",
        "control_effectiveness_methodology_id"
      ],
      [
        "methodology_code",
        "version_number"
      ]
    ]
  }
];
export function extendMethodologyInventory(inventory) { return { ...inventory, methodologyAmendment: "PHASE5_METHODOLOGY_BINDING_ARCHITECTURE_DECISION_20261007", tableCount: inventory.tableCount + methodologyTables.length, tables: [...inventory.tables, ...methodologyTables] }; }
