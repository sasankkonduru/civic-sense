# CivicSense

CivicSense is an AI-powered civic issue reporting and municipal management platform that streamlines communication between citizens and local government authorities. Citizens can report civic issues, track their resolution in real time, and receive AI-assisted insights, while municipal officials can efficiently manage, prioritize, and resolve incidents through an operational dashboard.

Developed for the **Vibe2Ship Hackathon**.

---

## Live Demo

**Application:** *Coming Soon*

---

## GitHub Repository

https://github.com/sasankkonduru/civic-sense

---

## Project Documentation

Google Doc: *Add your Google Doc link here*

---

## Problem Statement

Urban civic issues such as potholes, garbage accumulation, water leakage, damaged streetlights, and fallen trees often remain unresolved due to inefficient reporting systems and lack of transparency.

CivicSense addresses this by providing a centralized platform that enables:

- Citizens to easily report civic incidents.
- Municipal officials to manage issues efficiently.
- AI-assisted analysis for better issue understanding.
- Real-time status tracking and communication.

---

# Features

## Citizen Portal

- Secure Google Authentication
- Report civic issues with images
- Interactive location selection using maps
- AI-powered issue analysis
- Personal issue dashboard
- Real-time issue status tracking
- Resolution timeline
- Issue history

---

## Municipal Official Portal

- Municipality-wide operational dashboard
- Live issue monitoring
- Issue prioritization
- Department workload overview
- Interactive incident map
- AI Municipal Brief
- AI-generated operational insights
- Manual issue verification workflow
- Resolution management
- Real-time dashboard synchronization

---

## AI Capabilities

Powered by the **Google Gemini API**

- AI Issue Analysis
- AI-generated issue summaries
- Municipal Brief generation
- Smart recommendations
- Operational insights
- Improved report understanding

---

## Interactive Maps

Built using:

- Leaflet
- OpenStreetMap

Features include:

- Interactive incident visualization
- Issue location mapping
- Live issue markers
- Geographic issue tracking

---

## Demo Support

The platform includes built-in demo templates for showcasing the complete workflow.

Supported templates include:

- Potholes
- Water Leakage
- Garbage Overflow
- Fallen Trees
- Traffic Signal Failure
- Drainage Issues

Municipal officials can also use repair evidence templates to demonstrate the resolution workflow.

---

# Technology Stack

## Frontend

- React
- TypeScript
- Vite
- CSS

## Backend

- Firebase Authentication
- Cloud Firestore

## Artificial Intelligence

- Google Gemini API

## Maps

- Leaflet
- OpenStreetMap

## Development Tools

- Node.js
- npm

---

# Google Technologies Used

- Google Gemini API
- Firebase Authentication
- Cloud Firestore

---

# Application Workflow

## Citizen Workflow

1. Sign in using Google.
2. Report a civic issue.
3. Upload supporting evidence.
4. AI analyzes the issue.
5. Submit the report.
6. Track the issue status in real time.

---

## Municipal Official Workflow

1. View incoming reports.
2. Review issue details.
3. Assign priority.
4. Update issue progress.
5. Upload repair evidence.
6. Verify the repair manually.
7. Close the issue.

---

# Project Structure

```
public/
│
├── demo-images/

src/
│
├── components/
├── hooks/
├── services/
├── types/
├── utils/
│
├── firebase.ts
└── App.tsx
```

---

# Installation

Clone the repository

```bash
git clone https://github.com/sasankkonduru/civic-sense.git
```

Navigate into the project

```bash
cd civic-sense
```

Install dependencies

```bash
npm install
```

Run the development server

```bash
npm run dev
```

Create a production build

```bash
npm run build
```

---

# Environment Variables

Create a `.env` file and configure the required credentials.

```env
VITE_FIREBASE_API_KEY=

VITE_FIREBASE_AUTH_DOMAIN=

VITE_FIREBASE_PROJECT_ID=

VITE_FIREBASE_STORAGE_BUCKET=

VITE_FIREBASE_MESSAGING_SENDER_ID=

VITE_FIREBASE_APP_ID=

GEMINI_API_KEY=
```

---

# Future Enhancements

- Push notifications
- Department-wise task assignment
- Citizen feedback system
- Service Level Agreement (SLA) tracking
- Advanced municipal analytics
- Mobile application
- Offline reporting
- GIS integration

---

# Acknowledgements

Developed as part of the **Vibe2Ship Hackathon**.

Built using:

- React
- Firebase
- Google Gemini API
- Leaflet
- OpenStreetMap

---

# License

This project is developed for educational and hackathon purposes.
