import os

# Define the output path
out_path = r'c:\VSCode Projects\Capstone Project\Level_1_DFD_GaneSarson.drawio'

xml_template = """<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="Electron" modified="2023-10-01T00:00:00.000Z" agent="Mozilla/5.0" version="21.7.5" type="device">
  <diagram id="dfd-gane-sarson" name="Level 1 DFD">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" background="#ffffff" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
{cells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
"""

cells_str = ""
cell_counter = 2

def xml_escape(text):
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    text = text.replace('"', "&quot;")
    return text

def add_node(node_id, label, x, y, width, height, style):
    global cells_str, cell_counter
    safe_label = xml_escape(label)
    cells_str += f'''        <mxCell id="{node_id}" value="{safe_label}" style="{style}" vertex="1" parent="1">\n          <mxGeometry x="{x}" y="{y}" width="{width}" height="{height}" as="geometry" />\n        </mxCell>\n'''

def add_edge(source, target, label, bidirectional=False):
    global cells_str, cell_counter
    edge_id = f"edge_{cell_counter}"
    cell_counter += 1
    label_id = f"label_{cell_counter}"
    cell_counter += 1
    
    start_arrow = "block" if bidirectional else "none"
    style = f"edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;startArrow={start_arrow};endArrow=block;strokeWidth=2;strokeColor=#333333;"
    
    safe_label = xml_escape(label)
    cells_str += f'''        <mxCell id="{edge_id}" style="{style}" edge="1" parent="1" source="{source}" target="{target}">\n          <mxGeometry relative="1" as="geometry" />\n        </mxCell>\n        <mxCell id="{label_id}" value="{safe_label}" style="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;points=[];backgroundColor=#ffffff;fontColor=#333333;" vertex="1" connectable="0" parent="{edge_id}">\n          <mxGeometry x="0" relative="1" as="geometry">\n            <mxPoint as="offset" />\n          </mxGeometry>\n        </mxCell>\n'''

# STYLES
style_entity = "shape=rectangle;whiteSpace=wrap;html=1;shadow=1;strokeWidth=2;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;"
style_process = "shape=rectangle;rounded=1;whiteSpace=wrap;html=1;strokeWidth=2;fillColor=#d5e8d4;strokeColor=#82b366;verticalAlign=top;spacingTop=5;fontStyle=1;"
style_datastore = "shape=partialRectangle;right=0;whiteSpace=wrap;html=1;strokeWidth=2;fillColor=#fff2cc;strokeColor=#d6b656;align=center;fontStyle=1;"

# COLUMNS & ROWS
col1, col2, col3 = 50, 450, 850
w_ent, h_ent = 150, 60
w_proc, h_proc = 180, 80
w_ds, h_ds = 200, 60

# --- MODULE 1: AUTH & ADMIN ---
add_node("E1", "ADMIN", col1, 50, w_ent, h_ent, style_entity)
add_node("P8", "8.0<br><hr>Admin Hub", col2, 40, w_proc, h_proc, style_process)
add_node("D7", "D7 - Audit Logs", col3, 10, w_ds, h_ds, style_datastore)
add_node("D1", "D1 - User Accounts", col3, 110, w_ds, h_ds, style_datastore)

add_edge("E1", "P8", "Manage Roles / Logs")
add_edge("P8", "D7", "Read Logs")
add_edge("P8", "D1", "Update Roles")

add_node("E2", "STAFF / CAPTAIN", col1, 150, w_ent, h_ent, style_entity)
add_node("P1", "1.0<br><hr>User Auth", col2, 140, w_proc, h_proc, style_process)
add_edge("E2", "P1", "Login Credentials")
add_edge("P1", "D1", "Verify Credentials", bidirectional=True)

# --- MODULE 2: DEMOGRAPHICS ---
add_node("E3", "STAFF / CAPTAIN", col1, 350, w_ent, h_ent, style_entity)
add_node("P5", "5.0<br><hr>Resident Directory", col2, 280, w_proc, h_proc, style_process)
add_node("P6", "6.0<br><hr>Geo-Mapping", col2, 400, w_proc, h_proc, style_process)
add_node("P4", "4.0<br><hr>Reports", col2, 520, w_proc, h_proc, style_process)

add_node("D5", "D5 - Resident Registry", col3, 300, w_ds, h_ds, style_datastore)
add_node("D4", "D4 - Households", col3, 450, w_ds, h_ds, style_datastore)

add_edge("E3", "P5", "Data Entry / View")
add_edge("E3", "P6", "Map Edits / View")
add_edge("E3", "P4", "Generate / Export")

add_edge("P5", "D5", "Store/Retrieve", bidirectional=True)
add_edge("P5", "D4", "Store/Retrieve", bidirectional=True)
add_edge("P6", "D5", "Map Points", bidirectional=True)
add_edge("P6", "D4", "Coordinates", bidirectional=True)

add_edge("D5", "P4", "Aggregated Data")
add_edge("D4", "P4", "Distribution Data")

# --- MODULE 3: DOCS & COMMS ---
add_node("E4", "STAFF / CAPTAIN", col1, 660, w_ent, h_ent, style_entity)
add_node("P7", "7.0<br><hr>Document Repository", col2, 650, w_proc, h_proc, style_process)
add_node("D6", "D6 - Documents", col3, 650, w_ds, h_ds, style_datastore)

add_edge("E4", "P7", "Upload / View Docs")
add_edge("P7", "D6", "Store/Retrieve", bidirectional=True)

add_node("E5", "RESIDENT / STAFF", col1, 780, w_ent, h_ent, style_entity)
add_node("P2", "2.0<br><hr>Announcements", col2, 770, w_proc, h_proc, style_process)
add_node("D2", "D2 - Announcements", col3, 770, w_ds, h_ds, style_datastore)

add_edge("E5", "P2", "Post / View")
add_edge("P2", "D2", "Store/Retrieve", bidirectional=True)

# --- MODULE 4: AI CHATBOT ---
add_node("E6", "ALL USERS", col1, 900, w_ent, h_ent, style_entity)
add_node("P3", "3.0<br><hr>AI Chatbot", col2, 890, w_proc, h_proc, style_process)
add_node("E7", "GOOGLE GEMINI API", col3, 850, w_ent, h_ent, style_entity)
add_node("D3", "D3 - Chatbot Logs", col3, 930, w_ds, h_ds, style_datastore)

add_edge("E6", "P3", "Query / Chat")
add_edge("P3", "E7", "API Request", bidirectional=True)
add_edge("P3", "D3", "Log Query")

final_xml = xml_template.replace("{cells}", cells_str)

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(final_xml)
