import re

mermaid_content = """# System Level 1 Data Flow Diagram (DFD)

This diagram has been optimized to eliminate crossing lines. In standard DFD practice, external entities (like STAFF and CAPTAIN) are visually duplicated to keep the data flows clean and readable.

```mermaid
flowchart LR
    %% Define Styling
    classDef entity fill:#2d3748,stroke:#1a202c,stroke-width:2px,color:#fff,font-weight:bold
    classDef process fill:#ebf8ff,stroke:#3182ce,stroke-width:2px,color:#2b6cb0,font-weight:bold,shape:circle
    classDef datastore fill:#fdf6e3,stroke:#d69e2e,stroke-width:2px,color:#744210

    subgraph "Module 1: Authentication & Administration"
        direction LR
        ADMIN([ADMIN]):::entity -->|Manage Roles / Read Logs| P8((8.0 Admin Hub)):::process
        STAFF1([STAFF]):::entity -->|Login| P1((1.0 User Auth)):::process
        CAPT1([CAPTAIN]):::entity -->|Login| P1
        
        P1 <-->|Verify Credentials| D1[(D1 User Accounts)]:::datastore
        P8 -->|Update Roles| D1
        P8 -->|Read Logs| D7[(D7 Audit Logs)]:::datastore
    end

    subgraph "Module 2: Demographics & Geo-Mapping"
        direction LR
        STAFF2([STAFF]):::entity -->|Data Entry| P5((5.0 Resident Directory)):::process
        STAFF2 -->|Map Edits| P6((6.0 Geo-Mapping)):::process
        STAFF2 -->|Generate| P4((4.0 Reports)):::process
        
        CAPT2([CAPTAIN]):::entity -->|View Directory| P5
        CAPT2 -->|View Map| P6
        CAPT2 -->|Export| P4

        P5 <-->|Store/Retrieve| D5[(D5 Resident Registry)]:::datastore
        P5 <-->|Store/Retrieve| D4[(D4 Households)]:::datastore
        
        P6 <-->|Map Points| D5
        P6 <-->|Coordinates| D4
        
        D5 -->|Aggregated Data| P4
        D4 -->|Distribution Data| P4
    end

    subgraph "Module 3: Communications & Documents"
        direction LR
        STAFF3([STAFF]):::entity -->|Upload| P7((7.0 Document Repository)):::process
        CAPT3([CAPTAIN]):::entity -->|View Docs| P7
        P7 <-->|Store/Retrieve| D6[(D6 Documents)]:::datastore
        
        STAFF3 -->|Post| P2((2.0 Announcements)):::process
        RES1([RESIDENT]):::entity -->|View| P2
        P2 <-->|Store/Retrieve| D2[(D2 Announcements)]:::datastore
    end

    subgraph "Module 4: AI Assistant"
        direction LR
        USERS([ALL USERS]):::entity -->|Query| P3((3.0 AI Chatbot)):::process
        P3 <-->|API Request| API([GOOGLE GEMINI API]):::entity
        P3 -->|Log Query| D3[(D3 Chatbot Logs)]:::datastore
    end

    %% Audit Logging connections (Invisible links to align, dashed lines for logs)
    P5 -.->|System Actions| D7
    P6 -.->|System Actions| D7
    P7 -.->|System Actions| D7
```

### Why does it look like this?
In standard DFD design, whenever a single entity (like **STAFF**) interacts with almost every process, it creates a "spaghetti" web of crossing lines. The correct standard practice is to visually duplicate the entity near the processes it interacts with. 

I have organized the diagram into **4 isolated modules** which completely eliminates crossing lines and makes the system's architecture extremely clean and easy to read.
"""

with open(r'C:\Users\David\.gemini\antigravity\brain\f3c05154-c485-44ef-a038-b92aef49aa6b\level_1_dfd.md', 'w', encoding='utf-8') as f:
    f.write(mermaid_content)
