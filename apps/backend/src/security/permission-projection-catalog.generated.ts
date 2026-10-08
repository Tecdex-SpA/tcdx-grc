// Generated from executable Permission catalog 05 and approved MI6A/P2A/D1-R publication contracts. Do not edit.
export const permissionProjectionCatalog: Readonly<Record<string, { capabilities: readonly string[]; scopes: readonly string[] }>> = {
  "ai.ai_recommendation.create": {
    "capabilities": [
      "AI_ASSISTANCE"
    ],
    "scopes": [
      "tenant",
      "assigned_object",
      "owned_object"
    ]
  },
  "ai.ai_recommendation.review": {
    "capabilities": [
      "AI_ASSISTANCE"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "audit.audit_test.execute": {
    "capabilities": [
      "AUDIT"
    ],
    "scopes": [
      "audit_engagement"
    ]
  },
  "audit.audit.approve": {
    "capabilities": [
      "AUDIT"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "audit.audit.create": {
    "capabilities": [
      "AUDIT"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "audit.audit.transition": {
    "capabilities": [
      "AUDIT"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "audit.audit.update": {
    "capabilities": [
      "AUDIT"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "compliance.applicability.approve": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "compliance.applicability.create": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service"
    ]
  },
  "compliance.applicability.read": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service",
      "assigned_object",
      "owned_object"
    ]
  },
  "compliance.applicability.submit": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant",
      "assigned_object",
      "owned_object"
    ]
  },
  "compliance.methodology.read": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "compliance.normative_unit.read": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "compliance.requirement_assessment.approve": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "compliance.requirement_assessment.archive": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "compliance.requirement_assessment.create": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service"
    ]
  },
  "compliance.requirement_assessment.read": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service",
      "assigned_object",
      "owned_object"
    ]
  },
  "compliance.requirement_assessment.submit": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant",
      "assigned_object",
      "owned_object"
    ]
  },
  "compliance.requirement_assessment.update": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant",
      "assigned_object",
      "owned_object"
    ]
  },
  "compliance.requirement.read": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "compliance.soa.create": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "compliance.soa.publish": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "compliance.soa.read": {
    "capabilities": [
      "ISO_COMPLIANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "configuration.configuration_definition.approve": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "configuration.configuration_definition.archive": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "configuration.configuration_definition.create": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "configuration.configuration_definition.publish": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "configuration.configuration_definition.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "configuration.configuration_definition.review": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "configuration.configuration_definition.update": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "configuration.configuration_override.approve": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "configuration.configuration_override.archive": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "configuration.configuration_override.create": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service",
      "assigned_object",
      "owned_object"
    ]
  },
  "configuration.configuration_override.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service",
      "assigned_object",
      "owned_object"
    ]
  },
  "configuration.configuration_override.review": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service"
    ]
  },
  "configuration.configuration_override.update": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service",
      "assigned_object",
      "owned_object"
    ]
  },
  "configuration.effective_configuration.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service",
      "assigned_object",
      "owned_object"
    ]
  },
  "controls.assurance_test.approve": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "controls.assurance_test.create": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant",
      "audit_engagement"
    ]
  },
  "controls.assurance_test.execute": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "audit_engagement",
      "assigned_object"
    ]
  },
  "controls.assurance_test.read": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant",
      "audit_engagement",
      "assigned_object",
      "owned_object"
    ]
  },
  "controls.assurance_test.review": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant",
      "audit_engagement"
    ]
  },
  "controls.control_assessment.approve": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "controls.control_assessment.create": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant",
      "assigned_object",
      "owned_object"
    ]
  },
  "controls.control_assessment.read": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service",
      "audit_engagement",
      "assigned_object",
      "owned_object"
    ]
  },
  "controls.control_assessment.review": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "controls.control_assessment.submit": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant",
      "owned_object"
    ]
  },
  "controls.control_assessment.update": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "controls.control.create": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service"
    ]
  },
  "controls.control.read": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service",
      "audit_engagement",
      "assigned_object",
      "owned_object"
    ]
  },
  "controls.methodology.read": {
    "capabilities": [
      "CONTROLS_ASSURANCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "data.lineage.review": {
    "capabilities": [
      "DATA_TRUST"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "data.measurement.execute": {
    "capabilities": [
      "DATA_TRUST"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "data.rule.execute": {
    "capabilities": [
      "RULES_IMPACT"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "data.snapshot.read": {
    "capabilities": [
      "DATA_TRUST"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service"
    ]
  },
  "evidence.document.create": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant",
      "assigned_object",
      "owned_object"
    ]
  },
  "evidence.document.update": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "assigned_object",
      "owned_object"
    ]
  },
  "evidence.evidence_request.archive": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "evidence.evidence_request.create": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "evidence.evidence_request.read": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant",
      "audit_engagement",
      "assigned_object",
      "owned_object"
    ]
  },
  "evidence.evidence_request.submit": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "evidence.evidence_request.update": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "evidence.evidence.approve": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "evidence.evidence.archive": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "evidence.evidence.create": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant",
      "assigned_object",
      "owned_object"
    ]
  },
  "evidence.evidence.read": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant",
      "audit_engagement",
      "assigned_object",
      "owned_object"
    ]
  },
  "evidence.evidence.reject": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "evidence.evidence.review": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "evidence.evidence.submit": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "assigned_object",
      "owned_object"
    ]
  },
  "evidence.evidence.update": {
    "capabilities": [
      "EVIDENCE_DOCUMENTS"
    ],
    "scopes": [
      "assigned_object",
      "owned_object"
    ]
  },
  "integration.integration.archive": {
    "capabilities": [
      "INTEGRATION_HUB"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "integration.integration.configure": {
    "capabilities": [
      "INTEGRATION_HUB"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "integration.integration.update": {
    "capabilities": [
      "INTEGRATION_HUB"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "integration.sync_run.execute": {
    "capabilities": [
      "INTEGRATION_HUB"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "knowledge.regulatory_pack.publish": {
    "capabilities": [
      "REGULATORY_INTELLIGENCE"
    ],
    "scopes": [
      "platform"
    ]
  },
  "operations.bia.approve": {
    "capabilities": [
      "RESILIENCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "operations.bia.archive": {
    "capabilities": [
      "RESILIENCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "operations.bia.review": {
    "capabilities": [
      "RESILIENCE"
    ],
    "scopes": [
      "tenant",
      "process",
      "service"
    ]
  },
  "operations.bia.transition": {
    "capabilities": [
      "RESILIENCE"
    ],
    "scopes": [
      "tenant",
      "process",
      "service"
    ]
  },
  "operations.bia.verify": {
    "capabilities": [
      "RESILIENCE"
    ],
    "scopes": [
      "tenant",
      "process",
      "service"
    ]
  },
  "operations.continuity_plan.approve": {
    "capabilities": [
      "RESILIENCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "operations.continuity_plan.archive": {
    "capabilities": [
      "RESILIENCE"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "operations.continuity_plan.create": {
    "capabilities": [
      "RESILIENCE"
    ],
    "scopes": [
      "tenant",
      "process",
      "service"
    ]
  },
  "operations.continuity_plan.review": {
    "capabilities": [
      "RESILIENCE"
    ],
    "scopes": [
      "tenant",
      "process",
      "service"
    ]
  },
  "operations.continuity_plan.transition": {
    "capabilities": [
      "RESILIENCE"
    ],
    "scopes": [
      "tenant",
      "process",
      "service"
    ]
  },
  "operations.continuity_plan.verify": {
    "capabilities": [
      "RESILIENCE"
    ],
    "scopes": [
      "tenant",
      "process",
      "service"
    ]
  },
  "operations.incident.create": {
    "capabilities": [
      "INCIDENTS_LOSS"
    ],
    "scopes": [
      "tenant",
      "process",
      "service",
      "assigned_object"
    ]
  },
  "operations.incident.transition": {
    "capabilities": [
      "INCIDENTS_LOSS"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "operations.supplier_assessment.approve": {
    "capabilities": [
      "THIRD_PARTIES"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "operations.supplier_assessment.archive": {
    "capabilities": [
      "THIRD_PARTIES"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "operations.supplier_assessment.create": {
    "capabilities": [
      "THIRD_PARTIES"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "operations.supplier_assessment.review": {
    "capabilities": [
      "THIRD_PARTIES"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "operations.supplier_assessment.submit": {
    "capabilities": [
      "THIRD_PARTIES"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "operations.supplier_assessment.transition": {
    "capabilities": [
      "THIRD_PARTIES"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "operations.survey.approve": {
    "capabilities": [
      "SURVEYS"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "operations.survey.archive": {
    "capabilities": [
      "SURVEYS"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "operations.survey.create": {
    "capabilities": [
      "SURVEYS"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "operations.survey.reject": {
    "capabilities": [
      "SURVEYS"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "operations.survey.review": {
    "capabilities": [
      "SURVEYS"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "operations.survey.submit": {
    "capabilities": [
      "SURVEYS"
    ],
    "scopes": [
      "assigned_object"
    ]
  },
  "operations.survey.transition": {
    "capabilities": [
      "SURVEYS"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "operations.survey.update": {
    "capabilities": [
      "SURVEYS"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "organization.subject.create": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "organization.subject.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "platform.impersonation_session.impersonate": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.lifecycle_transition.administer": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.lifecycle_transition.publish": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.lifecycle_transition.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.managed_identity.administer": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.managed_identity.create": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.managed_identity.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.managed_identity.update": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.membership_invitation.create": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.membership_invitation.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.membership_invitation.update": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.membership.create": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "platform.membership.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform",
      "tenant"
    ]
  },
  "platform.regulatory_pack_validation_access.archive": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.regulatory_pack_validation_access.create": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.regulatory_pack_validation_access.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform",
      "tenant"
    ]
  },
  "platform.role.administer": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.role.assign": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform",
      "tenant"
    ]
  },
  "platform.role.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform",
      "tenant"
    ]
  },
  "platform.subscription_regulatory_pack.archive": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.subscription_regulatory_pack.create": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.subscription_regulatory_pack.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform",
      "tenant"
    ]
  },
  "platform.subscription.create": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.tenant_account_classification.update": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.tenant_user.onboard": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.tenant.archive": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.tenant.create": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.tenant.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform"
    ]
  },
  "platform.user_identity.read": {
    "capabilities": [
      "CORE_PLATFORM"
    ],
    "scopes": [
      "platform",
      "tenant"
    ]
  },
  "privacy.data_subject_request.approve": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.data_subject_request.archive": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.data_subject_request.create": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.data_subject_request.read": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.data_subject_request.review": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "privacy.data_subject_request.transition": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "privacy.data_subject_request.update": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "privacy.erasure_execution.execute": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "privacy.erasure_execution.read": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.erasure_execution.review": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.retention_policy.approve": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.retention_policy.archive": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.retention_policy.create": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.retention_policy.publish": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.retention_policy.read": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.retention_policy.review": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "privacy.retention_policy.update": {
    "capabilities": [
      "PRIVACY"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "remediation.action.create": {
    "capabilities": [
      "ISSUES_ACTIONS"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "remediation.action.read": {
    "capabilities": [
      "ISSUES_ACTIONS"
    ],
    "scopes": [
      "tenant",
      "audit_engagement",
      "assigned_object",
      "owned_object"
    ]
  },
  "remediation.action.transition": {
    "capabilities": [
      "ISSUES_ACTIONS"
    ],
    "scopes": [
      "assigned_object",
      "owned_object"
    ]
  },
  "remediation.action.verify": {
    "capabilities": [
      "ISSUES_ACTIONS"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "remediation.issue.create": {
    "capabilities": [
      "ISSUES_ACTIONS"
    ],
    "scopes": [
      "tenant",
      "audit_engagement",
      "assigned_object"
    ]
  },
  "remediation.issue.read": {
    "capabilities": [
      "ISSUES_ACTIONS"
    ],
    "scopes": [
      "tenant",
      "audit_engagement",
      "assigned_object",
      "owned_object"
    ]
  },
  "remediation.issue.transition": {
    "capabilities": [
      "ISSUES_ACTIONS"
    ],
    "scopes": [
      "tenant",
      "assigned_object",
      "owned_object"
    ]
  },
  "reporting.report_run.execute": {
    "capabilities": [
      "ISO_REPORTING",
      "REPORT_STUDIO"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "reporting.report.approve": {
    "capabilities": [
      "ISO_REPORTING",
      "REPORT_STUDIO"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "reporting.report.archive": {
    "capabilities": [
      "ISO_REPORTING",
      "REPORT_STUDIO"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "reporting.report.publish": {
    "capabilities": [
      "ISO_REPORTING",
      "REPORT_STUDIO"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "reporting.report.review": {
    "capabilities": [
      "ISO_REPORTING",
      "REPORT_STUDIO"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "risk.acceptance.approve": {
    "capabilities": [
      "OPERATIONAL_RISK"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "risk.acceptance.create": {
    "capabilities": [
      "OPERATIONAL_RISK"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "risk.risk_assessment.create": {
    "capabilities": [
      "OPERATIONAL_RISK"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "risk.risk_assessment.submit": {
    "capabilities": [
      "OPERATIONAL_RISK"
    ],
    "scopes": [
      "assigned_object",
      "owned_object"
    ]
  },
  "risk.risk.create": {
    "capabilities": [
      "OPERATIONAL_RISK"
    ],
    "scopes": [
      "tenant",
      "organizational_unit",
      "process",
      "service"
    ]
  },
  "risk.risk.transition": {
    "capabilities": [
      "OPERATIONAL_RISK"
    ],
    "scopes": [
      "tenant",
      "assigned_object",
      "owned_object"
    ]
  },
  "risk.treatment.approve": {
    "capabilities": [
      "OPERATIONAL_RISK"
    ],
    "scopes": [
      "tenant"
    ]
  },
  "risk.treatment.create": {
    "capabilities": [
      "OPERATIONAL_RISK"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "risk.treatment.transition": {
    "capabilities": [
      "OPERATIONAL_RISK"
    ],
    "scopes": [
      "tenant",
      "assigned_object"
    ]
  },
  "risk.treatment.verify": {
    "capabilities": [
      "OPERATIONAL_RISK"
    ],
    "scopes": [
      "tenant"
    ]
  }
};
