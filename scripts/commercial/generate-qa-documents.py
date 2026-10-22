#!/usr/bin/env python3
"""Reproducible blank operational PDFs. Requires reportlab and pymupdf.
No actual ticket, commercial approval or customer data is generated.
"""
from pathlib import Path
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
import pymupdf
import re
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/"apps/frontend/public/commercial"
NAVY=HexColor("#00133B"); ORANGE=HexColor("#F0721D"); TEAL=HexColor("#51ABA8")
GRAY=HexColor("#54595F"); LINE=HexColor("#D8D8D8")
W,H=595.276,841.89
source=ET.parse(ROOT/"docs/ui/assets/brand/tecdex-logo-light.svg").getroot()
# MuPDF's SVG renderer needs presentation attributes instead of CSS class rules.
# Resolve the approved asset's own declarations; never change its palette/paths.
styles={name:dict(part.split(":",1) for part in declarations.split(";") if ":" in part)
        for name,declarations in re.findall(r"\.([\w-]+)\{([^}]+)\}","".join(source.itertext()))}
for element in source.iter():
 for name in element.get("class","").split():
  for key,value in styles.get(name,{}).items(): element.set(key,value)
logo=pymupdf.open(stream=ET.tostring(source),filetype="svg")
LOGO=ImageReader(BytesIO(logo[0].get_pixmap(matrix=pymupdf.Matrix(2,2),alpha=True).tobytes("png")))
def base(name,title,subtitle):
 c=canvas.Canvas(str(OUT/name),pagesize=(W,H),invariant=1)
 c.setTitle(title); c.setAuthor("Tecdex SpA")
 c.setFillColor(NAVY); c.rect(0,H-108,W,108,fill=1,stroke=0)
 c.drawImage(LOGO,36,H-47,width=109,height=27,mask="auto",preserveAspectRatio=True)
 c.setFillColor(TEAL);c.setFont("Helvetica-Bold",9);c.drawRightString(W-36,H-32,"GRC / QA SIN COBRO")
 c.setFillColor(white);c.setFont("Helvetica-Bold",19);c.drawString(36,H-76,title)
 c.setFont("Helvetica",9);c.drawString(36,H-94,subtitle)
 c.setFillColor(GRAY);c.setFont("Helvetica",8)
 c.drawString(36,30,"GRC TECDEX  |  Decisión PO 22.10.2026  |  https://grc.tecdex.net/")
 c.drawRightString(W-36,30,"1 / 1")
 return c
def section(c,y,number,title):
 c.setFillColor(ORANGE);c.setFont("Helvetica-Bold",9);c.drawString(36,y,number)
 c.setFillColor(NAVY);c.setFont("Helvetica-Bold",11);c.drawString(59,y,title)
 c.setStrokeColor(LINE);c.line(36,y-9,W-36,y-9)
def field(c,name,label,x,y,width=250,height=22):
 c.setFillColor(GRAY);c.setFont("Helvetica",8);c.drawString(x,y+height+5,label)
 c.acroForm.textfield(name=name,tooltip=label,x=x,y=y,width=width,height=height,
  fontName="Helvetica",fontSize=9,borderWidth=.6,borderColor=LINE,fillColor=white,textColor=NAVY,forceBorder=True)
def lines(c,y,paragraph,width=95):
 from textwrap import wrap
 c.setFillColor(GRAY);c.setFont("Helvetica",10)
 for line in wrap(paragraph,width): c.drawString(36,y,line);y-=15
 return y-10
OUT.mkdir(parents=True,exist_ok=True)
c=base("ticket-creacion-tenant-qa.pdf","Ticket de creación de tenant","Plantilla editable. Completar con hechos reales; no acredita aprobación por sí sola.")
section(c,710,"01","Solicitud e identificación")
field(c,"ticket_id","Identificador del ticket",36,658,245)
field(c,"requested_at","Fecha de solicitud",305,658,254)
field(c,"requester","Solicitante autorizado",36,611,245)
field(c,"requested_tenant","Tenant solicitado / empresa",305,611,254)
section(c,579,"02","Marcos solicitados y versiones exactas")
c.setFillColor(GRAY);c.setFont("Helvetica",8);c.drawString(36,555,"Seleccionar sólo versiones publicadas y elegibles. La selección no activa el acceso.")
frameworks=[("ISO_9001_2015","ISO 9001:2015 + Amd 1:2024"),("ISO_9001_2026","ISO 9001:2026, edición 6"),("ISO_IEC_27001_2022","ISO/IEC 27001:2022"),("ISO_IEC_42001_2023","ISO/IEC 42001:2023"),("CL_LEY_21719","Ley 21.719 / consolidado aplicable"),("CL_LEY_21663","Ley 21.663")]
for index,(code,label) in enumerate(frameworks):
 y=527-index*28
 c.acroForm.checkbox(name="select_"+code,tooltip=label,x=36,y=y,size=12,borderColor=LINE,fillColor=white,buttonStyle="check")
 c.setFillColor(NAVY);c.setFont("Helvetica",9);c.drawString(57,y+3,label)
 field(c,"version_"+code,"Versión / edición" if index==0 else "",330,y-3,229,20)
section(c,344,"03","Aprobación de Gerencia y entrega a Operaciones")
field(c,"management_approver","Persona de Gerencia que aprueba",36,292,245)
field(c,"approval_ref","Referencia / fecha de aprobación real",305,292,254)
field(c,"operations_owner","Responsable de Operaciones",36,245,245)
field(c,"execution_status","Estado de ejecución",305,245,254)
section(c,212,"04","Resultado y trazabilidad de la ejecución")
field(c,"tenant_subscription_ref","Tenant / Subscription resultante o existente",36,159,523)
field(c,"activation_audit_ref","Activaciones, versiones y referencias de auditoría",36,112,523)
field(c,"access_handoff_ref","Referencia de entrega de acceso (sin credenciales)",36,65,523)
c.save()
c=base("terminos-comerciales-grc-v2-qa.pdf","Términos comerciales GRC V2","Alcance operacional aprobado para QA. No establece condiciones financieras.")
y=708
for n,title,paragraph in [
 ("01","Inicio mediante un único ticket","La contratación asistida se inicia con el ticket de creación de tenant. Es el único documento comercial-operacional exigido para iniciar y ejecutar el alta. Este texto no añade otro contrato, formulario o firma obligatoria."),
 ("02","Gerencia y Operaciones","Gerencia recibe la solicitud, autoriza la contratación y entrega el ticket a Operaciones. Operaciones verifica los datos, ejecuta el alta canónica, configura el tenant y los marcos autorizados, registra el resultado y entrega el acceso."),
 ("03","Selección, publicación y activación","El ticket identifica al solicitante autorizado, tenant, identificador, marcos, versiones, fecha, aprobación de Gerencia, estado y responsable de Operaciones. Seleccionar un marco no lo publica ni activa. Sólo se contratan versiones elegibles por los comandos y permisos canónicos."),
 ("04","Validación QA sin cobro","El mismo procedimiento se utiliza en QA sin cobros reales. Los accesos provisionales de validación se conservan separados de las contrataciones oficiales. Esta entrega no establece precios, facturación, pasarela de pago ni condiciones financieras."),
 ("05","Derechos y seguridad","La contratación no concede licencia para reproducir texto ISO protegido. Se conservan los derechos por fuente, edición y operación; RBAC, segregación de funciones, aislamiento por tenant, idempotencia, vigencia y auditoría. No se inventan aprobaciones ni credenciales compartidas."),
 ("06","Relación con los contratos de plataforma","Se preservan los contratos canónicos vigentes de tenant, identidad, Subscription, PlanVersion y marcos. La emisión de esta plantilla no modifica datos, suscripciones ni permisos. No representa una contratación ejecutada ni reemplaza la evidencia de aprobación del ticket.")]:
 section(c,y,n,title);y-=32;y=lines(c,y,paragraph);y-=13
c.save()
print("Created two blank QA operational PDFs")
