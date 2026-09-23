import re

with open(r'C:\Users\David\.gemini\antigravity\brain\f3c05154-c485-44ef-a038-b92aef49aa6b\level_1_dfd.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Process Definitions
content = content.replace("P5((5.0 Census & Geo-Mapping)):::process", "P5((5.0 Resident Directory)):::process\n    P6((6.0 Geo-Mapping)):::process")
content = content.replace("P6((6.0 Document Repository)):::process", "P7((7.0 Document Repository)):::process")
content = content.replace("P7((7.0 Admin Hub)):::process", "P8((8.0 Admin Hub)):::process")

# Replace Admin Hub Flows
content = content.replace("ADMIN -->|Manage Roles / Read Logs| P7", "ADMIN -->|Manage Roles / Read Logs| P8")
content = content.replace("P7 -->|Update Roles| D1", "P8 -->|Update Roles| D1")
content = content.replace("P7 -->|Read Logs| D7", "P8 -->|Read Logs| D7")
content = content.replace("P7 -->|Audit Data| ADMIN", "P8 -->|Audit Data| ADMIN")

# Replace Document Repository Flows
content = content.replace("STAFF -->|Upload Document| P6", "STAFF -->|Upload Document| P7")
content = content.replace("P6 <-->|Store / Retrieve Docs| D6", "P7 <-->|Store / Retrieve Docs| D6")
content = content.replace("P6 -->|Selected Document| STAFF", "P7 -->|Selected Document| STAFF")
content = content.replace("CAPTAIN -->|View Read-Only Documents| P6", "CAPTAIN -->|View Read-Only Documents| P7")
content = content.replace("P6 -.->|System Actions| D7", "P7 -.->|System Actions| D7")

# Replace Census & Geo-Mapping Flows with split flows
old_census_flow = """    %% Flows - Census & Geo-Mapping
    STAFF -->|New Entry / Demographics Update| P5
    P5 <-->|Store / Retrieve Residents| D5
    P5 <-->|Store / Retrieve Locations| D4
    P5 -->|Mapped Interface| STAFF
    CAPTAIN -->|View Read-Only Demographics| P5"""

new_census_flow = """    %% Flows - Resident Directory
    STAFF -->|New Entry / Demographics Update| P5
    P5 <-->|Store / Retrieve Residents| D5
    P5 <-->|Store / Retrieve Households| D4
    CAPTAIN -->|View Read-Only Directory| P5

    %% Flows - Geo-Mapping
    STAFF -->|Update Map Coordinates| P6
    P6 <-->|Retrieve Map Data| D5
    P6 <-->|Store / Retrieve Locations| D4
    P6 -->|Mapped Interface| STAFF
    CAPTAIN -->|View Map| P6"""

content = content.replace(old_census_flow, new_census_flow)

# Update audit log note
content = content.replace("P5 -.->|System Actions| D7\n", "P5 -.->|System Actions| D7\n    P6 -.->|System Actions| D7\n")

with open(r'C:\Users\David\.gemini\antigravity\brain\f3c05154-c485-44ef-a038-b92aef49aa6b\level_1_dfd.md', 'w', encoding='utf-8') as f:
    f.write(content)
