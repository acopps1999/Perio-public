/**
 * Category descriptions utility
 * This provides descriptions for condition/procedure categories
 * Can be extended to load from database or managed through admin panel
 */

// Default category descriptions mapping
const DEFAULT_CATEGORY_DESCRIPTIONS = {
  'Surgical': 'Procedures involving tissue manipulation or surgery',
  'Intra-Oral': 'Conditions affecting the oral soft tissues',
  'Oral Mucosa': 'Conditions affecting the oral soft tissues',
  'Non-Surgical': 'Non-invasive treatments and preventive care',
  'Preventive': 'Preventive care and maintenance procedures',
  'Periodontal': 'Treatments for gum and periodontal conditions',
  'Restorative': 'Procedures to restore dental function and aesthetics',
  'Endodontic': 'Root canal and pulp-related treatments',
  'Orthodontic': 'Teeth alignment and bite correction procedures',
  'Oral Medicine': 'Medical conditions affecting the oral cavity',
  'Emergency': 'Urgent dental care and trauma management',
  'Diagnostic': 'Assessment and evaluation procedures',
  'Cosmetic': 'Aesthetic enhancement procedures',
  'Implant': 'Dental implant procedures and maintenance',
  'Prosthodontic': 'Tooth replacement and restoration procedures'
};

/**
 * Get description for a category
 * @param {string} categoryName - The name of the category
 * @returns {string} - The description for the category
 */
export const getCategoryDescription = (categoryName) => {
  // Handle empty, null, or undefined category names
  if (!categoryName || categoryName.trim() === '') {
    return 'General dental procedures and treatments';
  }
  
  // Return the specific description or a generic fallback
  return DEFAULT_CATEGORY_DESCRIPTIONS[categoryName] || 
         `${categoryName} procedures and treatments`;
};

/**
 * Get all category descriptions
 * @returns {Object} - Object with category names as keys and descriptions as values
 */
export const getAllCategoryDescriptions = () => {
  return { ...DEFAULT_CATEGORY_DESCRIPTIONS };
};

/**
 * Add or update a category description
 * This function could be extended to persist to database
 * @param {string} categoryName - The category name
 * @param {string} description - The description
 */
export const setCategoryDescription = (categoryName, description) => {
  // For now, this would just update the in-memory mapping
  // In the future, this could save to database
  DEFAULT_CATEGORY_DESCRIPTIONS[categoryName] = description;
  console.log(`Category description updated: ${categoryName} = ${description}`);
};

/**
 * Remove a category description
 * @param {string} categoryName - The category name to remove
 */
export const removeCategoryDescription = (categoryName) => {
  delete DEFAULT_CATEGORY_DESCRIPTIONS[categoryName];
  console.log(`Category description removed: ${categoryName}`);
};

/**
 * Get categories with descriptions as array of objects
 * @returns {Array} - Array of {name, description} objects
 */
export const getCategoriesWithDescriptions = () => {
  return Object.entries(DEFAULT_CATEGORY_DESCRIPTIONS).map(([name, description]) => ({
    name,
    description
  }));
}; 