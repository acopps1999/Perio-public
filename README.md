# Clinical Chart Tool for Dental Sales Reps

A powerful, visual interface designed to help dental sales representatives recommend the right products based on clinical conditions, dentist type, patient profile, and treatment phase.

![Clinical Chart Tool Screenshot](https://via.placeholder.com/800x450.png?text=Clinical+Chart+Tool)

## Overview

This tool enables sales representatives to:

- Filter conditions by category, DDS type, and patient type
- View detailed product recommendations for each treatment phase
- Access scientific rationale, usage instructions, competitive positioning, and objection handling for each product
- View published research for conditions and products
- Support in-clinic or remote sales conversations with dental professionals

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14.x or higher recommended)
- [npm](https://www.npmjs.com/) (v6.x or higher)

## Installation & Setup

1. Clone this repository
```bash
git clone https://github.com/yourusername/clinical-chart.git
cd clinical-chart
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

## Project Structure

```
/clinical-chart
  /public
    index.html
    favicon.ico
  /src
    /components
      AdminPanel.js         # Admin interface for managing data
      ClinicalChartMockup.js # Main application component
      DataImportExport.js   # Data import/export functionality
      DiagnosisWizard.js    # Guided diagnosis workflow
    conditions_complete.json # Main data source
    index.js                # Application entry point
    index.css               # Global styles
  package.json              # Project dependencies and scripts
  postcss.config.js         # PostCSS configuration
  tailwind.config.js        # Tailwind CSS configuration
  README.md                 # This file
```

## Key Features

### Condition Browser
Browse and filter through various dental conditions categorized by type, dentist specialty, and patient profiles.

### Treatment Phase Navigation
For each condition, navigate through different treatment phases (Prep, Acute, Maintenance) to see phase-specific product recommendations.

### Patient Type Filtering
Filter product recommendations based on patient health status:
- **Type 1**: Healthy
- **Type 2**: Mild inflammation, moderate risk
- **Type 3**: Smoker, diabetic, immunocompromised
- **Type 4**: Periodontal disease, chronic illness, poor healing

### Product Details
Access comprehensive information about each product:
- Usage instructions
- Scientific rationale
- Clinical evidence
- Competitive advantages
- Objection handling strategies

### Research Integration
View published research articles supporting product recommendations and clinical approaches.

### Diagnosis Wizard
Use the guided diagnosis workflow to quickly identify the most appropriate products for specific clinical scenarios.

### Admin Panel
Manage and update the knowledge base with condition details, product information, and published research.

## Conditions Included

### Surgical
- Implant Placement
- Soft Tissue Grafting
- Extractions
- Laser Gingivectomy
- Laser Perio Debridement
- SRP (Scaling and Root Planing)
- 3rd Molar Extraction
- Flap Surgery

### Intra-Oral
- Xerostomia
- Periodontal Disease
- Oral Lichen Planus
- Denture Stomatitis
- Nicotine Stomatitis
- Tongue Disorders (Geographic, Black Hairy)
- Gingivitis
- Dry Mouth from Chemo/Radiation

## Building for Production

```bash
npm run build
```

This creates a production-ready build in the `build` folder that can be deployed to any static hosting service.

## Data Management

The application uses JSON data stored in `conditions_complete.json`. You can export and import this data through the Admin Panel for backup or transfer purposes.

## Future Enhancements

- Embed into HubSpot or CRM
- Add admin backend for non-technical editing
- Additional styling and UI polish
- Mobile app version

## Troubleshooting

If you encounter any issues:

1. Make sure all dependencies are installed:
```bash
npm install
```

2. Clear npm cache:
```bash
npm cache clean --force
```

3. If you experience runtime errors related to undefined variables, check the browser console and verify that all components are properly imported.

## License

Proprietary - All Rights Reserved

## Support

For support, please contact [austin@austincopps.com](mailto:your-email@example.com)