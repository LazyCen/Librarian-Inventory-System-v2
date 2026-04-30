# Librarian Inventory System

A modern, premium inventory management system designed for educational institutions to manage library collections efficiently.

**Live Link:** [https://lazycen.github.io/Librarian-Inventory-System-v2/](https://lazycen.github.io/Librarian-Inventory-System-v2/)

## Overview

Librarian Inventory System is a sophisticated web application built with a focus on minimalism, speed, and security. It provides a dual-role interface for Faculty (Administrators) and Students, enabling seamless book cataloging, access management, and secure digital reading.

## Key Features

### Clean Aesthetic
- **Clean**: A refined, icon-free navigation and card system for a focused user experience.
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop displays.
- **Dynamic Context**: The dashboard automatically adapts to "Home" on mobile devices for better clarity.

### Container Management
- **Organized Storage**: Categorize books into different "Containers" such as *Books*, *Added*, *Borrowed*, and *Returned*.
- **Real-time Status**: Track the exact location and status of every title in the collection.

### Role-Based Access Control (RBAC)
- **Faculty Access**: Full control over the catalog, including adding, updating, and deleting books, as well as approving/rejecting access requests.
- **Student Access**: Search the catalog, request access to restricted materials, and maintain a personal reading history.

### Secure PDF Reader
- **Integrated Reading**: View digital books directly within the browser using a high-performance PDF engine.
- **Security Features**: Anti-copy measures, session timeouts, and dynamic watermarking to protect intellectual property.
- **Progress Tracking**: Automatic bookmarking and page tracking.

### Analytics & Reports
- **Visual Insights**: Interactive charts showing category distributions and collection growth.
- **Summary Reports**: Generate and export inventory reports in JSON format.

## Technology Stack

- **Core**: HTML5, Vanilla JavaScript (ES6+)
- **Styling**: Premium CSS3 with Backdrop Filters
- **Animations**: [GSAP](https://greensock.com/gsap/) (GreenSock Animation Platform)
- **Digital Documents**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **Data Persistence**: Browser LocalStorage (No backend required for basic deployment)

## Project Structure

- `index.html`: The main entry point and UI structure.
- `src/js/main.js`: Core application logic and view management.
- `src/js/utils/`: Modular helper functions (Auth, Storage, Animations).
- `frontend/faculty/`: Faculty-specific styles and scripts.
- `frontend/student/`: Student-specific styles and scripts.
