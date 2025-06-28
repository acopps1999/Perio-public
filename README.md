# PRISM Clinical Chart Tool

A comprehensive clinical decision support tool designed for dental sales representatives to recommend products based on specific clinical conditions, patient profiles, and treatment phases.

![PRISM Logo](./public/prism-logo.png)

## 🎯 Overview

PRISM helps dental sales representatives:

- **Browse Conditions**: Filter and explore dental conditions by category and patient type
- **Phase-Based Recommendations**: Get specific product recommendations for Prep, Acute, and Maintenance phases
- **Patient-Specific Guidance**: Tailored recommendations for different patient risk profiles (Type 1-4)
- **Therapeutic Wizard**: Guided workflow to quickly identify optimal product combinations
- **Competitive Intelligence**: Access competitive advantages and positioning data
- **Research Integration**: View supporting clinical research and evidence
- **Admin Management**: Comprehensive backend for managing conditions, products, and data

## 🏗️ Architecture

### Frontend
- **React 18** with functional components and hooks
- **Tailwind CSS** for styling with custom brand colors
- **Radix UI** components for accessible dialogs, tabs, and forms
- **Lucide React** for consistent iconography
- **Responsive Design** optimized for desktop and tablet use

### Backend & Database
- **Supabase** for database, authentication, and API
- **PostgreSQL** with Row Level Security (RLS)
- **Real-time data synchronization**
- **EmailJS** integration for feedback notifications

### Key Features
- **Real-time Data Management** with Supabase integration
- **Built-in Feedback System** with database storage and email notifications  
- **Advanced Admin Panel** with full CRUD operations
- **Import/Export Functionality** for data backup and migration
- **Competitive Advantage Database** with detailed positioning data

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn
- Supabase account and project

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Perio-public
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file with your Supabase credentials:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Database Setup**
Run the provided SQL schema files in your Supabase project:
```bash
# Core schema
supabase_schema.sql

# Feedback system
supabase-feedback-table.sql
```

5. **Start Development Server**
```bash
npm run dev
```

6. **Build for Production**
```bash
npm run build
npm start
```

## 📁 Project Structure

```
/Perio-public
├── public/
│   ├── prism-logo.png          # PRISM brand logo
│   └── index.html              # HTML template
├── src/
│   ├── components/
│   │   ├── AdminPanel/         # Admin interface components
│   │   │   ├── AdminPanelCore.js
│   │   │   ├── AdminPanelConditions.js
│   │   │   ├── AdminPanelProducts.js
│   │   │   ├── AdminPanelCategories.js
│   │   │   ├── AdminPanelModals.js
│   │   │   ├── AdminPanelSupabase.js
│   │   │   └── AdminPanelImportExport.js
│   │   ├── ClinicalChartMockup.js    # Main application
│   │   ├── DiagnosisWizard.js        # Therapeutic wizard
│   │   ├── ConditionDetails.js       # Condition detail view
│   │   ├── ConditionsList.js         # Condition browser
│   │   ├── FiltersSection.js         # Filter controls
│   │   ├── CompetitiveAdvantageModal.js # Competitive data
│   │   ├── ResearchModal.js          # Research articles
│   │   ├── FeedbackWidget.js         # User feedback system
│   │   ├── AdminLoginModal.js        # Admin authentication
│   │   └── DataImportExport.js       # Data management
│   ├── config/
│   │   └── feedbackConfig.js         # Feedback system config
│   ├── contexts/                     # React contexts
│   ├── data/                         # Static data files
│   ├── supabaseClient.js            # Supabase configuration
│   ├── conditions_complete.json     # Legacy data file
│   ├── index.js                     # Application entry
│   └── index.css                    # Global styles
├── supabase_schema.sql              # Database schema
├── supabase-feedback-table.sql     # Feedback table schema
└── package.json                     # Dependencies & scripts
```

## 🎯 Core Features

### 1. Condition Browser
- **Category Filtering**: Browse by surgical and intra-oral conditions
- **Patient Type Filtering**: Filter by patient risk profiles (Type 1-4)
- **Search & Navigation**: Quick access to specific conditions
- **Responsive Grid Layout**: Optimal viewing across devices

### 2. Phase-Based Treatment Planning
- **Prep Phase**: Pre-treatment preparation recommendations
- **Acute Phase**: Active treatment protocol guidance  
- **Maintenance Phase**: Long-term care and follow-up

### 3. Patient Risk Profiles
- **Type 1**: Healthy patients, standard protocols
- **Type 2**: Mild inflammation, moderate risk factors
- **Type 3**: High-risk patients (smokers, diabetics, immunocompromised)
- **Type 4**: Severe periodontal disease, chronic conditions

### 4. Therapeutic Wizard
- **Guided Workflow**: Step-by-step condition assessment
- **Smart Recommendations**: AI-driven product selection
- **Patient Profiling**: Risk assessment and categorization
- **Phase Selection**: Treatment timeline planning
- **Product Configuration**: Customized treatment protocols

### 5. Competitive Intelligence
- **Competitor Analysis**: Side-by-side product comparisons
- **Active Ingredient Database**: Detailed formulation advantages
- **Positioning Strategies**: Key differentiators and selling points
- **Objection Handling**: Pre-loaded responses to common concerns

### 6. Research Integration
- **Clinical Evidence**: Peer-reviewed studies and abstracts
- **Product Research**: Supporting data for each recommendation
- **Condition-Specific Studies**: Targeted clinical evidence
- **External Links**: Direct access to full publications

### 7. Admin Management System
- **Full CRUD Operations**: Create, read, update, delete all data
- **Categories Management**: Organize conditions and products
- **Product Database**: Comprehensive product information
- **Research Library**: Manage clinical studies and evidence
- **Import/Export**: Data backup and migration tools
- **User Management**: Admin authentication and access control

### 8. Feedback System
- **Built-in Widget**: Floating feedback button for user input
- **Multiple Types**: Bug reports, feature requests, general questions
- **Context Capture**: Automatic location and technical details
- **Database Storage**: Persistent feedback tracking in Supabase
- **Email Notifications**: Instant alerts via EmailJS integration
- **Admin Dashboard**: Review and manage user feedback

## 🛠️ Technology Stack

### Frontend Dependencies
```json
{
  "@radix-ui/react-dialog": "^1.0.4",
  "@radix-ui/react-select": "^1.0.4", 
  "@radix-ui/react-tabs": "^1.0.4",
  "clsx": "^1.2.1",
  "lucide-react": "^0.257.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^7.6.2",
  "tailwindcss": "^3.3.2"
}
```

### Backend & Infrastructure
```json
{
  "@supabase/supabase-js": "^2.49.4",
  "dotenv": "^16.5.0"
}
```

### Database Schema
- **procedures**: Clinical conditions and treatments
- **products**: Product catalog and specifications  
- **categories**: Condition categorization
- **patient_types**: Risk profile definitions
- **phases**: Treatment phase definitions
- **competitive_advantage_competitors**: Competitive positioning
- **competitive_advantage_active_ingredients**: Formulation advantages
- **research_articles**: Clinical evidence library
- **feedback**: User feedback and support requests
- **admins**: Administrative user management

## ⚙️ Configuration

### 1. Supabase Setup
Update `src/supabaseClient.js` with your project credentials:
```javascript
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
```

### 2. Feedback System Configuration
Edit `src/config/feedbackConfig.js`:
```javascript
export const feedbackConfig = {
  emailjs: {
    serviceId: 'your_service_id',
    templateId: 'your_template_id', 
    publicKey: 'your_public_key'
  },
  notificationEmail: 'your-email@domain.com'
}
```

### 3. Admin Authentication
Default admin credentials are managed through Supabase Auth. Update the admin table with authorized user emails.

## 🚢 Deployment

### Development
```bash
npm run dev      # Start development server on port 3000
```

### Production Build
```bash
npm run build    # Create optimized production build
npm start        # Serve production build (port 10000)
```

### Environment Variables
```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=10000  # Optional: Override default port
NODE_OPTIONS=--max_old_space_size=4096  # For large builds
```

## 📊 Current Data

The application includes comprehensive data for:

### Surgical Procedures
- Implant Placement
- Soft Tissue Grafting
- Extractions
- Laser Gingivectomy
- Laser Perio Debridement
- Scaling and Root Planing (SRP)
- Third Molar Extraction
- Flap Surgery

### Intra-Oral Conditions  
- Xerostomia
- Periodontal Disease
- Oral Lichen Planus
- Denture Stomatitis
- Nicotine Stomatitis
- Geographic Tongue
- Black Hairy Tongue
- Gingivitis
- Chemotherapy/Radiation-Induced Dry Mouth
- Stomatitis

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run test` - Run test suite
- `npm start` - Serve production build

### Code Standards
- ES6+ JavaScript with React Hooks
- Functional components over class components
- Tailwind CSS for styling
- Responsive design principles
- Accessibility best practices

### Database Migrations
When updating the database schema:
1. Update the SQL files in the project root
2. Run migrations in your Supabase dashboard
3. Test thoroughly in development before production deployment

## 🐛 Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Supabase Connection Issues**
- Verify environment variables are set correctly
- Check Supabase project URL and API keys
- Ensure Row Level Security policies are configured

**Feedback System Not Working**
- Verify EmailJS configuration in `feedbackConfig.js`
- Check browser console for CORS or API errors
- Confirm Supabase feedback table exists and has proper RLS policies

**Performance Issues**
- Use `npm run build` for production deployment
- Monitor Supabase usage and upgrade plan if needed
- Optimize image assets and lazy load components

## 📞 Support

For technical support or questions:
- Email: coppsaustin@gmail.com
- Use the built-in feedback widget for bug reports and feature requests

## 📄 License

Proprietary - All Rights Reserved

---

*Built with ❤️ for dental sales professionals*