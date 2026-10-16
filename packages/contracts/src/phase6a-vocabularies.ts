// Generated from approved OpenAPI request schemas. Do not edit values manually.
export const FORM_VOCABULARIES = {
  "ApplicabilityCreateRequest.applicability_decision": [
    "applicable",
    "not_applicable"
  ],
  "RequirementAssessmentSubmitRequest.result_status": [
    "valid",
    "no_data",
    "insufficient_data",
    "insufficient_coverage",
    "stale_source",
    "conflicting_sources",
    "dependency_pending",
    "invalid_input",
    "source_error",
    "calculation_error",
    "not_applicable",
    "superseded"
  ],
  "RequirementAssessmentSubmitRequest.domain_conclusion": [
    "not_assessed",
    "compliant",
    "partially_compliant",
    "non_compliant",
    "not_applicable",
    "insufficient_evidence"
  ],
  "SoaItemCreateInput.applicability_decision": [
    "applicable",
    "not_applicable"
  ],
  "SoaItemCreateInput.implementation_state": [
    "not_implemented",
    "partially_implemented",
    "implemented",
    "not_applicable"
  ],
  "ControlInstantiateRequest.control_type": [
    "preventive",
    "detective",
    "corrective",
    "directive"
  ],
  "ControlInstantiateRequest.nature": [
    "manual",
    "automated",
    "hybrid"
  ],
  "ControlInstantiateRequest.frequency_code": [
    "continuous",
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "semiannual",
    "annual",
    "event_driven"
  ],
  "ControlInstantiateRequest.suggested_owner_role_code": [
    "COMPLIANCE_MANAGER",
    "CONTROL_OWNER",
    "PROCESS_OWNER",
    "QUALITY_MANAGER",
    "CISO_SECURITY_MANAGER"
  ],
  "ControlAssessmentSubmitRequest.result_status": [
    "valid",
    "no_data",
    "insufficient_data",
    "insufficient_coverage",
    "stale_source",
    "conflicting_sources",
    "dependency_pending",
    "invalid_input",
    "source_error",
    "calculation_error",
    "not_applicable",
    "superseded"
  ],
  "ControlAssessmentSubmitRequest.domain_conclusion": [
    "effective",
    "partially_effective",
    "ineffective",
    "not_tested",
    "insufficient_evidence"
  ],
  "AssuranceSampleExecuteInput.selection_method": [
    "census",
    "random",
    "stratified_random",
    "systematic",
    "judgmental"
  ],
  "AssuranceSampleExecuteInput.result_status": [
    "valid",
    "no_data",
    "insufficient_data",
    "insufficient_coverage",
    "stale_source",
    "conflicting_sources",
    "dependency_pending",
    "invalid_input",
    "source_error",
    "calculation_error",
    "not_applicable",
    "superseded"
  ],
  "AssuranceTestExecuteRequest.result_status": [
    "valid",
    "no_data",
    "insufficient_data",
    "insufficient_coverage",
    "stale_source",
    "conflicting_sources",
    "dependency_pending",
    "invalid_input",
    "source_error",
    "calculation_error",
    "not_applicable",
    "superseded"
  ],
  "AssuranceTestExecuteRequest.domain_conclusion": [
    "effective",
    "partially_effective",
    "ineffective",
    "not_tested",
    "insufficient_evidence"
  ],
  "UploadIntentCreateRequest.classification": [
    "public",
    "internal",
    "confidential",
    "restricted"
  ],
  "EvidenceCreateRequest.evidence_type": [
    "document",
    "record",
    "image",
    "report"
  ],
  "EvidenceCreateRequest.source_kind": [
    "uploaded",
    "system_record",
    "human_observation",
    "external_record"
  ],
  "EvidenceApproveRequest.sufficiency": [
    "sufficient",
    "partially_sufficient",
    "insufficient"
  ],
  "EvidenceApproveRequest.relevance": [
    "relevant",
    "partially_relevant",
    "not_relevant"
  ],
  "EvidenceRejectRequest.sufficiency": [
    "sufficient",
    "partially_sufficient",
    "insufficient"
  ],
  "EvidenceRejectRequest.relevance": [
    "relevant",
    "partially_relevant",
    "not_relevant"
  ],
  "IssueCreateRequest.issue_kind": [
    "finding",
    "non_conformity",
    "gap",
    "exception",
    "audit_observation"
  ],
  "IssueCreateRequest.severity": [
    "critical",
    "major",
    "moderate",
    "minor"
  ],
  "IssueCreateRequest.priority": [
    "urgent",
    "high",
    "normal",
    "low"
  ],
  "IssueCreateRequest.origin_role": [
    "trigger"
  ],
  "IssueTriageRequest.severity": [
    "critical",
    "major",
    "moderate",
    "minor"
  ],
  "IssueTriageRequest.priority": [
    "urgent",
    "high",
    "normal",
    "low"
  ],
  "IssueVerifyCloseRequest.verification_decision": [
    "accepted"
  ],
  "ActionCreateRequest.priority": [
    "urgent",
    "high",
    "normal",
    "low"
  ],
  "ActionCompleteRequest.link_role": [
    "closure"
  ],
  "ActionVerifyRequest.verification_decision": [
    "accepted"
  ],
  "RetentionPolicyCreateRequest.policy_kind": [
    "legal_hold",
    "mandatory_regulatory_policy",
    "contractual_policy",
    "tenant_policy",
    "product_baseline"
  ],
  "RetentionPolicyCreateRequest.trigger_event_code": [
    "expiry_or_closure"
  ],
  "RetentionPolicyCreateRequest.precedence_rank": [
    500,
    400,
    300,
    200,
    100
  ]
} as const;
export const CANONICAL_OWNERSHIP_CLASSES = ["GLOBAL_REFERENCE","PLATFORM_CONTROL","TENANT_OWNED","TENANT_DERIVED"] as const;
export const PUBLISHED_LIFECYCLE_STATES = {
  "RetentionPolicy": [
    "draft",
    "under_review",
    "approved",
    "published"
  ],
  "EvidenceRequest": [
    "open",
    "fulfilled",
    "cancelled",
    "expired"
  ],
  "RequirementApplicability": [
    "draft",
    "submitted",
    "approved",
    "superseded"
  ],
  "StatementOfApplicability": [
    "draft",
    "published",
    "superseded"
  ],
  "EvidenceVersion": [
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "expired",
    "superseded"
  ],
  "RequirementAssessment": [
    "not_assessed",
    "in_progress",
    "assessed",
    "approved",
    "superseded"
  ],
  "ControlAssessment": [
    "planned",
    "in_progress",
    "completed",
    "reviewed",
    "approved"
  ],
  "AssuranceTest": [
    "planned",
    "in_progress",
    "completed",
    "reviewed",
    "approved"
  ],
  "Issue": [
    "open",
    "triaged",
    "remediation_in_progress",
    "pending_verification",
    "verified_closed",
    "reopened",
    "dismissed"
  ],
  "Action": [
    "pending",
    "in_progress",
    "in_review",
    "completed",
    "verified",
    "reopened",
    "cancelled"
  ]
} as const;
export const PUBLISHED_VOCABULARY_LABELS = {
  "FileClassification": {
    "public": "Pública",
    "internal": "Interna",
    "confidential": "Confidencial",
    "restricted": "Restringida"
  },
  "EvidenceType": {
    "document": "Documento",
    "record": "Registro",
    "image": "Imagen",
    "report": "Informe"
  },
  "ControlFrequency": {
    "continuous": "Continua",
    "daily": "Diaria",
    "weekly": "Semanal",
    "monthly": "Mensual",
    "quarterly": "Trimestral",
    "semiannual": "Semestral",
    "annual": "Anual",
    "event_driven": "Ante un evento"
  },
  "SoAApplicabilityDecision": {
    "applicable": "Aplicable",
    "not_applicable": "No aplicable"
  },
  "SoAImplementationState": {
    "not_implemented": "Sin implementar",
    "partially_implemented": "Implementado parcialmente",
    "implemented": "Implementado",
    "not_applicable": "No corresponde implementar"
  },
  "ActionEvidenceLinkRole": {
    "closure": "Soporte de finalización"
  },
  "IssueOriginRole": {
    "trigger": "Origen desencadenante"
  },
  "IssuePriority": {
    "urgent": "Urgente",
    "high": "Alta",
    "normal": "Normal",
    "low": "Baja"
  },
  "ActionPriority": {
    "urgent": "Urgente",
    "high": "Alta",
    "normal": "Normal",
    "low": "Baja"
  },
  "EvidenceRelevance": {
    "relevant": "Pertinente",
    "partially_relevant": "Pertinente parcialmente",
    "not_relevant": "No pertinente"
  },
  "AssuranceSelectionMethod": {
    "census": "Censo",
    "random": "Aleatoria",
    "stratified_random": "Aleatoria estratificada",
    "systematic": "Sistemática",
    "judgmental": "Por juicio profesional"
  },
  "IssueSeverity": {
    "critical": "Crítica",
    "major": "Mayor",
    "moderate": "Moderada",
    "minor": "Menor"
  },
  "EvidenceSourceKind": {
    "uploaded": "Archivo aportado",
    "system_record": "Registro de sistema",
    "human_observation": "Observación humana",
    "external_record": "Registro externo"
  },
  "EvidenceSufficiency": {
    "sufficient": "Suficiente",
    "partially_sufficient": "Suficiente parcialmente",
    "insufficient": "Insuficiente"
  },
  "SuggestedBusinessOwnerRole": {
    "COMPLIANCE_MANAGER": "Responsable de cumplimiento",
    "CONTROL_OWNER": "Responsable del control",
    "PROCESS_OWNER": "Responsable del proceso",
    "QUALITY_MANAGER": "Responsable de calidad",
    "CISO_SECURITY_MANAGER": "Responsable de seguridad"
  }
} as const;
export const REQUEST_VOCABULARIES = {
  "controlInstantiate": {
    "frequency_code": [
      "continuous",
      "daily",
      "weekly",
      "monthly",
      "quarterly",
      "semiannual",
      "annual",
      "event_driven"
    ],
    "suggested_owner_role_code": [
      "COMPLIANCE_MANAGER",
      "CONTROL_OWNER",
      "PROCESS_OWNER",
      "QUALITY_MANAGER",
      "CISO_SECURITY_MANAGER"
    ]
  },
  "assuranceTestExecute": {
    "samples[].selection_method": [
      "census",
      "random",
      "stratified_random",
      "systematic",
      "judgmental"
    ]
  },
  "uploadIntentCreate": {
    "classification": [
      "public",
      "internal",
      "confidential",
      "restricted"
    ]
  },
  "evidenceApprove": {
    "sufficiency": [
      "sufficient",
      "partially_sufficient",
      "insufficient"
    ],
    "relevance": [
      "relevant",
      "partially_relevant",
      "not_relevant"
    ]
  },
  "evidenceReject": {
    "sufficiency": [
      "sufficient",
      "partially_sufficient",
      "insufficient"
    ],
    "relevance": [
      "relevant",
      "partially_relevant",
      "not_relevant"
    ]
  },
  "issueCreate": {
    "severity": [
      "critical",
      "major",
      "moderate",
      "minor"
    ],
    "priority": [
      "urgent",
      "high",
      "normal",
      "low"
    ],
    "origin_role": [
      "trigger"
    ]
  },
  "issueTriage": {
    "severity": [
      "critical",
      "major",
      "moderate",
      "minor"
    ],
    "priority": [
      "urgent",
      "high",
      "normal",
      "low"
    ]
  },
  "actionCreate": {
    "priority": [
      "urgent",
      "high",
      "normal",
      "low"
    ]
  },
  "actionComplete": {
    "link_role": [
      "closure"
    ]
  },
  "soaCreate": {
    "items[].applicability_decision": [
      "applicable",
      "not_applicable"
    ],
    "items[].implementation_state": [
      "not_implemented",
      "partially_implemented",
      "implemented",
      "not_applicable"
    ]
  },
  "evidenceCreate": {
    "evidence_type": [
      "document",
      "record",
      "image",
      "report"
    ],
    "source_kind": [
      "uploaded",
      "system_record",
      "human_observation",
      "external_record"
    ]
  }
} as const;
export const VOCABULARY_FIELD_SCHEMAS = {
  "SoaItemCreateInput.applicability_decision": "SoAApplicabilityDecision",
  "SoaItemCreateInput.implementation_state": "SoAImplementationState",
  "ControlInstantiateRequest.frequency_code": "ControlFrequency",
  "ControlInstantiateRequest.suggested_owner_role_code": "SuggestedBusinessOwnerRole",
  "AssuranceSampleExecuteInput.selection_method": "AssuranceSelectionMethod",
  "UploadIntentCreateRequest.classification": "FileClassification",
  "EvidenceCreateRequest.evidence_type": "EvidenceType",
  "EvidenceCreateRequest.source_kind": "EvidenceSourceKind",
  "EvidenceApproveRequest.sufficiency": "EvidenceSufficiency",
  "EvidenceApproveRequest.relevance": "EvidenceRelevance",
  "EvidenceRejectRequest.sufficiency": "EvidenceSufficiency",
  "EvidenceRejectRequest.relevance": "EvidenceRelevance",
  "IssueCreateRequest.severity": "IssueSeverity",
  "IssueCreateRequest.priority": "IssuePriority",
  "IssueCreateRequest.origin_role": "IssueOriginRole",
  "IssueTriageRequest.severity": "IssueSeverity",
  "IssueTriageRequest.priority": "IssuePriority",
  "ActionCreateRequest.priority": "ActionPriority",
  "ActionCompleteRequest.link_role": "ActionEvidenceLinkRole"
} as const;
export const PUBLISHED_VOCABULARY_VERSION = "STEP6A3_VOCABULARIES_v1" as const;
export const VOCABULARY_MANIFEST_SHA256 = "81e559c96f687c319d415bb57b97187f17f91d884b35594b4ce0db7b68862b83" as const;
export const VOCABULARY_PROVENANCE_BINDINGS = {
  "controlInstantiate": {
    "frequency_code": {
      "family": "CV-03",
      "table": "controls.control_versions",
      "column": "frequency_code",
      "entity": "ControlVersion",
      "id": "control_version_id",
      "version": "version_number",
      "parentLinks": []
    },
    "suggested_owner_role_code": {
      "family": "CV-14",
      "table": "controls.control_versions",
      "column": "suggested_owner_role_code",
      "entity": "ControlVersion",
      "id": "control_version_id",
      "version": "version_number",
      "parentLinks": []
    }
  },
  "evidenceCreate": {
    "evidence_type": {
      "family": "CV-02",
      "table": "evidence.evidences",
      "column": "evidence_type",
      "entity": "Evidence",
      "id": "evidence_id",
      "version": "row_version",
      "parentLinks": []
    },
    "source_kind": {
      "family": "CV-12",
      "table": "evidence.evidences",
      "column": "source_kind",
      "entity": "Evidence",
      "id": "evidence_id",
      "version": "row_version",
      "parentLinks": []
    }
  },
  "uploadIntentCreate": {
    "classification": {
      "family": "CV-01",
      "table": "evidence.file_upload_intents",
      "column": "classification",
      "entity": "FileUploadIntent",
      "id": "file_upload_intent_id",
      "version": "row_version",
      "parentLinks": []
    }
  },
  "evidenceApprove": {
    "sufficiency": {
      "family": "CV-13",
      "table": "evidence.evidence_reviews",
      "column": "sufficiency",
      "entity": "EvidenceReview",
      "id": "evidence_review_id",
      "version": null,
      "parentLinks": [
        {
          "column": "evidence_id",
          "parent": "evidence.evidences",
          "parentId": "evidence_id"
        },
        {
          "column": "evidence_version_id",
          "parent": "evidence.evidence_versions",
          "parentId": "evidence_version_id"
        }
      ]
    },
    "relevance": {
      "family": "CV-09",
      "table": "evidence.evidence_reviews",
      "column": "relevance",
      "entity": "EvidenceReview",
      "id": "evidence_review_id",
      "version": null,
      "parentLinks": [
        {
          "column": "evidence_id",
          "parent": "evidence.evidences",
          "parentId": "evidence_id"
        },
        {
          "column": "evidence_version_id",
          "parent": "evidence.evidence_versions",
          "parentId": "evidence_version_id"
        }
      ]
    }
  },
  "evidenceReject": {
    "sufficiency": {
      "family": "CV-13",
      "table": "evidence.evidence_reviews",
      "column": "sufficiency",
      "entity": "EvidenceReview",
      "id": "evidence_review_id",
      "version": null,
      "parentLinks": [
        {
          "column": "evidence_id",
          "parent": "evidence.evidences",
          "parentId": "evidence_id"
        },
        {
          "column": "evidence_version_id",
          "parent": "evidence.evidence_versions",
          "parentId": "evidence_version_id"
        }
      ]
    },
    "relevance": {
      "family": "CV-09",
      "table": "evidence.evidence_reviews",
      "column": "relevance",
      "entity": "EvidenceReview",
      "id": "evidence_review_id",
      "version": null,
      "parentLinks": [
        {
          "column": "evidence_id",
          "parent": "evidence.evidences",
          "parentId": "evidence_id"
        },
        {
          "column": "evidence_version_id",
          "parent": "evidence.evidence_versions",
          "parentId": "evidence_version_id"
        }
      ]
    }
  },
  "issueCreate": {
    "severity": {
      "family": "CV-11",
      "table": "remediation.issues",
      "column": "severity",
      "entity": "Issue",
      "id": "issue_id",
      "version": "row_version",
      "parentLinks": []
    },
    "priority": {
      "family": "CV-08",
      "table": "remediation.issues",
      "column": "priority",
      "entity": "Issue",
      "id": "issue_id",
      "version": "row_version",
      "parentLinks": []
    },
    "origin_role": {
      "family": "CV-07",
      "table": "remediation.issue_origins",
      "column": "origin_role",
      "entity": "IssueOrigin",
      "id": "issue_origin_id",
      "version": null,
      "parentLinks": [
        {
          "column": "issue_id",
          "parent": "remediation.issues",
          "parentId": "issue_id"
        },
        {
          "column": "requirement_assessment_id",
          "parent": "regulatory.requirement_assessments",
          "parentId": "requirement_assessment_id"
        },
        {
          "column": "control_assessment_id",
          "parent": "controls.control_assessments",
          "parentId": "control_assessment_id"
        },
        {
          "column": "assurance_test_id",
          "parent": "controls.assurance_tests",
          "parentId": "assurance_test_id"
        },
        {
          "column": "audit_test_id",
          "parent": "audit.audit_tests",
          "parentId": "audit_test_id"
        },
        {
          "column": "risk_id",
          "parent": "risk.risks",
          "parentId": "risk_id"
        },
        {
          "column": "incident_id",
          "parent": "operations.incidents",
          "parentId": "incident_id"
        },
        {
          "column": "supplier_assessment_id",
          "parent": "third_party.supplier_assessments",
          "parentId": "supplier_assessment_id"
        }
      ]
    }
  },
  "issueTriage": {
    "severity": {
      "family": "CV-11",
      "table": "remediation.issues",
      "column": "severity",
      "entity": "Issue",
      "id": "issue_id",
      "version": "row_version",
      "parentLinks": []
    },
    "priority": {
      "family": "CV-08",
      "table": "remediation.issues",
      "column": "priority",
      "entity": "Issue",
      "id": "issue_id",
      "version": "row_version",
      "parentLinks": []
    }
  },
  "actionCreate": {
    "priority": {
      "family": "CV-08",
      "table": "remediation.actions",
      "column": "priority",
      "entity": "Action",
      "id": "action_id",
      "version": "row_version",
      "parentLinks": []
    }
  },
  "actionComplete": {
    "link_role": {
      "family": "CV-06",
      "table": "remediation.action_evidence_links",
      "column": "link_role",
      "entity": "ActionEvidenceLink",
      "id": "action_evidence_link_id",
      "version": null,
      "parentLinks": [
        {
          "column": "action_id",
          "parent": "remediation.actions",
          "parentId": "action_id"
        },
        {
          "column": "evidence_version_id",
          "parent": "evidence.evidence_versions",
          "parentId": "evidence_version_id"
        }
      ]
    }
  },
  "soaCreate": {
    "items[].applicability_decision": {
      "family": "CV-04",
      "table": "regulatory.statement_of_applicability_items",
      "column": "applicability_decision",
      "entity": "StatementOfApplicabilityItem",
      "id": "statement_of_applicability_item_id",
      "version": null,
      "parentLinks": [
        {
          "column": "statement_of_applicability_id",
          "parent": "regulatory.statements_of_applicability",
          "parentId": "statement_of_applicability_id"
        }
      ]
    },
    "items[].implementation_state": {
      "family": "CV-05",
      "table": "regulatory.statement_of_applicability_items",
      "column": "implementation_state",
      "entity": "StatementOfApplicabilityItem",
      "id": "statement_of_applicability_item_id",
      "version": null,
      "parentLinks": [
        {
          "column": "statement_of_applicability_id",
          "parent": "regulatory.statements_of_applicability",
          "parentId": "statement_of_applicability_id"
        }
      ]
    }
  },
  "assuranceTestExecute": {
    "samples[].selection_method": {
      "family": "CV-10",
      "table": "controls.assurance_samples",
      "column": "selection_method",
      "entity": "AssuranceSample",
      "id": "assurance_sample_id",
      "version": null,
      "parentLinks": [
        {
          "column": "assurance_test_id",
          "parent": "controls.assurance_tests",
          "parentId": "assurance_test_id"
        }
      ]
    }
  },
  "uploadFinalize": {
    "classification": {
      "family": "CV-01",
      "table": "evidence.file_objects",
      "column": "classification",
      "entity": "FileObject",
      "id": "file_object_id",
      "version": "row_version",
      "parentLinks": []
    }
  }
} as const;
export const ROLE_PERMISSION_PUBLICATION = {
  "event_code": "audit.iam.role_permission.publish.v1",
  "command_code": "phase6a3RolePermissionPublication",
  "manifest_sha256": "7462a780d4e0afe23c812983b762685e6f1aa8944ddef85afc50ca2c6d01cd72",
  "receipt_sha256": "eed714be808cf63ea5b32c750fa003336851bb6545044a9fe051ed1c053334b1",
  "migration_id": "20261009000300",
  "source_migration_id": "20261009000200",
  "source_migration_sha256": "920ececb9d28e3821a9faf9d2c754db481a26c0e33c53ae0f94b3a0535885ed8",
  "permission_codes": [
    "compliance.framework.read",
    "platform.membership_reference.read",
    "privacy.retention_policy_reference.read"
  ],
  "pairs": [
    {
      "role_code": "EXECUTIVE_BOARD_VIEWER",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F read; M/R sólo history parent autorizado",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:104",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:69",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:59",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "EXECUTIVE_BOARD_VIEWER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F read; M/R sólo history parent autorizado",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:104",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:69",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "EXECUTIVE_BOARD_VIEWER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F read; M/R sólo history parent autorizado",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:104",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:69",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "GRC_MANAGER",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F; M request/action; R sólo history salvo command grant independiente",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:105",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:70",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:59",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "GRC_MANAGER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F; M request/action; R sólo history salvo command grant independiente",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:105",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:70",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "GRC_MANAGER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F; M request/action; R sólo history salvo command grant independiente",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:105",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:70",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "QUALITY_MANAGER",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F; M action; R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:106",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:71",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:59",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "QUALITY_MANAGER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F; M action; R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:106",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:71",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "QUALITY_MANAGER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F; M action; R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:106",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:71",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "COMPLIANCE_MANAGER",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F; M request/action; R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:107",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:72",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:59",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "COMPLIANCE_MANAGER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F; M request/action; R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:107",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:72",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "COMPLIANCE_MANAGER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F; M request/action; R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:107",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:72",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "RISK_MANAGER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "M action/history Action; no Risk runtime nuevo",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:108",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:73",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "CISO_SECURITY_MANAGER",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:109",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:74",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:59",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "CISO_SECURITY_MANAGER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:109",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:74",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "CISO_SECURITY_MANAGER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:109",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:74",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "AI_GOVERNANCE_MANAGER",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:110",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:75",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:59",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "AI_GOVERNANCE_MANAGER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:110",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:75",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "AI_GOVERNANCE_MANAGER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:110",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:75",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "PRIVACY_MANAGER",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F; M/R history; retención admin conserva PRIVACY",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:111",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:76",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:59",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "PRIVACY_MANAGER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F; M/R history; retención admin conserva PRIVACY",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:111",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:76",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "PRIVACY_MANAGER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F; M/R history; retención admin conserva PRIVACY",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:111",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:76",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "LEGAL_REVIEWER",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F; M/R history; ninguna aprobación automática",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:112",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:77",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:59",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "LEGAL_REVIEWER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F; M/R history; ninguna aprobación automática",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:112",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:77",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "LEGAL_REVIEWER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F; M/R history; ninguna aprobación automática",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:112",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:77",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "AUDITOR_LEAD",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F; M request/action; R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:113",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:78",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "AUDITOR_LEAD",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F; M request/action; R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:113",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:78",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "AUDITOR_LEAD",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F; M request/action; R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:113",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:78",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "AUDITOR",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F; M request; R upload por document.create; M action DENY por RBAC-D01",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:114",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:79",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "AUDITOR",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F; M request; R upload por document.create; M action DENY por RBAC-D01",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:114",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:79",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "AUDITOR",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F; M request; R upload por document.create; M action DENY por RBAC-D01",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:114",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:79",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:76"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "PROCESS_OWNER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "M sólo history de Action/Assurance autorizado",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:115",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:80",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "CONTROL_OWNER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "M request; R upload; history sólo parent permitido",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:116",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:81",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "CONTROL_OWNER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "M request; R upload; history sólo parent permitido",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:116",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:81",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:76"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "EVIDENCE_OWNER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "M history; R upload/evidence; sin autoaprobar",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:117",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:82",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "EVIDENCE_OWNER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "M history; R upload/evidence; sin autoaprobar",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:117",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:82",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:76",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:141"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "ACTION_OWNER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "M history Action; sin create/verificación implícita",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:118",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:83",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "REGULATORY_CONTENT_STEWARD",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F read, sin publicación editorial",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:121",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:86",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:59"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "REPORT_VIEWER",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F read; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:123",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:88",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:59",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "REPORT_VIEWER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F read; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:123",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:88",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "REPORT_VIEWER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F read; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:123",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:88",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "VIEWER",
      "permission": "compliance.framework.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant",
      "capability": "ISO_COMPLIANCE",
      "purpose_and_justification": "F read; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:124",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:89",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:59",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:126"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "VIEWER",
      "permission": "platform.membership_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object,audit_engagement; exact parent only",
      "capability": "CORE_PLATFORM + purpose capability",
      "purpose_and_justification": "F read; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:124",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:89",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:130",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:133",
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:129"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    },
    {
      "role_code": "VIEWER",
      "permission": "privacy.retention_policy_reference.read",
      "before": 0,
      "authority": "TENANT via active MembershipRole; template ownership is not actor authority",
      "template_ownership": "PLATFORM_CONTROL",
      "scopes": "tenant,assigned_object,owned_object; exact parent/command only",
      "capability": "EVIDENCE_DOCUMENTS",
      "purpose_and_justification": "F read; M/R history",
      "source": "docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:124",
      "role_source": "database/migrations/20260916000900_canonical_seeds.sql:89",
      "sod": "No approval/assignment/admin grant; parent SoD and command grant remain independent",
      "risk": "History must not permit enumeration or selection; no structural scope inferred",
      "published_purpose_sources": [
        "docs/executable-contracts/05_PERMISSION_CATALOG.md:131"
      ],
      "broader_than_purpose_union": false,
      "after": 1,
      "contract_state": "PUBLISHED_LOCAL_V1",
      "database_execution": "SEPARATE_AUTHORIZATION_REQUIRED"
    }
  ]
} as const;
export const RBAC_RESOLUTION_R3 = {
  "version": "R3",
  "status": "PUBLISHED_LOCAL_V1",
  "published_at": "2026-10-09T21:25:26.905290+00:00",
  "event_code": "audit.iam.role_permission.publish.v1",
  "command_code": "phase6a3RbacResolutionR3",
  "manifest_sha256": "17eeb65269bc2dc9727c605999f1fd0c5c343cab3b6653a372c3d879618daed9",
  "receipt_sha256": "3d69c54a089e0996096b6b37eab1ec45c320f96771c97030c2741fd2afff816d",
  "migration_id": "20261009000400",
  "source_migration_id": "20260916000900",
  "source_migration_sha256": "94547ff1fa6a9accf56ff6f28be93afeb91b8c290ca9bb224667862c64c8c2e7",
  "permission_code": "compliance.requirement.read",
  "reader_roles": [
    "VIEWER",
    "REPORT_VIEWER",
    "EXECUTIVE_BOARD_VIEWER",
    "GRC_MANAGER",
    "QUALITY_MANAGER",
    "COMPLIANCE_MANAGER",
    "CISO_SECURITY_MANAGER",
    "AI_GOVERNANCE_MANAGER",
    "PRIVACY_MANAGER",
    "LEGAL_REVIEWER",
    "REGULATORY_CONTENT_STEWARD"
  ],
  "revoked_role": "AUDITOR",
  "revoked_permission": "remediation.action.create"
} as const;
export const VOCABULARY_FAMILY_CODES = {
  "CV-01": [
    "public",
    "internal",
    "confidential",
    "restricted"
  ],
  "CV-02": [
    "document",
    "record",
    "image",
    "report"
  ],
  "CV-03": [
    "continuous",
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "semiannual",
    "annual",
    "event_driven"
  ],
  "CV-04": [
    "applicable",
    "not_applicable"
  ],
  "CV-05": [
    "not_implemented",
    "partially_implemented",
    "implemented",
    "not_applicable"
  ],
  "CV-06": [
    "closure"
  ],
  "CV-07": [
    "trigger"
  ],
  "CV-08": [
    "urgent",
    "high",
    "normal",
    "low"
  ],
  "CV-09": [
    "relevant",
    "partially_relevant",
    "not_relevant"
  ],
  "CV-10": [
    "census",
    "random",
    "stratified_random",
    "systematic",
    "judgmental"
  ],
  "CV-11": [
    "critical",
    "major",
    "moderate",
    "minor"
  ],
  "CV-12": [
    "uploaded",
    "system_record",
    "human_observation",
    "external_record"
  ],
  "CV-13": [
    "sufficient",
    "partially_sufficient",
    "insufficient"
  ],
  "CV-14": [
    "COMPLIANCE_MANAGER",
    "CONTROL_OWNER",
    "PROCESS_OWNER",
    "QUALITY_MANAGER",
    "CISO_SECURITY_MANAGER"
  ]
} as const;
export type FormVocabularyKey = keyof typeof FORM_VOCABULARIES;
